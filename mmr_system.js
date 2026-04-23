const db = require('./database_simple');

// Константы MMR системы
const MMR_CONFIG = {
  STARTING_MMR: 0,
  BASE_MMR_GAIN: 25,
  SEARCH_RANGE: 500,
  SEARCH_TIMEOUT: 30000, // 30 секунд поиска
  MIN_MMR_GAIN: 5,
  MAX_MMR_GAIN: 50
};

// Хранилище активных матчей (в памяти для быстрого доступа)
const activeMatches = new Map(); // userId -> { opponentId, timestamp }

// Расчет MMR изменения на основе разности рейтингов
function calculateMMRChange(winnerMMR, loserMMR, isWinner) {
  const mmrDifference = Math.abs(winnerMMR - loserMMR);
  
  // Базовая формула: чем больше разность, тем больше изменение для аутсайдера
  let multiplier = 1;
  
  if (mmrDifference > 1000) {
    multiplier = 2.0; // Удвоенное изменение при большой разности
  } else if (mmrDifference > 500) {
    multiplier = 1.5; // Увеличенное изменение при средней разности
  } else if (mmrDifference > 200) {
    multiplier = 1.2; // Небольшое увеличение при малой разности
  }
  
  let mmrChange = MMR_CONFIG.BASE_MMR_GAIN;
  
  if (isWinner) {
    // Победитель
    if (winnerMMR < loserMMR) {
      // Аутсайдер победил - больше очков
      mmrChange = Math.floor(MMR_CONFIG.BASE_MMR_GAIN * multiplier);
    } else {
      // Фаворит победил - меньше очков
      mmrChange = Math.floor(MMR_CONFIG.BASE_MMR_GAIN / multiplier);
    }
  } else {
    // Проигравший
    if (winnerMMR < loserMMR) {
      // Фаворит проиграл - больше штраф
      mmrChange = -Math.floor(MMR_CONFIG.BASE_MMR_GAIN * multiplier);
    } else {
      // Аутсайдер проиграл - меньше штраф
      mmrChange = -Math.floor(MMR_CONFIG.BASE_MMR_GAIN / multiplier);
    }
  }
  
  // Ограничиваем изменения
  if (mmrChange > 0) {
    mmrChange = Math.min(mmrChange, MMR_CONFIG.MAX_MMR_GAIN);
    mmrChange = Math.max(mmrChange, MMR_CONFIG.MIN_MMR_GAIN);
  } else {
    mmrChange = Math.max(mmrChange, -MMR_CONFIG.MAX_MMR_GAIN);
    mmrChange = Math.min(mmrChange, -MMR_CONFIG.MIN_MMR_GAIN);
  }
  
  return mmrChange;
}

// РЕАЛЬНОЕ ВРЕМЯ: Начать поиск дуэли через базу данных
function startMatchmaking(userId, callback) {
  const now = Math.floor(Date.now() / 1000);
  
  // Получаем данные игрока
  db.get(`SELECT * FROM players WHERE user_id = ?`, [userId], (err, player) => {
    if (err || !player) return callback(err || new Error('Игрок не найден'));
    
    const playerMMR = player.mmr || MMR_CONFIG.STARTING_MMR;
    const minMMR = Math.max(0, playerMMR - MMR_CONFIG.SEARCH_RANGE);
    const maxMMR = playerMMR + MMR_CONFIG.SEARCH_RANGE;
    
    // Очищаем старые поиски (более 60 секунд)
    const cleanupTime = now - 60;
    db.run(`UPDATE players SET is_searching_duel = 0, search_started_at = 0 
            WHERE is_searching_duel = 1 AND search_started_at < ?`, [cleanupTime]);
    
    // Ищем игроков в очереди с похожим MMR
    db.get(`SELECT user_id, mmr, username FROM players 
            WHERE user_id != ? 
            AND is_searching_duel = 1 
            AND race_id IS NOT NULL
            AND mmr BETWEEN ? AND ?
            ORDER BY search_started_at ASC
            LIMIT 1`, 
      [userId, minMMR, maxMMR], (err, opponent) => {
        
        if (err) {
          console.error('Ошибка поиска в очереди:', err);
          return callback(err);
        }
        
        if (opponent) {
          // НАШЛИ ПРОТИВНИКА В ОЧЕРЕДИ!
          console.log(`✅ Матч найден: ${userId} vs ${opponent.user_id}`);
          
          // Убираем обоих из очереди
          db.run(`UPDATE players SET is_searching_duel = 0, search_started_at = 0 
                  WHERE user_id IN (?, ?)`, [userId, opponent.user_id], (err) => {
            if (err) console.error('Ошибка очистки очереди:', err);
            
            // Сохраняем матч для ОБОИХ игроков
            activeMatches.set(userId, { opponentId: opponent.user_id, timestamp: now });
            activeMatches.set(opponent.user_id, { opponentId: userId, timestamp: now });
            
            console.log(`💾 Матч сохранен для обоих игроков`);
            
            // Запускаем дуэль
            startDuel(userId, opponent.user_id, callback);
          });
        } else {
          // Не нашли - ищем в расширенном диапазоне
          db.get(`SELECT user_id, mmr, username FROM players 
                  WHERE user_id != ? 
                  AND is_searching_duel = 1 
                  AND race_id IS NOT NULL
                  ORDER BY search_started_at ASC
                  LIMIT 1`, 
            [userId], (err, anyOpponent) => {
              
              if (err) {
                console.error('Ошибка расширенного поиска:', err);
                return callback(err);
              }
              
              if (anyOpponent) {
                // Нашли в расширенном диапазоне
                console.log(`✅ Матч найден (расширенный): ${userId} vs ${anyOpponent.user_id}`);
                
                db.run(`UPDATE players SET is_searching_duel = 0, search_started_at = 0 
                        WHERE user_id IN (?, ?)`, [userId, anyOpponent.user_id], (err) => {
                  if (err) console.error('Ошибка очистки очереди:', err);
                  
                  // Сохраняем матч для ОБОИХ игроков
                  activeMatches.set(userId, { opponentId: anyOpponent.user_id, timestamp: now });
                  activeMatches.set(anyOpponent.user_id, { opponentId: userId, timestamp: now });
                  
                  console.log(`💾 Матч сохранен для обоих игроков`);
                  
                  startDuel(userId, anyOpponent.user_id, callback);
                });
              } else {
                // Никого нет в очереди - добавляем себя
                console.log(`🔍 Игрок ${userId} добавлен в очередь поиска`);
                
                db.run(`UPDATE players SET is_searching_duel = 1, search_started_at = ? 
                        WHERE user_id = ?`, [now, userId], (err) => {
                  if (err) {
                    console.error('Ошибка добавления в очередь:', err);
                    return callback(err);
                  }
                  
                  // Возвращаем статус "в поиске"
                  callback(null, { type: 'searching', startedAt: now });
                });
              }
            });
        }
      });
  });
}

