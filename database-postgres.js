let Pool;
try {
  Pool = require('pg').Pool;
} catch (error) {
  console.log('⚠️ PostgreSQL драйвер не найден, используйте SQLite');
  module.exports = null;
  return;
}

// Проверяем наличие DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.log('⚠️ DATABASE_URL не найден, используйте SQLite');
  module.exports = null;
  return;
}

// Настройка подключения к PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

console.log('🐘 Подключение к PostgreSQL...');
console.log('DATABASE_URL найден:', !!process.env.DATABASE_URL);

// Тестируем подключение
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Ошибка подключения к PostgreSQL:', err.message);
    console.log('📁 Переключаемся на SQLite...');
    // Экспортируем null чтобы database.js переключился на SQLite
    module.exports = null;
    return;
  }
  
  console.log('✅ PostgreSQL подключен успешно');
  release();
});

// Инициализация базы данных
async function initializeDatabase() {
  try {
    // Проверяем подключение перед созданием таблиц
    await pool.query('SELECT NOW()');
    console.log('🔗 Соединение с PostgreSQL установлено');
    
    // Таблица игроков
    await pool.query(`CREATE TABLE IF NOT EXISTS players (
      user_id BIGINT PRIMARY KEY,
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
      is_searching BOOLEAN DEFAULT FALSE,
      search_started_at TIMESTAMP,
      last_duel_time INTEGER DEFAULT 0,
      clan_id INTEGER,
      is_vip BOOLEAN DEFAULT FALSE,
      vip_until INTEGER DEFAULT 0,
      last_daily_reward INTEGER DEFAULT 0,
      last_work INTEGER DEFAULT 0,
      last_loot INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Добавляем новые колонки если их нет (миграция)
    try {
      await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS mmr INTEGER DEFAULT 0`);
      await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS is_searching BOOLEAN DEFAULT FALSE`);
      await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS search_started_at TIMESTAMP`);
      await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS last_duel_time INTEGER DEFAULT 0`);
    } catch (err) {
      // Игнорируем ошибки если колонки уже существуют
      console.log('Миграция колонок завершена или не требуется');
    }

    // Таблица рас
    await pool.query(`CREATE TABLE IF NOT EXISTS races (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE,
      rarity TEXT,
      base_attack INTEGER,
      base_defense INTEGER,
      base_hp INTEGER,
      special_ability TEXT,
      description TEXT,
      base_power INTEGER,
      is_legendary BOOLEAN DEFAULT FALSE
    )`);

    // Таблица предметов
    await pool.query(`CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE,
      type TEXT,
      slot TEXT,
      rarity TEXT,
      attack_bonus INTEGER DEFAULT 0,
      defense_bonus INTEGER DEFAULT 0,
      hp_bonus INTEGER DEFAULT 0,
      power_bonus INTEGER DEFAULT 0,
      special_effect TEXT,
      description TEXT
    )`);

    // Таблица инвентаря
    await pool.query(`CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY,
      user_id BIGINT,
      item_id INTEGER,
      equipped BOOLEAN DEFAULT FALSE,
      quantity INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES players(user_id),
      FOREIGN KEY (item_id) REFERENCES items(id)
    )`);

    // Таблица кланов
    await pool.query(`CREATE TABLE IF NOT EXISTS clans (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE,
      leader_id BIGINT,
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      member_count INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (leader_id) REFERENCES players(user_id)
    )`);

    // Таблица квестов
    await pool.query(`CREATE TABLE IF NOT EXISTS quests (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE,
      description TEXT,
      type TEXT,
      target_value INTEGER,
      requirement INTEGER,
      reward_gold INTEGER DEFAULT 0,
      reward_exp INTEGER DEFAULT 0,
      is_daily BOOLEAN DEFAULT FALSE
    )`);

    // Таблица прогресса квестов
    await pool.query(`CREATE TABLE IF NOT EXISTS quest_progress (
      id SERIAL PRIMARY KEY,
      user_id BIGINT,
      quest_id INTEGER,
      progress INTEGER DEFAULT 0,
      completed BOOLEAN DEFAULT FALSE,
      completed_at TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES players(user_id),
      FOREIGN KEY (quest_id) REFERENCES quests(id)
    )`);

    // Таблица достижений
    await pool.query(`CREATE TABLE IF NOT EXISTS achievements (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE,
      description TEXT,
      condition_type TEXT,
      requirement_type TEXT,
      condition_value INTEGER,
      requirement_value INTEGER,
      reward_gold INTEGER DEFAULT 0,
      reward_exp INTEGER DEFAULT 0,
      icon TEXT
    )`);

    // Таблица прогресса достижений
    await pool.query(`CREATE TABLE IF NOT EXISTS player_achievements (
      id SERIAL PRIMARY KEY,
      user_id BIGINT,
      player_id BIGINT,
      achievement_id INTEGER,
      unlocked BOOLEAN DEFAULT FALSE,
      unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES players(user_id),
      FOREIGN KEY (player_id) REFERENCES players(user_id),
      FOREIGN KEY (achievement_id) REFERENCES achievements(id),
      UNIQUE(player_id, achievement_id)
    )`);

    // Таблица древа навыков
    await pool.query(`CREATE TABLE IF NOT EXISTS skill_tree (
      id SERIAL PRIMARY KEY,
      name TEXT,
      description TEXT,
      required_level INTEGER,
      cost INTEGER,
      parent_skill_id INTEGER,
      bonus_type TEXT,
      bonus_value INTEGER
    )`);

    // Таблица изученных навыков
    await pool.query(`CREATE TABLE IF NOT EXISTS player_skills (
      id SERIAL PRIMARY KEY,
      user_id BIGINT,
      skill_id INTEGER,
      learned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES players(user_id),
      FOREIGN KEY (skill_id) REFERENCES skill_tree(id)
    )`);

    console.log('✅ База данных PostgreSQL инициализирована');
  } catch (error) {
    console.error('❌ Ошибка инициализации PostgreSQL:', error);
  }
}

// Экспортируем pool для использования в других файлах
module.exports = {
  pool,
  initializeDatabase,
  // Совместимость с SQLite API
  get: (query, params, callback) => {
    // Конвертируем ? в $1, $2, $3 для PostgreSQL
    let pgQuery = query;
    let paramIndex = 1;
    pgQuery = pgQuery.replace(/\?/g, () => `$${paramIndex++}`);
    
    pool.query(pgQuery, params)
      .then(result => callback(null, result.rows[0]))
      .catch(err => {
        console.error('PostgreSQL GET error:', err.message);
        console.error('Query:', pgQuery);
        console.error('Params:', params);
        callback(err);
      });
  },
  all: (query, params, callback) => {
    // Конвертируем ? в $1, $2, $3 для PostgreSQL
    let pgQuery = query;
    let paramIndex = 1;
    pgQuery = pgQuery.replace(/\?/g, () => `$${paramIndex++}`);
    
    pool.query(pgQuery, params)
      .then(result => callback(null, result.rows))
      .catch(err => {
        console.error('PostgreSQL ALL error:', err.message);
        console.error('Query:', pgQuery);
        console.error('Params:', params);
        callback(err);
      });
  },
  run: (query, params, callback) => {
    // Конвертируем ? в $1, $2, $3 для PostgreSQL
    let pgQuery = query;
    let paramIndex = 1;
    pgQuery = pgQuery.replace(/\?/g, () => `$${paramIndex++}`);
    
    pool.query(pgQuery, params)
      .then(result => {
        if (callback) callback.call({ changes: result.rowCount }, null);
      })
      .catch(err => {
        console.error('PostgreSQL RUN error:', err.message);
        console.error('Query:', pgQuery);
        console.error('Params:', params);
        if (callback) callback(err);
      });
  }
};