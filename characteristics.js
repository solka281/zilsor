const db = require('./database_simple');

// Типы характеристик
const CHARACTERISTIC_TYPES = {
  hp: {
    name: 'Здоровье',
    icon: '❤️',
    base_cost: 80,
    cost_multiplier: 1.18,
    base_bonus: 10,
    level_multiplier: 2
  },
  attack: {
    name: 'Урон',
    icon: '⚔️',
    base_cost: 100,
    cost_multiplier: 1.20,
    base_bonus: 6,
    level_multiplier: 1
  },
  defense: {
    name: 'Защита',
    icon: '🛡️',
    base_cost: 120,
    cost_multiplier: 1.22,
    base_bonus: 2,
    level_multiplier: 0.5
  }
};

// Инициализация системы характеристик
function initializeCharacteristics() {
  console.log('Инициализация системы характеристик...');
  
  // Создаем таблицу характеристик игроков
  db.run(`CREATE TABLE IF NOT EXISTS player_characteristics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    characteristic_type TEXT NOT NULL,
    level INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_id, characteristic_type),
    FOREIGN KEY (player_id) REFERENCES players(user_id)
  )`, (err) => {
    if (err) {
      console.error('Ошибка создания таблицы player_characteristics:', err);
    } else {
      console.log('✅ Таблица player_characteristics создана');
    }
  });
}

// Получить характеристики игрока
function getPlayerCharacteristics(playerId, callback) {
  db.all(`SELECT * FROM player_characteristics WHERE player_id = ?`, [playerId], (err, characteristics) => {
    if (err) return callback(err);
    
    // Создаем объект с характеристиками
    const result = {};
    
    // Инициализируем все типы характеристик
    Object.keys(CHARACTERISTIC_TYPES).forEach(type => {
      result[type] = {
        type: type,
        level: 0,
        ...CHARACTERISTIC_TYPES[type]
      };
    });
    
    // Заполняем данными из базы
    characteristics.forEach(char => {
      if (result[char.characteristic_type]) {
        result[char.characteristic_type].level = char.level;
      }
    });
    
    // Рассчитываем стоимость следующего уровня и бонус
    Object.keys(result).forEach(type => {
      const char = result[type];
      char.next_cost = calculateUpgradeCost(char.base_cost, char.cost_multiplier, char.level);
      char.current_bonus = calculateBonus(char.base_bonus, char.level_multiplier, char.level);
      
      // Прирост за следующее улучшение: base_bonus + (next_level * level_multiplier)
      const nextLevel = char.level + 1;
      char.next_upgrade_bonus = char.base_bonus + (nextLevel * char.level_multiplier);
      char.next_bonus = calculateBonus(char.base_bonus, char.level_multiplier, nextLevel);
    });
    
    callback(null, result);
  });
}

// Рассчитать стоимость улучшения
function calculateUpgradeCost(baseCost, multiplier, currentLevel) {
  return Math.floor(baseCost * Math.pow(multiplier, currentLevel));
}

// Рассчитать бонус от уровня (суммарный прирост от всех улучшений)
function calculateBonus(baseBonus, levelMultiplier, level) {
  // Для HP: каждое улучшение дает 10 + (номер_улучшения * 2) HP
  // 1-е улучшение: 10 + (1 * 2) = 12 HP
  // 2-е улучшение: 10 + (2 * 2) = 14 HP  
  // 3-е улучшение: 10 + (3 * 2) = 16 HP
  // Суммарно за 3 улучшения: 12 + 14 + 16 = 42 HP
  
  let totalBonus = 0;
  for (let i = 1; i <= level; i++) {
    totalBonus += baseBonus + (i * levelMultiplier);
  }
  return totalBonus;
}

