const db = require('./database_simple');
const config = require('./config');

// Создать клан
function createClan(leaderId, clanName, callback) {
  db.get(`SELECT * FROM players WHERE user_id = ?`, [leaderId], (err, player) => {
    if (err || !player) return callback(err || new Error('Игрок не найден'));
    
    if (!player.is_vip) {
      return callback(new Error('Только VIP могут создавать кланы'));
    }
    
    if (player.clan_id) {
      return callback(new Error('Вы уже в клане'));
    }
    
    db.run(`INSERT INTO clans (name, leader_id) VALUES (?, ?)`,
      [clanName, leaderId], function(err) {
        if (err) return callback(err);
        
        const clanId = this.lastID;
        
        db.run(`UPDATE players SET clan_id = ? WHERE user_id = ?`,
          [clanId, leaderId], (err) => {
            if (err) return callback(err);
            
            db.get(`SELECT * FROM clans WHERE id = ?`, [clanId], callback);
          });
      });
  });
}

// Вступить в клан
function joinClan(playerId, clanId, callback) {
  db.get(`SELECT * FROM players WHERE user_id = ?`, [playerId], (err, player) => {
    if (err || !player) return callback(err);
    
    if (player.clan_id) {
      return callback(new Error('Вы уже состоите в клане'));
    }
    
    // Проверяем количество членов клана
    db.get(`SELECT COUNT(*) as count FROM players WHERE clan_id = ?`, [clanId], (err, result) => {
      if (err) return callback(err);
      
      if (result.count >= config.CLAN_MAX_MEMBERS) {
        return callback(new Error('Клан переполнен'));
      }
      
      db.run(`UPDATE players SET clan_id = ? WHERE user_id = ?`,
        [clanId, playerId], callback);
    });
  });
}

// Покинуть клан
function leaveClan(playerId, callback) {
  db.get(`SELECT * FROM players WHERE user_id = ?`, [playerId], (err, player) => {
    if (err || !player) return callback(err);
    
    if (!player.clan_id) {
      return callback(new Error('Вы не состоите в клане'));
    }
    
    // Проверяем, не лидер ли игрок
    db.get(`SELECT * FROM clans WHERE id = ? AND leader_id = ?`, 
      [player.clan_id, playerId], (err, clan) => {
        if (clan) {
          return callback(new Error('Лидер не может покинуть клан. Передайте лидерство или распустите клан'));
        }
        
        db.run(`UPDATE players SET clan_id = NULL WHERE user_id = ?`,
          [playerId], callback);
      });
  });
}

// Получить информацию о клане
function getClanInfo(clanId, callback) {
  db.get(`SELECT c.*, COUNT(p.user_id) as member_count,
          SUM(p.power) as total_power
          FROM clans c
          LEFT JOIN players p ON c.id = p.clan_id
          WHERE c.id = ?
          GROUP BY c.id`, [clanId], callback);
}

// Получить топ кланов
function getTopClans(limit, callback) {
  db.all(`SELECT c.*, COUNT(p.user_id) as member_count,
          SUM(p.power) as total_power
          FROM clans c
          LEFT JOIN players p ON c.id = p.clan_id
          GROUP BY c.id
          ORDER BY total_power DESC
          LIMIT ?`, [limit], callback);
}

// Получить членов клана
function getClanMembers(clanId, callback) {
  db.all(`SELECT p.user_id, p.username, p.level, p.power, p.wins
          FROM players p
          WHERE p.clan_id = ?
          ORDER BY p.power DESC`, [clanId], callback);
}

module.exports = {
  createClan,
  joinClan,
  leaveClan,
  getClanInfo,
  getTopClans,
  getClanMembers
};
