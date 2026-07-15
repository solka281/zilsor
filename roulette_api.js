const express = require('express');
const router = express.Router();
const db = require('./database_simple');

// Инициализация таблиц рулетки
function initRouletteDB() {
  db.run(`CREATE TABLE IF NOT EXISTS roulette_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT DEFAULT 'waiting',
    winner_id INTEGER,
    winner_username TEXT,
    total_value INTEGER DEFAULT 0,
    spin_result REAL,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    closed_at INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS roulette_bets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER,
    user_id INTEGER,
    username TEXT,
    gold INTEGER DEFAULT 0,
    crystals INTEGER DEFAULT 0,
    items_value INTEGER DEFAULT 0,
    total_value INTEGER DEFAULT 0,
    items TEXT DEFAULT '[]',
    color TEXT,
    FOREIGN KEY (room_id) REFERENCES roulette_rooms(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS roulette_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bet_id INTEGER,
    room_id INTEGER,
    user_id INTEGER,
    inventory_id INTEGER,
    item_name TEXT,
    item_rarity TEXT,
    item_value INTEGER,
    FOREIGN KEY (bet_id) REFERENCES roulette_bets(id)
  )`);

  console.log('🎰 Рулетка инициализирована');
}

const PLAYER_COLORS = [
  '#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6',
  '#1abc9c','#e67e22','#e91e63','#00bcd4','#8bc34a'
];

// Получить или создать активную комнату
router.get('/room', (req, res) => {
  db.get(`SELECT * FROM roulette_rooms WHERE status = 'waiting' ORDER BY id DESC LIMIT 1`, (err, room) => {
    if (err) return res.status(500).json({ error: err.message });
    if (room) {
      loadRoomBets(room, res);
    } else {
      // Создаём новую комнату
      db.run(`INSERT INTO roulette_rooms (status) VALUES ('waiting')`, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get(`SELECT * FROM roulette_rooms WHERE id = ?`, [this.lastID], (err, newRoom) => {
          loadRoomBets(newRoom, res);
        });
      });
    }
  });
});

function loadRoomBets(room, res) {
  db.all(`SELECT * FROM roulette_bets WHERE room_id = ?`, [room.id], (err, bets) => {
    if (err) return res.status(500).json({ error: err.message });
    bets = bets || [];
    const totalValue = bets.reduce((s, b) => s + b.total_value, 0);
    res.json({ room, bets, totalValue });
  });
}

