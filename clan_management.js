const db = require('./database_simple');

// Получить список всех кланов для вступления
function getAvailableClans(limit, callback) {
  db.all(`SELECT c.*, 
          (SELECT COUNT(*) FROM players WHERE clan_id = c.id) as current_members,
          (SELECT COALESCE(SUM(p.power), 0) FROM players p WHERE p.clan_id = c.id) as total_power
          FROM clans c
          ORDER BY total_power DESC
          LIMIT ?`, [limit], callback);
}

// Отправить заявку в клан
function sendJoinRequest(playerId, clanId, callback) {
  // Проверяем что игрок не в клане
  db.get(`SELECT clan_id FROM players WHERE user_id = ?`, [playerId], (err, player) => {
    if (err) return callback(err);
    if (player.clan_id) return callback(new Error('Вы уже в клане'));
    
    // Проверяем тип вступления в клан
    db.get(`SELECT join_type, max_members, 
            (SELECT COUNT(*) FROM players WHERE clan_id = ?) as current_members
            FROM clans WHERE id = ?`, [clanId, clanId], (err, clan) => {
      if (err) return callback(err);
      if (!clan) return callback(new Error('Клан не найден'));
      if (clan.current_members >= clan.max_members) {
        return callback(new Error('Клан переполнен'));
      }
      
      if (clan.join_type === 'open') {
        // Открытый клан - сразу добавляем
        db.run(`UPDATE players SET clan_id = ? WHERE user_id = ?`, [clanId, playerId], (err) => {
          if (err) return callback(err);
          
          // Обновляем счетчик участников
          db.run(`UPDATE clans SET member_count = member_count + 1 WHERE id = ?`, [clanId], (err) => {
            callback(null, { type: 'joined', clanId: clanId });
          });
        });
      } else {
        // Клан по заявкам - создаем заявку
        db.run(`INSERT OR IGNORE INTO clan_requests (clan_id, player_id, status) VALUES (?, ?, 'pending')`,
          [clanId, playerId], function(err) {
            if (err) return callback(err);
            if (this.changes === 0) return callback(new Error('Заявка уже отправлена'));
            callback(null, { type: 'request_sent', clanId: clanId });
          });
      }
    });
  });
}

// Получить заявки в клан
function getClanRequests(clanId, callback) {
  db.all(`SELECT cr.*, p.username, p.level, p.power
          FROM clan_requests cr
          JOIN players p ON cr.player_id = p.user_id
          WHERE cr.clan_id = ? AND cr.status = 'pending'
          ORDER BY cr.created_at DESC`, [clanId], callback);
}

// Принять заявку
function acceptRequest(requestId, callback) {
  db.get(`SELECT * FROM clan_requests WHERE id = ?`, [requestId], (err, request) => {
    if (err) return callback(err);
    if (!request) return callback(new Error('Заявка не найдена'));
    
    // Проверяем лимит участников
    db.get(`SELECT max_members, 
            (SELECT COUNT(*) FROM players WHERE clan_id = ?) as current_members
            FROM clans WHERE id = ?`, [request.clan_id, request.clan_id], (err, clan) => {
      if (err) return callback(err);
      if (clan.current_members >= clan.max_members) {
        return callback(new Error('Клан переполнен'));
      }
      
      // Добавляем игрока в клан
      db.run(`UPDATE players SET clan_id = ? WHERE user_id = ?`, 
        [request.clan_id, request.player_id], (err) => {
          if (err) return callback(err);
          
          // Обновляем статус заявки
          db.run(`UPDATE clan_requests SET status = 'accepted' WHERE id = ?`, [requestId], (err) => {
            if (err) return callback(err);
            
            // Обновляем счетчик участников
            db.run(`UPDATE clans SET member_count = member_count + 1 WHERE id = ?`, 
              [request.clan_id], (err) => {
                callback(null, request);
              });
          });
        });
    });
  });
}

// Отклонить заявку
function rejectRequest(requestId, callback) {
  db.run(`UPDATE clan_requests SET status = 'rejected' WHERE id = ?`, [requestId], function(err) {
    if (err) return callback(err);
    callback(null, { changes: this.changes });
  });
}

// Кикнуть игрока из клана
function kickPlayer(clanId, playerId, callback) {
  db.run(`UPDATE players SET clan_id = NULL WHERE user_id = ? AND clan_id = ?`, 
    [playerId, clanId], function(err) {
      if (err) return callback(err);
      if (this.changes === 0) return callback(new Error('Игрок не найден в клане'));
      
      // Обновляем счетчик участников
      db.run(`UPDATE clans SET member_count = member_count - 1 WHERE id = ?`, [clanId], (err) => {
        callback(null, { kicked: true });
      });
    });
}

// Изменить тип вступления
function changeJoinType(clanId, joinType, callback) {
  if (!['open', 'request'].includes(joinType)) {
    return callback(new Error('Неверный тип вступления'));
  }
  
  db.run(`UPDATE clans SET join_type = ? WHERE id = ?`, [joinType, clanId], function(err) {
    if (err) return callback(err);
    callback(null, { joinType: joinType });
  });
}

// Изменить максимальное количество участников
function changeMaxMembers(clanId, maxMembers, callback) {
  if (maxMembers < 5 || maxMembers > 100) {
    return callback(new Error('Максимум участников должен быть от 5 до 100'));
  }
  
  db.run(`UPDATE clans SET max_members = ? WHERE id = ?`, [maxMembers, clanId], function(err) {
    if (err) return callback(err);
    callback(null, { maxMembers: maxMembers });
  });
}

// Установить аватар клана
function setClanAvatar(clanId, fileId, callback) {
  db.run(`UPDATE clans SET avatar_file_id = ? WHERE id = ?`, [fileId, clanId], function(err) {
    if (err) return callback(err);
    callback(null, { avatarSet: true });
  });
}

// Установить описание клана
function setClanDescription(clanId, description, callback) {
  if (description && description.length > 200) {
    return callback(new Error('Описание не должно превышать 200 символов'));
  }
  
  db.run(`UPDATE clans SET description = ? WHERE id = ?`, [description, clanId], function(err) {
    if (err) return callback(err);
    callback(null, { descriptionSet: true });
  });
}

// Получить информацию о клане
function getClanInfo(clanId, callback) {
  db.get(`SELECT c.*, 
          (SELECT COUNT(*) FROM players WHERE clan_id = c.id) as current_members,
          (SELECT COUNT(*) FROM clan_requests WHERE clan_id = c.id AND status = 'pending') as pending_requests,
          (SELECT COALESCE(SUM(p.power), 0) FROM players p WHERE p.clan_id = c.id) as total_power
          FROM clans c
          WHERE c.id = ?`, [clanId], callback);
}

module.exports = {
  getAvailableClans,
  sendJoinRequest,
  getClanRequests,
  acceptRequest,
  rejectRequest,
  kickPlayer,
  changeJoinType,
  changeMaxMembers,
  setClanAvatar,
  setClanDescription,
  getClanInfo
};
