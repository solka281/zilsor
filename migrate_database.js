// Скрипт миграции базы данных - ЗАПУСТИТЕ ОДИН РАЗ
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.NODE_ENV === 'production' ? '/app/data/game.db' : './data/game.db';

console.log(`📁 Миграция базы данных: ${dbPath}`);

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log('🔄 Начинаем миграцию...');
  
  // Удаляем старые таблицы
  console.log('🗑️  Удаляем старую таблицу items...');
  db.run(`DROP TABLE IF EXISTS items`, (err) => {
    if (err) console.error('Ошибка:', err);
    else console.log('✅ items удалена');
  });
  
  console.log('🗑️  Удаляем старую таблицу inventory...');
  db.run(`DROP TABLE IF EXISTS inventory`, (err) => {
    if (err) console.error('Ошибка:', err);
    else console.log('✅ inventory удалена');
  });
  
  // Создаем новые таблицы с правильной схемой
  console.log('📦 Создаем новую таблицу items...');
  db.run(`CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    description TEXT,
    type TEXT,
    slot TEXT,
    rarity TEXT,
    power_bonus INTEGER DEFAULT 0,
    hp_bonus INTEGER DEFAULT 0,
    attack_bonus INTEGER DEFAULT 0,
    defense_bonus INTEGER DEFAULT 0,
    special_effect TEXT
  )`, (err) => {
    if (err) console.error('Ошибка:', err);
    else console.log('✅ items создана');
  });
  
  console.log('📦 Создаем новую таблицу inventory...');
  db.run(`CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER,
    item_id INTEGER,
    equipped INTEGER DEFAULT 0,
    obtained_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error('Ошибка:', err);
    else console.log('✅ inventory создана');
  });
  
  setTimeout(() => {
    console.log('🎉 Миграция завершена!');
    console.log('💡 Теперь запустите бота: node bot.js');
    db.close();
    process.exit(0);
  }, 1000);
});
