const Database = require('better-sqlite3');
const path = require('path');

// Создаем подключение к базе данных
const dbPath = path.join(__dirname, 'data', 'game.db');
console.log('Подключаемся к базе данных:', dbPath);

try {
  const db = new Database(dbPath);
  
  console.log('✅ Подключение к базе данных успешно');
  
  // Проверяем боссов
  const bosses = db.prepare('SELECT name, level, id, base_hp FROM raid_bosses ORDER BY level').all();
  
  console.log(`\nНайдено боссов: ${bosses.length}`);
  
  if (bosses.length === 0) {
    console.log('❌ Боссы не найдены!');
  } else {
    console.log('\n📋 Список боссов:');
    bosses.forEach((boss, index) => {
      console.log(`${index + 1}. ${boss.name}`);
      console.log(`   Уровень: ${boss.level}`);
      console.log(`   ID: ${boss.id}`);
      console.log(`   HP: ${boss.base_hp}`);
      console.log('');
    });
  }
  
  // Проверяем таблицу характеристик
  const charCount = db.prepare('SELECT COUNT(*) as count FROM player_characteristics').get();
  console.log(`📊 Записей характеристик: ${charCount.count}`);
  
  db.close();
  console.log('✅ База данных закрыта');
  
} catch (error) {
  console.error('❌ Ошибка:', error.message);
}