// Проверить есть ли активный матч для игрока
function checkActiveMatch(userId, callback) {
  const match = activeMatches.get(userId);
  
  if (!match) {
    return callback(null, null);
  }
  
  // Получаем данные противника
  db.get(`SELECT * FROM players WHERE user_id = ?`, [match.opponentId], (err, opponent) => {
    if (err) return callback(err);
    
    callback(null, {
      opponentId: match.opponentId,
      opponent: opponent
    });
  });
}

// Очистить активный матч
function clearActiveMatch(userId) {
  activeMatches.delete(userId);
  console.log(`🗑️ Матч очищен для игрока ${userId}`);
}

// Запустить дуэль между найденными игроками
function startDuel(player1Id, player2Id, callback1) {
  // Получаем данные обоих игроков
  db.get(`SELECT * FROM players WHERE user_id = ?`, [player1Id], (err, p1) => {
    if (err) return callback1(err);
    
    db.get(`SELECT * FROM players WHERE user_id = ?`, [player2Id], (err, p2) => {
      if (err) return callback1(err);
      
      // Создаем дуэль
      const duelData = {
        player1: p1,
        player2: p2,
        player1Id: player1Id,
        player2Id: player2Id
      };
      
      // Уведомляем игрока
      callback1(null, { type: 'duel_found', duel: duelData, isPlayer1: true });
    });
  });
}

// Завершить дуэль и обновить MMR
function finishDuel(winnerId, loserId, callback) {
  // Получаем данные игроков
  db.get(`SELECT mmr FROM players WHERE user_id = ?`, [winnerId], (err, winner) => {
    if (err) return callback(err);
    
    db.get(`SELECT mmr FROM players WHERE user_id = ?`, [loserId], (err, loser) => {
      if (err) return callback(err);
      
      const winnerMMR = winner.mmr || MMR_CONFIG.STARTING_MMR;
      const loserMMR = loser.mmr || MMR_CONFIG.STARTING_MMR;
      
      // Рассчитываем изменения MMR
      const winnerMMRChange = calculateMMRChange(winnerMMR, loserMMR, true);
      const loserMMRChange = calculateMMRChange(winnerMMR, loserMMR, false);
      
      const newWinnerMMR = Math.max(0, winnerMMR + winnerMMRChange);
      const newLoserMMR = Math.max(0, loserMMR + loserMMRChange);
      
      // Обновляем MMR в базе
      db.run(`UPDATE players SET mmr = ?, wins = wins + 1 WHERE user_id = ?`, [newWinnerMMR, winnerId]);
      db.run(`UPDATE players SET mmr = ?, losses = losses + 1 WHERE user_id = ?`, [newLoserMMR, loserId]);
      
      callback(null, {
        winnerMMRChange: winnerMMRChange,
        loserMMRChange: loserMMRChange,
        newWinnerMMR: newWinnerMMR,
        newLoserMMR: newLoserMMR
      });
    });
  });
}

// Получить топ игроков по MMR
function getMMRLeaderboard(limit = 10, callback) {
  const config = require('./config');
  db.all(`SELECT user_id, username, mmr, wins, losses 
          FROM players 
          WHERE mmr > 0 AND username != ?
          ORDER BY mmr DESC 
          LIMIT ?`, [config.ADMIN_USERNAME, limit], callback);
}

// Получить MMR игрока
function getPlayerMMR(userId, callback) {
  db.get(`SELECT mmr, wins, losses FROM players WHERE user_id = ?`, [userId], callback);
}

module.exports = {
  startMatchmaking,
  checkActiveMatch,
  clearActiveMatch,
  finishDuel,
  getMMRLeaderboard,
  getPlayerMMR,
  MMR_CONFIG
};