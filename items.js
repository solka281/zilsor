const db = require('./database_simple');
const config = require('./config');

// Слоты экипировки
const EQUIPMENT_SLOTS = {
  HELMET: 'helmet',
  CHEST: 'chest',
  LEGS: 'legs',
  BOOTS: 'boots',
  WEAPON: 'weapon',
  SHIELD: 'shield',
  ARTIFACT_1: 'artifact_1',
  ARTIFACT_2: 'artifact_2',
  ACCESSORY: 'accessory'
};

// Базовые предметы с новой системой слотов
const BASE_ITEMS = [
  // ШЛЕМЫ
  { name: 'Кожаный шлем', description: 'Легкая защита головы', rarity: 'COMMON', slot: 'helmet', power_bonus: 5, hp_bonus: 10, attack_bonus: 0, defense_bonus: 3, special_effect: null },
  { name: 'Стальной шлем', description: 'Прочный шлем', rarity: 'RARE', slot: 'helmet', power_bonus: 15, hp_bonus: 25, attack_bonus: 0, defense_bonus: 10, special_effect: null },
  { name: 'Драконий шлем', description: 'Шлем из чешуи дракона', rarity: 'EPIC', slot: 'helmet', power_bonus: 40, hp_bonus: 60, attack_bonus: 5, defense_bonus: 25, special_effect: 'fire_resist_20' },
  { name: 'Корона Титана', description: 'Легендарный головной убор', rarity: 'LEGENDARY', slot: 'helmet', power_bonus: 100, hp_bonus: 150, attack_bonus: 20, defense_bonus: 50, special_effect: 'immunity_stun' },
  
  // НАГРУДНИКИ
  { name: 'Кожаная броня', description: 'Легкая защита тела', rarity: 'COMMON', slot: 'chest', power_bonus: 8, hp_bonus: 20, attack_bonus: 0, defense_bonus: 5, special_effect: null },
  { name: 'Кольчуга', description: 'Прочная броня', rarity: 'RARE', slot: 'chest', power_bonus: 20, hp_bonus: 50, attack_bonus: 0, defense_bonus: 15, special_effect: null },
  { name: 'Драконья чешуя', description: 'Броня из чешуи дракона', rarity: 'EPIC', slot: 'chest', power_bonus: 50, hp_bonus: 100, attack_bonus: 0, defense_bonus: 40, special_effect: 'fire_resist_30' },
  { name: 'Броня теней', description: 'Мистическая защита', rarity: 'MYTHIC', slot: 'chest', power_bonus: 90, hp_bonus: 180, attack_bonus: 0, defense_bonus: 70, special_effect: 'stealth_10' },
  { name: 'Доспехи Бога', description: 'Божественная защита', rarity: 'LEGENDARY', slot: 'chest', power_bonus: 150, hp_bonus: 300, attack_bonus: 0, defense_bonus: 100, special_effect: 'damage_reflect_30' },
  
  // ПОНОЖИ
  { name: 'Кожаные штаны', description: 'Легкая защита ног', rarity: 'COMMON', slot: 'legs', power_bonus: 5, hp_bonus: 15, attack_bonus: 0, defense_bonus: 3, special_effect: null },
  { name: 'Стальные поножи', description: 'Прочная защита', rarity: 'RARE', slot: 'legs', power_bonus: 15, hp_bonus: 35, attack_bonus: 0, defense_bonus: 12, special_effect: null },
  { name: 'Титановые поножи', description: 'Непробиваемая защита', rarity: 'EPIC', slot: 'legs', power_bonus: 35, hp_bonus: 70, attack_bonus: 0, defense_bonus: 30, special_effect: 'speed_boost_10' },
  { name: 'Поножи дракона', description: 'Мистическая защита', rarity: 'MYTHIC', slot: 'legs', power_bonus: 65, hp_bonus: 120, attack_bonus: 10, defense_bonus: 45, special_effect: 'fire_immunity' },
  
  // САПОГИ
  { name: 'Кожаные сапоги', description: 'Легкая обувь', rarity: 'COMMON', slot: 'boots', power_bonus: 3, hp_bonus: 10, attack_bonus: 2, defense_bonus: 2, special_effect: null },
  { name: 'Сапоги скорости', description: 'Увеличивают скорость', rarity: 'RARE', slot: 'boots', power_bonus: 12, hp_bonus: 20, attack_bonus: 8, defense_bonus: 5, special_effect: 'speed_boost_15' },
  { name: 'Сапоги теней', description: 'Дают уклонение', rarity: 'EPIC', slot: 'boots', power_bonus: 30, hp_bonus: 40, attack_bonus: 15, defense_bonus: 10, special_effect: 'dodge_20' },
  
  // ОРУЖИЕ
  { name: 'Деревянный меч', description: 'Простое оружие', rarity: 'COMMON', slot: 'weapon', power_bonus: 10, hp_bonus: 0, attack_bonus: 8, defense_bonus: 0, special_effect: null },
  { name: 'Стальной меч', description: 'Качественное оружие', rarity: 'RARE', slot: 'weapon', power_bonus: 25, hp_bonus: 0, attack_bonus: 20, defense_bonus: 0, special_effect: null },
  { name: 'Пламенный клинок', description: 'Меч объятый огнем', rarity: 'EPIC', slot: 'weapon', power_bonus: 60, hp_bonus: 0, attack_bonus: 50, defense_bonus: 0, special_effect: 'fire_damage_25' },
  { name: 'Клинок теней', description: 'Мистическое оружие', rarity: 'MYTHIC', slot: 'weapon', power_bonus: 120, hp_bonus: 0, attack_bonus: 90, defense_bonus: 10, special_effect: 'shadow_strike' },
  { name: 'Экскалибур', description: 'Легендарный меч', rarity: 'LEGENDARY', slot: 'weapon', power_bonus: 200, hp_bonus: 0, attack_bonus: 150, defense_bonus: 30, special_effect: 'holy_damage_50' },
  
  // ЩИТЫ
  { name: 'Деревянный щит', description: 'Простая защита', rarity: 'COMMON', slot: 'shield', power_bonus: 5, hp_bonus: 15, attack_bonus: 0, defense_bonus: 8, special_effect: null },
  { name: 'Стальной щит', description: 'Прочный щит', rarity: 'RARE', slot: 'shield', power_bonus: 15, hp_bonus: 40, attack_bonus: 0, defense_bonus: 20, special_effect: null },
  { name: 'Эгида', description: 'Щит богов', rarity: 'LEGENDARY', slot: 'shield', power_bonus: 150, hp_bonus: 250, attack_bonus: 0, defense_bonus: 120, special_effect: 'block_50' },
  
  // АРТЕФАКТЫ (Слот 1)
  { name: 'Кольцо силы', description: 'Увеличивает мощь', rarity: 'RARE', slot: 'artifact_1', power_bonus: 30, hp_bonus: 0, attack_bonus: 15, defense_bonus: 5, special_effect: null },
  { name: 'Амулет огня', description: 'Дает силу огня', rarity: 'EPIC', slot: 'artifact_1', power_bonus: 50, hp_bonus: 30, attack_bonus: 25, defense_bonus: 10, special_effect: 'fire_element' },
  { name: 'Амулет льда', description: 'Дает силу льда', rarity: 'EPIC', slot: 'artifact_1', power_bonus: 50, hp_bonus: 30, attack_bonus: 25, defense_bonus: 10, special_effect: 'ice_element' },
  { name: 'Амулет молний', description: 'Дает силу молний', rarity: 'EPIC', slot: 'artifact_1', power_bonus: 50, hp_bonus: 30, attack_bonus: 30, defense_bonus: 5, special_effect: 'lightning_element' },
  { name: 'Амулет тьмы', description: 'Дает силу тьмы', rarity: 'MYTHIC', slot: 'artifact_1', power_bonus: 80, hp_bonus: 50, attack_bonus: 40, defense_bonus: 20, special_effect: 'dark_element' },
  { name: 'Око Вечности', description: 'Артефакт первородных', rarity: 'SECRET', slot: 'artifact_1', power_bonus: 300, hp_bonus: 200, attack_bonus: 150, defense_bonus: 100, special_effect: 'all_elements' },
  
  // АРТЕФАКТЫ (Слот 2) - Руны
  { name: 'Руна силы', description: 'Древняя руна воина', rarity: 'RARE', slot: 'artifact_2', power_bonus: 35, hp_bonus: 0, attack_bonus: 20, defense_bonus: 0, special_effect: null },
  { name: 'Руна жизни', description: 'Руна восстановления', rarity: 'RARE', slot: 'artifact_2', power_bonus: 30, hp_bonus: 50, attack_bonus: 0, defense_bonus: 10, special_effect: 'regen_5' },
  { name: 'Руна скорости', description: 'Руна быстроты', rarity: 'EPIC', slot: 'artifact_2', power_bonus: 45, hp_bonus: 20, attack_bonus: 15, defense_bonus: 5, special_effect: 'speed_boost_25' },
  { name: 'Руна берсерка', description: 'Руна ярости', rarity: 'EPIC', slot: 'artifact_2', power_bonus: 60, hp_bonus: 0, attack_bonus: 40, defense_bonus: -5, special_effect: 'berserk_mode' },
  { name: 'Руна защиты', description: 'Руна стойкости', rarity: 'EPIC', slot: 'artifact_2', power_bonus: 50, hp_bonus: 40, attack_bonus: 0, defense_bonus: 30, special_effect: 'damage_reduction_15' },
  { name: 'Руна мастера', description: 'Руна опытного воина', rarity: 'MYTHIC', slot: 'artifact_2', power_bonus: 70, hp_bonus: 30, attack_bonus: 25, defense_bonus: 20, special_effect: 'exp_boost_30' },
  { name: 'Руна бессмертия', description: 'Легендарная руна вечности', rarity: 'SECRET', slot: 'artifact_2', power_bonus: 250, hp_bonus: 300, attack_bonus: 100, defense_bonus: 150, special_effect: 'immortal_chance_5' },
  
  // АКСЕССУАРЫ
  { name: 'Зелье здоровья', description: 'Восстанавливает HP', rarity: 'COMMON', slot: 'accessory', power_bonus: 0, hp_bonus: 50, attack_bonus: 0, defense_bonus: 0, special_effect: 'heal_50' },
  { name: 'Зелье силы', description: 'Увеличивает атаку', rarity: 'RARE', slot: 'accessory', power_bonus: 20, hp_bonus: 0, attack_bonus: 25, defense_bonus: 0, special_effect: 'attack_boost_20' },
  { name: 'Амулет мудрости', description: 'Увеличивает опыт', rarity: 'EPIC', slot: 'accessory', power_bonus: 40, hp_bonus: 30, attack_bonus: 15, defense_bonus: 15, special_effect: 'exp_boost_25' }
];