// Сделать ставку
router.post('/bet', (req, res) => {
  const { userId, username, gold, crystals, inventoryIds } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const goldBet = parseInt(gold) || 0;
  const crystalsBet = parseInt(crystals) || 0;
  const items = inventoryIds || [];

  if (goldBet < 0 || crystalsBet < 0) return res.status(400).json({ error: 'Нельзя ставить отрицательные значения' });
  if (goldBet === 0 && crystalsBet === 0 && items.length === 0) {
    return res.status(400).json({ error: 'Нужно поставить хотя бы что-нибудь' });
  }

  // Получаем активную комнату
  db.get(`SELECT * FROM roulette_rooms WHERE status = 'waiting' ORDER BY id DESC LIMIT 1`, (err, room) => {
    if (err || !room) return res.status(400).json({ error: 'Нет активной комнаты' });

    // Проверяем что игрок ещё не ставил
    db.get(`SELECT * FROM roulette_bets WHERE room_id = ? AND user_id = ?`, [room.id, userId], (err, existing) => {
      if (existing) return res.status(400).json({ error: 'Вы уже сделали ставку в этой комнате' });

      // Проверяем баланс игрока
      db.get(`SELECT gold, crystals FROM players WHERE user_id = ?`, [userId], (err, player) => {
        if (err || !player) return res.status(400).json({ error: 'Игрок не найден' });
        if (player.gold < goldBet) return res.status(400).json({ error: `Недостаточно золота (у вас ${player.gold})` });
        if (player.crystals < crystalsBet) return res.status(400).json({ error: `Недостаточно кристаллов (у вас ${player.crystals})` });

        // Проверяем предметы
        let itemsValue = 0;
        const rarityValues = { COMMON: 50, RARE: 150, EPIC: 400, MYTHIC: 1000, LEGENDARY: 2500, SECRET: 5000 };

        const checkItems = (callback) => {
          if (items.length === 0) return callback(null, []);
          let checked = 0;
          const validItems = [];
          for (const invId of items) {
            db.get(`SELECT inv.id, inv.equipped, i.name, i.rarity FROM inventory inv
                    JOIN items i ON inv.item_id = i.id
                    WHERE inv.id = ? AND inv.player_id = ?`, [invId, userId], (err, item) => {
              if (!err && item && !item.equipped) {
                const val = rarityValues[item.rarity] || 50;
                itemsValue += val;
                validItems.push({ id: item.id, name: item.name, rarity: item.rarity, value: val });
              }
              checked++;
              if (checked === items.length) callback(null, validItems);
            });
          }
        };

        checkItems((err, validItems) => {
          // Назначаем цвет игроку
          db.get(`SELECT COUNT(*) as cnt FROM roulette_bets WHERE room_id = ?`, [room.id], (err, cnt) => {
            const colorIdx = (cnt ? cnt.cnt : 0) % PLAYER_COLORS.length;
            const color = PLAYER_COLORS[colorIdx];

            const totalValue = goldBet + (crystalsBet * 5) + itemsValue; // кристалл = 5 золота по ценности
            if (totalValue === 0) return res.status(400).json({ error: 'Суммарная ценность ставки равна 0' });

            // Списываем ресурсы
            db.run(`UPDATE players SET gold = gold - ?, crystals = crystals - ? WHERE user_id = ?`,
              [goldBet, crystalsBet, userId], (err) => {
                if (err) return res.status(500).json({ error: err.message });

                // Блокируем предметы (отмечаем как в ставке)
                for (const item of validItems) {
                  db.run(`UPDATE inventory SET equipped = 2 WHERE id = ?`, [item.id]); // 2 = в ставке
                }

                // Записываем ставку
                db.run(`INSERT INTO roulette_bets (room_id, user_id, username, gold, crystals, items_value, total_value, items, color)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [room.id, userId, username, goldBet, crystalsBet, itemsValue, totalValue,
                   JSON.stringify(validItems), color], function(err) {
                    if (err) return res.status(500).json({ error: err.message });

                    const betId = this.lastID;
                    for (const item of validItems) {
                      db.run(`INSERT INTO roulette_items (bet_id, room_id, user_id, inventory_id, item_name, item_rarity, item_value)
                              VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [betId, room.id, userId, item.id, item.name, item.rarity, item.value]);
                    }

                    // Обновляем total_value комнаты
                    db.run(`UPDATE roulette_rooms SET total_value = total_value + ? WHERE id = ?`, [totalValue, room.id]);

                    res.json({ success: true, betId, totalValue, color });
                  });
              });
          });
        });
      });
    });
  });
});

