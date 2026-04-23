// Скрипт для добавления недостающих колонок в таблицу players
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.NODE_ENV === 'production' ? '/app/data/game.db' : './data/game.db';

console.log(`📁 Исправляем колонки в базе данных: ${dbPath}`);

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log('🔧 Добавляем недостающие колонки...');
  
  // Проверяем и добавляем last_loot_time
  db.run(`ALTER TABLE players ADD COLUMN last_loot_time INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Ошибка добавления last_loot_time:', err.message);
    } else {
      console.log('✅ last_loot_time добавлена');
    }
  });
  
  // Проверяем и добавляем last_work_time
  db.run(`ALTER TABLE players ADD COLUMN last_work_time INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Ошибка добавления last_work_time:', err.message);
    } else {
      console.log('✅ last_work_time добавлена');
    }
  });
  
  // Проверяем и добавляем last_daily_reward
  db.run(`ALTER TABLE players ADD COLUMN last_daily_reward INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Ошибка добавления last_daily_reward:', err.message);
    } else {
      console.log('✅ last_daily_reward добавлена');
    }
  });
  
  // Проверяем и добавляем last_duel_time
  db.run(`ALTER TABLE players ADD COLUMN last_duel_time INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Ошибка добавления last_duel_time:', err.message);
    } else {
      console.log('✅ last_duel_time добавлена');
    }
  });
  
  setTimeout(() => {
    console.log('🎉 Миграция завершена!');
    db.close();
    process.exit(0);
  }, 1000);
});