// Инициализация предметов
function initializeItems() {
  // Добавляем базовые предметы
  BASE_ITEMS.forEach(item => {
    db.run(`INSERT OR IGNORE INTO items 
      (name, description, rarity, slot, power_bonus, hp_bonus, attack_bonus, defense_bonus, special_effect) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [item.name, item.description, item.rarity, item.slot, item.power_bonus, 
       item.hp_bonus, item.attack_bonus, item.defense_bonus, item.special_effect]);
  });
  
  console.log('Предметы инициализированы');
}

// Получить случайный предмет
function getRandomItem(callback) {
  const rand = Math.random() * 100;
  let selectedRarity = 'COMMON';
  
  let cumulative = 0;
  for (const [rarity, data] of Object.entries(config.RARITY)) {
    cumulative += data.chance;
    if (rand <= cumulative) {
      selectedRarity = rarity;
      break;
    }
  }
  
  db.get(`SELECT * FROM items WHERE rarity = ? ORDER BY RANDOM() LIMIT 1`, 
    [selectedRarity], callback);
}

// Добавить предмет в инвентарь
function addItemToInventory(playerId, itemId, callback) {
  // Добавляем предмет в инвентарь
  db.run(`INSERT INTO inventory (player_id, item_id) VALUES (?, ?)`,
    [playerId, itemId], (err) => {
      if (err) return callback(err);
      
      // Получаем ID добавленного предмета в инвентаре
      const inventoryId = this.lastID;
      
      // Проверяем автопродажу
      const autoSell = require('./auto_sell');
      autoSell.checkAutoSell(playerId, inventoryId, (err, result) => {
        if (err) {
          console.error('Ошибка проверки автопродажи:', err);
          return callback(null, { inventoryId, autoSold: false });
        }
        
        if (result.sold) {
          console.log(`🤖 Автопродажа: ${result.item_name} (${result.rarity}) за ${result.price}💰`);
          return callback(null, { inventoryId, autoSold: true, soldItem: result });
        }
        
        callback(null, { inventoryId, autoSold: false });
      });
    });
}

// Экипировать предмет
function equipItem(playerId, inventoryId, callback) {
  // Сначала получаем информацию о предмете
  db.get(`SELECT inv.*, i.slot FROM inventory inv
          JOIN items i ON inv.item_id = i.id
          WHERE inv.id = ? AND inv.player_id = ?`, 
    [inventoryId, playerId], (err, item) => {
      if (err || !item) return callback(err || new Error('Предмет не найден'));
      
      const slot = item.slot;
      
      // Простая логика: снимаем предмет из того же слота и экипируем новый
      db.run(`UPDATE inventory SET equipped = 0 
              WHERE player_id = ? AND equipped = 1 AND item_id IN (
                SELECT id FROM items WHERE slot = ?
              )`,
        [playerId, slot], (err) => {
          if (err) {
            console.error('Ошибка снятия предмета:', err);
            return callback(err);
          }
          
          // Экипируем новый предмет
          db.run(`UPDATE inventory SET equipped = 1 WHERE id = ?`,
            [inventoryId], (err) => {
              if (err) {
                console.error('Ошибка экипировки предмета:', err);
                return callback(err);
              }
              callback(null);
            });
        });
    });
}

module.exports = {
  initializeItems,
  getRandomItem,
  addItemToInventory,
  equipItem,
  BASE_ITEMS,
  EQUIPMENT_SLOTS
};
