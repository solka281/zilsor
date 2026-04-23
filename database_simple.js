const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Используем Volume хранение для Railway
const dbPath = process.env.NODE_ENV === 'production' ? '/app/data/game.db' : './data/game.db';

console.log(`📁 Путь к базе данных: ${dbPath}`);

// Проверяем что директория существует
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  console.log(`📁 Создаем директорию: ${dbDir}`);
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Ошибка подключения к базе данных:', err);
  } else {
    console.log('✅ Подключение к базе данных успешно');
  }
});

// Устанавливаем таймаут для операций
db.configure('busyTimeout', 5000); // 5 секунд таймаут

// Инициализация базы данных - НЕ блокируем запуск
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
    clan_id INTEGER,
    is_vip INTEGER DEFAULT 0,
    vip_until INTEGER DEFAULT 0,
    last_daily_reward INTEGER DEFAULT 0,
    last_work_time INTEGER DEFAULT 0,
    last_loot_time INTEGER DEFAULT 0,
    last_duel_time INTEGER DEFAULT 0,
    is_searching_duel INTEGER DEFAULT 0,
    search_started_at INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Ошибка создания таблицы players:', err);
    } else {
      // Добавляем недостающие колонки если таблица уже существовала
      db.run(`ALTER TABLE players ADD COLUMN last_loot_time INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Ошибка добавления last_loot_time:', err.message);
        }
      });
      
      db.run(`ALTER TABLE players ADD COLUMN last_work_time INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Ошибка добавления last_work_time:', err.message);
        }
      });
      
      db.run(`ALTER TABLE players ADD COLUMN last_daily_reward INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Ошибка добавления last_daily_reward:', err.message);
        }
      });
      
      db.run(`ALTER TABLE players ADD COLUMN last_duel_time INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Ошибка добавления last_duel_time:', err.message);
        }
      });
      
      db.run(`ALTER TABLE players ADD COLUMN is_searching_duel INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Ошибка добавления is_searching_duel:', err.message);
        }
      });
      
      db.run(`ALTER TABLE players ADD COLUMN search_started_at INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Ошибка добавления search_started_at:', err.message);
        }
      });
      db.run(`ALTER TABLE players ADD COLUMN last_forest_time INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Ошибка добавления last_forest_time:', err.message);
        }
      });
      
      db.run(`ALTER TABLE players ADD COLUMN forest_level INTEGER DEFAULT 1`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Ошибка добавления forest_level:', err.message);
        }
      });
      
      db.run(`ALTER TABLE players ADD COLUMN current_forest_enemy TEXT DEFAULT NULL`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Ошибка добавления current_forest_enemy:', err.message);
        }
      });
      
      db.run(`ALTER TABLE players ADD COLUMN referrer_id INTEGER DEFAULT NULL`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Ошибка добавления referrer_id:', err.message);
        }
      });
      
      db.run(`ALTER TABLE players ADD COLUMN referral_count INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Ошибка добавления referral_count:', err.message);
        }
      });
      
      db.run(`ALTER TABLE players ADD COLUMN referral_rewarded INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Ошибка добавления referral_rewarded:', err.message);
        }
      });
      
      db.run(`ALTER TABLE players ADD COLUMN equipped_potion_id INTEGER DEFAULT NULL`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Ошибка добавления equipped_potion_id:', err.message);
        }
      });
    }
  });

  // Таблица рас
  db.run(`CREATE TABLE IF NOT EXISTS races (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    description TEXT,
    rarity INTEGER,
    base_power INTEGER,
    base_hp INTEGER,
    base_attack INTEGER,
    base_defense INTEGER,
    special_ability TEXT,
    is_legendary INTEGER DEFAULT 0,
    parent_race_1 INTEGER,
    parent_race_2 INTEGER
  )`, (err) => {
    if (err) console.error('Ошибка создания таблицы races:', err);
  });

  // Таблица предметов - закомментировано чтобы сохранять инвентари
  // db.run(`DROP TABLE IF EXISTS items`);
  // db.run(`DROP TABLE IF EXISTS inventory`);
  
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
    if (err) console.error('Ошибка создания таблицы items:', err);
  });

  // Таблица инвентаря
  db.run(`CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER,
    item_id INTEGER,
    equipped INTEGER DEFAULT 0,
    obtained_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error('Ошибка создания таблицы inventory:', err);
  });

  // Таблица кланов
  db.run(`CREATE TABLE IF NOT EXISTS clans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    leader_id INTEGER,
    description TEXT DEFAULT NULL,
    level INTEGER DEFAULT 1,
    member_count INTEGER DEFAULT 1,
    total_power INTEGER DEFAULT 0,
    max_members INTEGER DEFAULT 20,
    join_type TEXT DEFAULT 'open',
    avatar_file_id TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Ошибка создания таблицы clans:', err);
    } else {
      // Добавляем недостающие колонки если таблица уже существовала
      db.run(`ALTER TABLE clans ADD COLUMN description TEXT DEFAULT NULL`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Ошибка добавления description в clans:', err.message);
        }
      });
      
      db.run(`ALTER TABLE clans ADD COLUMN level INTEGER DEFAULT 1`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Ошибка добавления level в clans:', err.message);
        }
      });
      
      db.run(`ALTER TABLE clans ADD COLUMN member_count INTEGER DEFAULT 1`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Ошибка добавления member_count в clans:', err.message);
        }
      });
      
      db.run(`ALTER TABLE clans ADD COLUMN total_power INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Ошибка добавления total_power в clans:', err.message);
        }
      });
      
      db.run(`ALTER TABLE clans ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Ошибка добавления created_at в clans:', err.message);
        }
      });
      
      db.run(`ALTER TABLE clans ADD COLUMN max_members INTEGER DEFAULT 20`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Ошибка добавления max_members в clans:', err.message);
        }
      });
      
      db.run(`ALTER TABLE clans ADD COLUMN join_type TEXT DEFAULT 'open'`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Ошибка добавления join_type в clans:', err.message);
        }
      });
      
      db.run(`ALTER TABLE clans ADD COLUMN avatar_file_id TEXT DEFAULT NULL`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Ошибка добавления avatar_file_id в clans:', err.message);
        }
      });
    }
  });

  // Таблица заявок в кланы
  db.run(`CREATE TABLE IF NOT EXISTS clan_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clan_id INTEGER,
    player_id INTEGER,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(clan_id, player_id)
  )`, (err) => {
    if (err) console.error('Ошибка создания таблицы clan_requests:', err);
  });

  // Таблица квестов
  db.run(`CREATE TABLE IF NOT EXISTS quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    type TEXT,
    requirement_type TEXT,
    requirement_value INTEGER,
    requirement INTEGER,
    reward_gold INTEGER,
    reward_exp INTEGER,
    is_daily INTEGER DEFAULT 0
  )`, (err) => {
    if (err) console.error('Ошибка создания таблицы quests:', err);
  });

  // Таблица выполненных квестов
  db.run(`CREATE TABLE IF NOT EXISTS player_quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER,
    quest_id INTEGER,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_id, quest_id)
  )`, (err) => {
    if (err) console.error('Ошибка создания таблицы player_quests:', err);
  });
  
  // Таблица завершенных квестов (альтернативное название)
  db.run(`CREATE TABLE IF NOT EXISTS completed_quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER,
    quest_id INTEGER,
    is_daily INTEGER DEFAULT 0,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error('Ошибка создания таблицы completed_quests:', err);
  });

  // Таблица навыков
  db.run(`CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    branch TEXT,
    cost INTEGER,
    required_level INTEGER,
    power_bonus INTEGER DEFAULT 0,
    hp_bonus INTEGER DEFAULT 0,
    attack_bonus INTEGER DEFAULT 0,
    defense_bonus INTEGER DEFAULT 0
  )`, (err) => {
    if (err) console.error('Ошибка создания таблицы skills:', err);
  });
  
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
  )`, (err) => {
    if (err) console.error('Ошибка создания таблицы skill_tree:', err);
  });

  // Таблица изученных навыков
  db.run(`CREATE TABLE IF NOT EXISTS player_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER,
    skill_id INTEGER,
    learned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_id, skill_id)
  )`, (err) => {
    if (err) console.error('Ошибка создания таблицы player_skills:', err);
  });

  // Таблица достижений
  db.run(`CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    description TEXT,
    requirement_type TEXT,
    requirement_value INTEGER,
    reward_gold INTEGER,
    icon TEXT
  )`, (err) => {
    if (err) console.error('Ошибка создания таблицы achievements:', err);
  });

  // Таблица достижений игроков
  db.run(`CREATE TABLE IF NOT EXISTS player_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER,
    achievement_id INTEGER,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_id, achievement_id)
  )`, (err) => {
    if (err) console.error('Ошибка создания таблицы player_achievements:', err);
    else console.log('📁 База данных SQLite инициализирована');
  });
  
  // Таблица зелий
  db.run(`CREATE TABLE IF NOT EXISTS potions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    description TEXT,
    type TEXT,
    heal_amount INTEGER DEFAULT 0,
    price INTEGER DEFAULT 0
  )`, (err) => {
    if (err) console.error('Ошибка создания таблицы potions:', err);
  });
  
  // Таблица инвентаря зелий игроков
  db.run(`CREATE TABLE IF NOT EXISTS player_potions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER,
    potion_id INTEGER,
    quantity INTEGER DEFAULT 0,
    UNIQUE(player_id, potion_id)
  )`, (err) => {
    if (err) console.error('Ошибка создания таблицы player_potions:', err);
  });
  
  // Таблица пула ежедневных квестов
  db.run(`CREATE TABLE IF NOT EXISTS daily_quests_pool (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    description TEXT,
    type TEXT,
    requirement INTEGER,
    reward_gold INTEGER,
    reward_exp INTEGER
  )`, (err) => {
    if (err) console.error('Ошибка создания таблицы daily_quests_pool:', err);
  });
  
  // Таблица ежедневных квестов игроков
  db.run(`CREATE TABLE IF NOT EXISTS player_daily_quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER,
    quest_id INTEGER,
    quest_name TEXT,
    quest_description TEXT,
    quest_type TEXT,
    requirement INTEGER,
    reward_gold INTEGER,
    reward_exp INTEGER,
    progress INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME DEFAULT NULL
  )`, (err) => {
    if (err) console.error('Ошибка создания таблицы player_daily_quests:', err);
  });
});

module.exports = db;