// Улучшить характеристику
function upgradeCharacteristic(playerId, characteristicType, callback) {
  console.log(`🔧 [DEBUG] upgradeCharacteristic вызвана: playerId=${playerId}, type=${characteristicType}`);
  
  // Проверяем валидность типа характеристики
  if (!CHARACTERISTIC_TYPES[characteristicType]) {
    console.log(`❌ [DEBUG] Неизвестный тип характеристики: ${characteristicType}`);
    return callback(new Error('Неизвестный тип характеристики'));
  }
  
  // Получаем информацию об игроке
  db.get(`SELECT gold FROM players WHERE user_id = ?`, [playerId], (err, player) => {
    if (err || !player) {
      console.log(`❌ [DEBUG] Игрок не найден: ${playerId}, err:`, err);
      return callback(new Error('Игрок не найден'));
    }
    
    console.log(`💰 [DEBUG] Золото игрока: ${player.gold}`);
    
    // Получаем текущий уровень характеристики
    db.get(`SELECT level FROM player_characteristics WHERE player_id = ? AND characteristic_type = ?`,
      [playerId, characteristicType], (err, characteristic) => {
        const currentLevel = characteristic ? characteristic.level : 0;
        const charType = CHARACTERISTIC_TYPES[characteristicType];
        
        console.log(`📊 [DEBUG] Текущий уровень ${characteristicType}: ${currentLevel}`);
        
        // Рассчитываем стоимость улучшения
        const upgradeCost = calculateUpgradeCost(charType.base_cost, charType.cost_multiplier, currentLevel);
        console.log(`💸 [DEBUG] Стоимость улучшения: ${upgradeCost}`);
        
        // Проверяем достаточно ли золота
        if (player.gold < upgradeCost) {
          console.log(`❌ [DEBUG] Недостаточно золота: нужно ${upgradeCost}, есть ${player.gold}`);
          return callback(new Error(`Недостаточно золота. Нужно: ${upgradeCost}, есть: ${player.gold}`));
        }
        
        // Списываем золото
        db.run(`UPDATE players SET gold = gold - ? WHERE user_id = ?`, [upgradeCost, playerId], (err) => {
          if (err) {
            console.log(`❌ [DEBUG] Ошибка списания золота:`, err);
            return callback(err);
          }
          
          console.log(`✅ [DEBUG] Золото списано: -${upgradeCost}`);
          
          // Обновляем или создаем запись характеристики
          const newLevel = currentLevel + 1;
          db.run(`INSERT OR REPLACE INTO player_characteristics 
                  (player_id, characteristic_type, level, updated_at) 
                  VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
            [playerId, characteristicType, newLevel], (err) => {
              if (err) {
                console.log(`❌ [DEBUG] Ошибка обновления характеристики:`, err);
                return callback(err);
              }
              
              const newBonus = calculateBonus(charType.base_bonus, charType.level_multiplier, newLevel);
              const currentUpgradeBonus = charType.base_bonus + (newLevel * charType.level_multiplier);
              
              console.log(`✅ [DEBUG] Характеристика обновлена:`);
              console.log(`   Тип: ${characteristicType}`);
              console.log(`   Старый уровень: ${currentLevel}`);
              console.log(`   Новый уровень: ${newLevel}`);
              console.log(`   Прирост за это улучшение: ${charType.base_bonus} + ${newLevel} * ${charType.level_multiplier} = ${currentUpgradeBonus}`);
              console.log(`   Общий бонус: ${newBonus}`);
              
              console.log(`✅ Игрок ${playerId} улучшил ${characteristicType} до уровня ${newLevel} (+${currentUpgradeBonus} за это улучшение)`);
              
              callback(null, {
                type: characteristicType,
                name: charType.name,
                icon: charType.icon,
                old_level: currentLevel,
                new_level: newLevel,
                cost: upgradeCost,
                bonus: currentUpgradeBonus, // Показываем прирост за это улучшение
                total_bonus: newBonus // Общий бонус
              });
            });
        });
      });
  });
}

// Получить общие бонусы от характеристик для расчета силы
function getCharacteristicBonuses(playerId, callback) {
  getPlayerCharacteristics(playerId, (err, characteristics) => {
    if (err) return callback(err);
    
    const bonuses = {
      hp: 0,
      attack: 0,
      defense: 0
    };
    
    Object.keys(characteristics).forEach(type => {
      const char = characteristics[type];
      bonuses[type] = char.current_bonus;
    });
    
    callback(null, bonuses);
  });
}

module.exports = {
  CHARACTERISTIC_TYPES,
  initializeCharacteristics,
  getPlayerCharacteristics,
  upgradeCharacteristic,
  getCharacteristicBonuses,
  calculateUpgradeCost,
  calculateBonus
};