// Крутить рулетку (только когда >= 2 игроков)
router.post('/spin/:roomId', (req, res) => {
  const { roomId } = req.params;

  db.get(`SELECT * FROM roulette_rooms WHERE id = ? AND status = 'waiting'`, [roomId], (err, room) => {
    if (err || !room) return res.status(400).json({ error: 'Комната не найдена или уже закрыта' });

    db.all(`SELECT * FROM roulette_bets WHERE room_id = ?`, [roomId], (err, bets) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!bets || bets.length < 2) return res.status(400).json({ error: 'Нужно минимум 2 игрока' });

      const totalValue = bets.reduce((s, b) => s + b.total_value, 0);
      const spinResult = Math.random(); // 0..1
      
      // Определяем победителя
      let cumulative = 0;
      let winner = null;
      for (const bet of bets) {
        cumulative += bet.total_value / totalValue;
        if (spinResult <= cumulative) {
          winner = bet;
          break;
        }
      }
      if (!winner) winner = bets[bets.length - 1];

      // Закрываем комнату
      db.run(`UPDATE roulette_rooms SET status = 'closed', winner_id = ?, winner_username = ?, 
              spin_result = ?, closed_at = strftime('%s','now') WHERE id = ?`,
        [winner.user_id, winner.username, spinResult, roomId], (err) => {
          if (err) return res.status(500).json({ error: err.message });

          // Выдаём победителю золото и кристаллы от всех
          let totalGold = 0, totalCrystals = 0;
          for (const bet of bets) {
            totalGold += bet.gold;
            totalCrystals += bet.crystals;
          }

          // Передаём все предметы победителю
          db.all(`SELECT * FROM roulette_items WHERE room_id = ?`, [roomId], (err, allItems) => {
            if (allItems) {
              for (const item of allItems) {
                if (item.user_id !== parseInt(winner.user_id)) {
                  db.run(`UPDATE inventory SET player_id = ?, equipped = 0 WHERE id = ?`,
                    [winner.user_id, item.inventory_id]);
                } else {
                  // Разблокируем собственные предметы победителя
                  db.run(`UPDATE inventory SET equipped = 0 WHERE id = ?`, [item.inventory_id]);
                }
              }
            }

            db.run(`UPDATE players SET gold = gold + ?, crystals = crystals + ? WHERE user_id = ?`,
              [totalGold, totalCrystals, winner.user_id], (err) => {
                res.json({
                  success: true,
                  winner,
                  spinResult,
                  totalGold,
                  totalCrystals,
                  totalItems: allItems ? allItems.length : 0,
                  bets
                });

                // Уведомляем победителя через бот
                try {
                  const telegramBot = global.telegramBot;
                  if (telegramBot) {
                    telegramBot.sendMessage(winner.user_id,
                      `🎰 Ты выиграл рулетку!\n\n` +
                      `💰 +${totalGold} золота\n` +
                      `💎 +${totalCrystals} кристаллов\n` +
                      `🎒 +${allItems ? allItems.filter(i => i.user_id !== parseInt(winner.user_id)).length : 0} предметов`
                    ).catch(() => {});
                  }
                } catch(e) {}
              });
          });
        });
    });
  });
});

// История последних комнат
router.get('/history', (req, res) => {
  db.all(`SELECT r.*, rb.username as winner_name 
          FROM roulette_rooms r
          LEFT JOIN roulette_bets rb ON r.winner_id = rb.user_id AND r.id = rb.room_id
          WHERE r.status = 'closed'
          ORDER BY r.closed_at DESC LIMIT 20`, (err, rooms) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rooms || []);
  });
});

// Баланс игрока
router.get('/player/:userId', (req, res) => {
  db.get(`SELECT user_id, username, gold, crystals FROM players WHERE user_id = ?`,
    [req.params.userId], (err, player) => {
      if (err || !player) return res.status(404).json({ error: 'Не найден' });
      res.json(player);
    });
});

// Инвентарь игрока для ставки
router.get('/inventory/:userId', (req, res) => {
  db.all(`SELECT inv.id as inv_id, inv.equipped, i.name, i.rarity, i.slot,
                 i.power_bonus, i.attack_bonus, i.defense_bonus
          FROM inventory inv
          JOIN items i ON inv.item_id = i.id
          WHERE inv.player_id = ? AND inv.equipped = 0
          ORDER BY i.rarity DESC`, [req.params.userId], (err, items) => {
    if (err) return res.status(500).json({ error: err.message });
    const rarityValues = { COMMON: 50, RARE: 150, EPIC: 400, MYTHIC: 1000, LEGENDARY: 2500, SECRET: 5000 };
    const result = (items || []).map(i => ({ ...i, value: rarityValues[i.rarity] || 50 }));
    res.json(result);
  });
});

module.exports = { router, initRouletteDB };
