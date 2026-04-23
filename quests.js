const db = require('./database_simple');

// Базовые квесты
const BASE_QUESTS = [
  // Ежедневные квесты
  { name: 'Ежедневная тренировка', description: 'Победите в 3 дуэлях', type: 'duel', requirement: 3, reward_gold: 50, reward_exp: 100, is_daily: 1 },
  { name: 'Охотник за сокровищами', description: 'Найдите 5 предметов', type: 'loot', requirement: 5, reward_gold: 75, reward_exp: 150, is_daily: 1 },
  { name: 'Мастер прокачки', description: 'Улучшите расу 2 раза', type: 'upgrade', requirement: 2, reward_gold: 100, reward_exp: 200, is_daily: 1 },
  
  // Обычные квесты
  { name: 'Первая кровь', description: 'Победите в первой дуэли', type: 'duel', requirement: 1, reward_gold: 100, reward_exp: 50, is_daily: 0 },
  { name: 'Коллекционер', description: 'Соберите 10 предметов', type: 'collect', requirement: 10, reward_gold: 200, reward_exp: 300, is_daily: 0 },
  { name: 'Восхождение', description: 'Достигните 10 уровня', type: 'level', requirement: 10, reward_gold: 500, reward_exp: 0, is_daily: 0 },
  { name: 'Легенда', description: 'Получите легендарную расу', type: 'race', requirement: 1, reward_gold: 1000, reward_exp: 1000, is_daily: 0 },
  { name: 'Основатель', description: 'Создайте клан', type: 'clan', requirement: 1, reward_gold: 500, reward_exp: 500, is_daily: 0 }
];

// Инициализация квестов
function initializeQuests() {
  // Проверяем тип базы данных
  if (db.prepare) {
    // SQLite
    const stmt = db.prepare(`INSERT OR IGNORE INTO quests 
      (name, description, type, requirement, reward_gold, reward_exp, is_daily) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`);
    
    BASE_QUESTS.forEach(quest => {
      stmt.run(quest.name, quest.description, quest.type, quest.requirement, 
               quest.reward_gold, quest.reward_exp, quest.is_daily);
    });
    
    stmt.finalize();
  } else {
    // PostgreSQL
    BASE_QUESTS.forEach(quest => {
      db.run(`INSERT INTO quests 
        (name, description, type, requirement, reward_gold, reward_exp, is_daily) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (name) DO NOTHING`,
        [quest.name, quest.description, quest.type, quest.requirement, 
         quest.reward_gold, quest.reward_exp, quest.is_daily]);
    });
  }
  
  console.log('Квесты инициализированы');
}

// Получить доступные квесты для игрока
function getAvailableQuests(playerId, callback) {
  const today = new Date().toISOString().split('T')[0];
  
  db.all(`SELECT q.* FROM quests q
          WHERE q.id NOT IN (
            SELECT quest_id FROM completed_quests 
            WHERE player_id = ? 
            AND (is_daily = 0 OR DATE(completed_at) = ?)
          )`, [playerId, today], callback);
}

// Проверить прогресс квеста
function checkQuestProgress(playerId, questType, callback) {
  db.get(`SELECT * FROM quests WHERE type = ? AND is_daily = 1`, [questType], (err, quest) => {
    if (err || !quest) return callback(err);
    
    // Здесь должна быть логика проверки прогресса
    // Для примера просто возвращаем квест
    callback(null, quest);
  });
}

// Завершить квест
function completeQuest(playerId, questId, callback) {
  db.get(`SELECT * FROM quests WHERE id = ?`, [questId], (err, quest) => {
    if (err || !quest) return callback(err);
    
    // Проверяем, не выполнен ли уже квест
    const today = new Date().toISOString().split('T')[0];
    db.get(`SELECT * FROM completed_quests 
            WHERE player_id = ? AND quest_id = ? 
            AND (? = 0 OR DATE(completed_at) = ?)`,
      [playerId, questId, quest.is_daily, today], (err, completed) => {
        if (completed) return callback(new Error('Квест уже выполнен'));
        
        // Добавляем награды
        db.run(`UPDATE players SET gold = gold + ?, exp = exp + ? WHERE user_id = ?`,
          [quest.reward_gold, quest.reward_exp, playerId], (err) => {
            if (err) return callback(err);
            
            // Отмечаем квест как выполненный
            db.run(`INSERT INTO completed_quests (player_id, quest_id) VALUES (?, ?)`,
              [playerId, questId], (err) => {
                callback(err, quest);
              });
          });
      });
  });
}

module.exports = {
  initializeQuests,
  getAvailableQuests,
  checkQuestProgress,
  completeQuest,
  BASE_QUESTS
};
