const db = require('./database_simple');
const characteristics = require('./characteristics.js');

console.log('🔍 ОТЛАДКА СИСТЕМЫ ХАРАКТЕРИСТИК');
console.log('');

// Проверяем формулы
console.log('📊 ПРОВЕРКА ФОРМУЛ:');
const hpType = characteristics.CHARACTERISTIC_TYPES.hp;
console.log(`❤️ Здоровье на уровне 1:`);
console.log(`   Формула: ${hpType.base_bonus} + 1 * ${hpType.level_multiplier} = ${hpType.base_bonus + 1 * hpType.level_multiplier}`);

const calculatedBonus = characteristics.calculateBonus(hpType.base_bonus, hpType.level_multiplier, 1);
console.log(`   calculateBonus(${hpType.base_bonus}, ${hpType.level_multiplier}, 1) = ${calculatedBonus}`);
console.log('');

// Проверяем данные в базе
console.log('🗄️ ДАННЫЕ В БАЗЕ:');
db.all(`SELECT p.user_id, p.username, p.display_name, pc.characteristic_type, pc.level 
        FROM players p 
        LEFT JOIN player_characteristics pc ON p.user_id = pc.player_id 
        WHERE p.race_id IS NOT NULL 
        ORDER BY p.user_id, pc.characteristic_type`, (err, rows) => {
  if (err) {
    console.error('Ошибка:', err);
    process.exit(1);
  }
  
  if (rows.length === 0) {
    console.log('❌ Нет данных о характеристиках игроков');
    process.exit(0);
  }
  
  // Группируем по игрокам
  const players = {};
  rows.forEach(row => {
    if (!players[row.user_id]) {
      players[row.user_id] = {
        username: row.display_name || row.username || `User${row.user_id}`,
        characteristics: {}
      };
    }
    
    if (row.characteristic_type) {
      players[row.user_id].characteristics[row.characteristic_type] = row.level;
    }
  });
  
  Object.entries(players).forEach(([userId, data]) => {
    console.log(`👤 ${data.username} (ID: ${userId}):`);
    
    if (Object.keys(data.characteristics).length === 0) {
      console.log('   📊 Характеристики не прокачаны');
    } else {
      Object.entries(data.characteristics).forEach(([type, level]) => {
        const typeData = characteristics.CHARACTERISTIC_TYPES[type];
        if (typeData) {
          const bonus = characteristics.calculateBonus(typeData.base_bonus, typeData.level_multiplier, level);
          console.log(`   ${typeData.icon} ${typeData.name}: Ур.${level} (+${bonus})`);
        }
      });
    }
    console.log('');
  });
  
  process.exit(0);
});