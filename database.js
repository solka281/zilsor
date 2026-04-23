// Временно отключаем PostgreSQL и используем только SQLite
console.log('📁 Используем SQLite');
initSQLite();

function initSQLite() {
  const sqlite3 = require('sqlite3').verbose();
  
  // Используем Volume для постоянного хранения
  const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH 
    ? `${process.env.RAILWAY_VOLUME_MOUNT_PATH}/game.db`
    : './data/game.db';
  
  // Создаем папку data если её нет
  const fs = require('fs');
  const path = require('path');
  const dbDir = path.dirname(dbPath);
  
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`📁 Создана папка для базы данных: ${dbDir}`);
  }
  
  console.log(`📁 Путь к базе данных: ${dbPath}`);
  const db = new sqlite3.Database(dbPath);

  // Инициализация SQLite базы данных
  db.serialize(() => {
    // Таблица игроков
    db.run(`CREATE TABLE IF NOT EXISTS players (
      user_id INTEGER PRIMARY KEY,
      username TEXT,
      display_name TEXT,
      gold INTEGER DEFAULT 0,
      crystals INTEGER DEFAULT 10,
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      awakening_xp INTEGER DEFAULT 0,
      race_id INTEGER,
      awakening_level INTEGER DEFAULT 0,
      power INTEGER DEFAULT 100,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      mmr INTEGER DEFAULT 0,
      is_searching INTEGER DEFAULT 0,
      search_started_at INTEGER DEFAULT 0,
      last_duel_time INTEGER DEFAULT 0,
      clan_id INTEGER,
      is_vip INTEGER DEFAULT 0,
      vip_until INTEGER DEFAULT 0,
      last_daily_reward INTEGER DEFAULT 0,
      last_work INTEGER DEFAULT 0,
      last_loot INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Таблица рас
    db.run(`CREATE TABLE IF NOT EXISTS races (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      description TEXT,
      rarity TEXT,
      base_power INTEGER,
      base_hp INTEGER,
      base_attack INTEGER,
      base_defense INTEGER,
      special_ability TEXT,
      is_legendary INTEGER DEFAULT 0
    )`);

    // Таблица предметов
    db.run(`CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      description TEXT,
      rarity TEXT,
      slot TEXT,
      power_bonus INTEGER DEFAULT 0,
      hp_bonus INTEGER DEFAULT 0,
      attack_bonus INTEGER DEFAULT 0,
      defense_bonus INTEGER DEFAULT 0,
      special_effect TEXT
    )`);

    // Таблица инвентаря
    db.run(`CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      item_id INTEGER,
      equipped INTEGER DEFAULT 0,
      quantity INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES players(user_id),
      FOREIGN KEY (item_id) REFERENCES items(id)
    )`);

    // Таблица кланов
    db.run(`CREATE TABLE IF NOT EXISTS clans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      leader_id INTEGER,
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      member_count INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (leader_id) REFERENCES players(user_id)
    )`);

    // Таблица квестов
    db.run(`CREATE TABLE IF NOT EXISTS quests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      description TEXT,
      type TEXT,
      requirement INTEGER,
      reward_gold INTEGER DEFAULT 0,
      reward_exp INTEGER DEFAULT 0,
      is_daily INTEGER DEFAULT 0
    )`);

    // Таблица прогресса квестов
    db.run(`CREATE TABLE IF NOT EXISTS quest_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      quest_id INTEGER,
      progress INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      completed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES players(user_id),
      FOREIGN KEY (quest_id) REFERENCES quests(id)
    )`);

    // Таблица достижений
    db.run(`CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      description TEXT,
      requirement_type TEXT,
      requirement_value INTEGER,
      reward_gold INTEGER DEFAULT 0,
      icon TEXT
    )`);

    // Таблица прогресса достижений
    db.run(`CREATE TABLE IF NOT EXISTS player_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER,
      achievement_id INTEGER,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players(user_id),
      FOREIGN KEY (achievement_id) REFERENCES achievements(id),
      UNIQUE(player_id, achievement_id)
    )`);

    // Таблица древа навыков
    db.run(`CREATE TABLE IF NOT EXISTS skill_tree (
      id INTEGER PRIMARY KEY,
      name TEXT,
      description TEXT,
      required_level INTEGER,
      cost INTEGER,
      parent_skill_id INTEGER,
      bonus_type TEXT,
      bonus_value INTEGER
    )`);

    // Таблица изученных навыков
    db.run(`CREATE TABLE IF NOT EXISTS player_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      skill_id INTEGER,
      learned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES players(user_id),
      FOREIGN KEY (skill_id) REFERENCES skill_tree(id)
    )`);

    // Добавляем новые колонки если их нет (миграция)
    db.run(`ALTER TABLE players ADD COLUMN mmr INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE players ADD COLUMN is_searching INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE players ADD COLUMN search_started_at INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE players ADD COLUMN last_duel_time INTEGER DEFAULT 0`, () => {});

    console.log('📁 База данных SQLite инициализирована');
  });

  module.exports = db;
}