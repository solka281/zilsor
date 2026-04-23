// Выбираем тип базы данных в зависимости от переменных окружения
if (process.env.DATABASE_URL) {
  // Используем PostgreSQL если есть DATABASE_URL
  console.log('🐘 Используем PostgreSQL');
  const postgres = require('./database-postgres');
  
  // Инициализируем PostgreSQL
  postgres.initializeDatabase();
  
  // Экспортируем PostgreSQL интерфейс
  module.exports = postgres.pool;
  module.exports.get = postgres.get;
  module.exports.all = postgres.all;
  module.exports.run = postgres.run;
} else {
  // Используем SQLite как fallback
  console.log('📁 Используем SQLite');
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const fs = require('fs');

  // Путь к базе данных - используем переменную окружения или текущую папку
  const dbPath = process.env.DATABASE_PATH || './game.db';
  console.log(`📁 Путь к базе данных: ${dbPath}`);

  // Создаем папку для базы данных если её нет
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`📁 Создана папка для БД: ${dbDir}`);
  }

  const db = new sqlite3.Database(dbPath);

// Инициализация базы данных
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
    clan_id INTEGER,
    is_vip BOOLEAN DEFAULT 0,
    vip_until INTEGER DEFAULT 0,
    last_daily_quest DATE,
    last_loot_time INTEGER DEFAULT 0,
    last_duel_time INTEGER DEFAULT 0,
    last_daily_reward INTEGER DEFAULT 0,
    last_work_time INTEGER DEFAULT 0,
    total_rolls INTEGER DEFAULT 0,
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
    is_legendary BOOLEAN DEFAULT 0,
    parent_race_1 INTEGER,
    parent_race_2 INTEGER
  )`);

  // Таблица прокачек рас
  db.run(`CREATE TABLE IF NOT EXISTS race_upgrades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER,
    upgrade_type TEXT,
    level INTEGER DEFAULT 0,
    FOREIGN KEY(player_id) REFERENCES players(user_id)
  )`);

  // Таблица предметов
  db.run(`CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    rarity TEXT,
    slot TEXT,
    power_bonus INTEGER,
    hp_bonus INTEGER,
    attack_bonus INTEGER,
    defense_bonus INTEGER,
    special_effect TEXT
  )`);

  // Таблица инвентаря
  db.run(`CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER,
    item_id INTEGER,
    slot TEXT,
    equipped BOOLEAN DEFAULT 0,
    FOREIGN KEY(player_id) REFERENCES players(user_id),
    FOREIGN KEY(item_id) REFERENCES items(id)
  )`);

  // Таблица кланов
  db.run(`CREATE TABLE IF NOT EXISTS clans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    leader_id INTEGER,
    level INTEGER DEFAULT 1,
    exp INTEGER DEFAULT 0,
    total_power INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(leader_id) REFERENCES players(user_id)
  )`);

  // Таблица квестов
  db.run(`CREATE TABLE IF NOT EXISTS quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    type TEXT,
    requirement INTEGER,
    reward_gold INTEGER,
    reward_exp INTEGER,
    is_daily BOOLEAN DEFAULT 0
  )`);

  // Таблица выполненных квестов
  db.run(`CREATE TABLE IF NOT EXISTS completed_quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER,
    quest_id INTEGER,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(player_id) REFERENCES players(user_id),
    FOREIGN KEY(quest_id) REFERENCES quests(id)
  )`);

  // Таблица достижений
  db.run(`CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    requirement_type TEXT,
    requirement_value INTEGER,
    reward_gold INTEGER,
    icon TEXT
  )`);

  // Таблица полученных достижений
  db.run(`CREATE TABLE IF NOT EXISTS player_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER,
    achievement_id INTEGER,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(player_id) REFERENCES players(user_id),
    FOREIGN KEY(achievement_id) REFERENCES achievements(id)
  )`);

  // Таблица древа прокачки
  db.run(`CREATE TABLE IF NOT EXISTS skill_tree (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    player_id INTEGER,
    skill_id INTEGER,
    level INTEGER DEFAULT 1,
    FOREIGN KEY(player_id) REFERENCES players(user_id),
    FOREIGN KEY(skill_id) REFERENCES skill_tree(id)
  )`);

  console.log('База данных инициализирована');
});

module.exports = db;
