const db = require('./database_simple');

// Кэш последних проверок достижений (чтобы не спамить)
const achievementCheckCache = new Map();
const ACHIEVEMENT_CHECK_COOLDOWN = 5000; // 5 секунд между проверками

// Базовые достижения
const BASE_ACHIEVEMENTS = [
  { name: 'Новичок', description: 'Начните свое путешествие', requirement_type: 'level', requirement_value: 1, reward_gold: 50, icon: '🌟' },
  { name: 'Воин', description: 'Достигните 10 уровня', requirement_type: 'level', requirement_value: 10, reward_gold: 200, icon: '⚔️' },
  { name: 'Герой', description: 'Достигните 25 уровня', requirement_type: 'level', requirement_value: 25, reward_gold: 500, icon: '🛡️' },
  { name: 'Легенда', description: 'Достигните 50 уровня', requirement_type: 'level', requirement_value: 50, reward_gold: 1000, icon: '👑' },
  
  { name: 'Первая победа', description: 'Победите в дуэли', requirement_type: 'wins', requirement_value: 1, reward_gold: 100, icon: '🏆' },
  { name: 'Победитель', description: 'Победите в 10 дуэлях', requirement_type: 'wins', requirement_value: 10, reward_gold: 300, icon: '🥇' },
  { name: 'Чемпион', description: 'Победите в 50 дуэлях', requirement_type: 'wins', requirement_value: 50, reward_gold: 800, icon: '🏅' },
  { name: 'Непобедимый', description: 'Победите в 100 дуэлях', requirement_type: 'wins', requirement_value: 100, reward_gold: 2000, icon: '💪' },
  
  { name: 'Коллекционер', description: 'Соберите 10 предметов', requirement_type: 'items', requirement_value: 10, reward_gold: 250, icon: '📦' },
  { name: 'Хранитель сокровищ', description: 'Соберите 50 предметов', requirement_type: 'items', requirement_value: 50, reward_gold: 1000, icon: '💎' },
  
  { name: 'Богач', description: 'Накопите 1000 золота', requirement_type: 'gold', requirement_value: 1000, reward_gold: 500, icon: '💰' },
  { name: 'Магнат', description: 'Накопите 10000 золота', requirement_type: 'gold', requirement_value: 10000, reward_gold: 2000, icon: '💸' },
  
  { name: 'Лидер', description: 'Создайте клан', requirement_type: 'clan_leader', requirement_value: 1, reward_gold: 500, icon: '🚩' },
  { name: 'Член клана', description: 'Вступите в клан', requirement_type: 'clan_member', requirement_value: 1, reward_gold: 200, icon: '🤝' }
];

// Инициализация достижений
function initializeAchievements() {
  // Добавляем базовые достижения
  BASE_ACHIEVEMENTS.forEach(ach => {
    db.run(`INSERT OR IGNORE INTO achievements 
      (name, description, requirement_type, requirement_value, reward_gold, icon) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [ach.name, ach.description, ach.requirement_type, 
       ach.requirement_value, ach.reward_gold, ach.icon]);
  });
  
  console.log('Достижения инициализированы');
}

// Проверить достижения игрока
function checkAchievements(playerId, callback) {
  // Проверяем кулдаун
  const now = Date.now();
  const lastCheck = achievementCheckCache.get(playerId);
  
  if (lastCheck && (now - lastCheck) < ACHIEVEMENT_CHECK_COOLDOWN) {
    return callback(null, []); // Возвращаем пустой массив если слишком рано
  }
  
  achievementCheckCache.set(playerId, now);
  
  db.get(`SELECT * FROM players WHERE user_id = ?`, [playerId], (err, player) => {
    if (err || !player) return callback(err);
    
    // Получаем все достижения, которые игрок еще не получил
    db.all(`SELECT a.* FROM achievements a
            WHERE a.id NOT IN (
              SELECT achievement_id FROM player_achievements WHERE player_id = ?
            )`, [playerId], (err, achievements) => {
      if (err) return callback(err);
      
      const newAchievements = [];
      
      // Проверяем каждое достижение
      achievements.forEach(ach => {
        let unlocked = false;
        
        switch(ach.requirement_type) {
          case 'level':
            unlocked = player.level >= ach.requirement_value;
            break;
          case 'wins':
            unlocked = player.wins >= ach.requirement_value;
            break;
          case 'gold':
            unlocked = player.gold >= ach.requirement_value;
            break;
        }
        
        if (unlocked) {
          newAchievements.push(ach);
        }
      });
      
      // Разблокируем новые достижения (упрощенная версия)
      if (newAchievements.length > 0) {
        newAchievements.forEach(ach => {
          // Добавляем достижение
          db.run(`INSERT OR IGNORE INTO player_achievements (player_id, achievement_id) VALUES (?, ?)`,
            [playerId, ach.id]);
          // Выдаем награду
          db.run(`UPDATE players SET gold = gold + ? WHERE user_id = ?`, [ach.reward_gold, playerId]);
        });
      }
      
      callback(null, newAchievements);
    });
  });
}

// Получить достижения игрока
function getPlayerAchievements(playerId, callback) {
  db.all(`SELECT a.*, pa.unlocked_at FROM achievements a
          JOIN player_achievements pa ON a.id = pa.achievement_id
          WHERE pa.player_id = ?
          ORDER BY pa.unlocked_at DESC`, [playerId], callback);
}

module.exports = {
  initializeAchievements,
  checkAchievements,
  getPlayerAchievements,
  BASE_ACHIEVEMENTS
};
