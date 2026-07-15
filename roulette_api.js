const express = require('express');
const router = express.Router();
const db = require('./database_simple');

const PLAYER_COLORS = [
  '#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6',
  '#1abc9c','#e67e22','#e91e63','#00bcd4','#8bc34a'
];

const RARITY_VALUES = {
  COMMON: 50, RARE: 150, EPIC: 400,
  MYTHIC: 1000, LEGENDARY: 2500, SECRET: 5000
};

function initRouletteDB() {
  db.serialize(() => {
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
      color TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS roulette_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bet_id INTEGER,
      room_id INTEGER,
      user_id INTEGER,
      inventory_id INTEGER,
      item_name TEXT,
      item_rarity TEXT,
      item_value INTEGER
    )`);
  });
  console.log('🎰 Рулетка инициализирована');
}

// Утилита: получить или создать активную комнату
function getOrCreateRoom(callback) {
  db.get(`SELECT * FROM roulette_rooms WHERE status='waiting' ORDER BY id DESC LIMIT 1`, (err, room) => {
    if (err) return callback(err);
    if (room) return callback(null, room);
    db.run(`INSERT INTO roulette_rooms (status) VALUES ('waiting')`, function(err) {
      if (err) return callback(err);
      db.get(`SELECT * FROM roulette_rooms WHERE id=?`, [this.lastID], callback);
    });
  });
}

// GET /room — текущая комната
router.get('/room', (req, res) => {
  getOrCreateRoom((err, room) => {
    if (err) return res.status(500).json({ error: err.message });
    db.all(`SELECT * FROM roulette_bets WHERE room_id=?`, [room.id], (err, bets) => {
      if (err) return res.status(500).json({ error: err.message });
      bets = bets || [];
      bets.forEach(b => { try { b.items = JSON.parse(b.items || '[]'); } catch(e) { b.items = []; } });
      const totalValue = bets.reduce((s, b) => s + b.total_value, 0);
      res.json({ room, bets, totalValue });
    });
  });
});

// GET /player/:userId
router.get('/player/:userId', (req, res) => {
  db.get(`SELECT user_id, username, gold, crystals FROM players WHERE user_id=?`,
    [req.params.userId], (err, player) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!player) return res.status(404).json({ error: 'Игрок не найден' });
      res.json(player);
    });
});

// GET /inventory/:userId
router.get('/inventory/:userId', (req, res) => {
  db.all(`SELECT inv.id as inv_id, inv.equipped, i.name, i.rarity, i.slot
          FROM inventory inv
          JOIN items i ON inv.item_id = i.id
          WHERE inv.player_id=? AND inv.equipped=0
          ORDER BY i.rarity DESC`, [req.params.userId], (err, items) => {
    if (err) return res.status(500).json({ error: err.message });
    const result = (items || []).map(i => ({ ...i, value: RARITY_VALUES[i.rarity] || 50 }));
    res.json(result);
  });
});

// POST /bet
router.post('/bet', (req, res) => {
  const { userId, username, gold, crystals, inventoryIds } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId обязателен' });

  const uid = parseInt(userId);
  const goldBet = Math.max(0, parseInt(gold) || 0);
  const crystalsBet = Math.max(0, parseInt(crystals) || 0);
  const itemIds = Array.isArray(inventoryIds) ? inventoryIds.map(Number) : [];

  if (goldBet === 0 && crystalsBet === 0 && itemIds.length === 0) {
    return res.status(400).json({ error: 'Поставьте хотя бы что-нибудь' });
  }

  getOrCreateRoom((err, room) => {
    if (err) return res.status(500).json({ error: err.message });

    // Уже ставил?
    db.get(`SELECT id FROM roulette_bets WHERE room_id=? AND user_id=?`, [room.id, uid], (err, existing) => {
      if (existing) return res.status(400).json({ error: 'Вы уже сделали ставку в этой комнате' });

      // Проверяем баланс
      db.get(`SELECT gold, crystals FROM players WHERE user_id=?`, [uid], (err, player) => {
        if (err || !player) return res.status(400).json({ error: 'Игрок не найден' });
        if (player.gold < goldBet) return res.status(400).json({ error: `Нужно ${goldBet}💰, у вас ${player.gold}💰` });
        if (player.crystals < crystalsBet) return res.status(400).json({ error: `Нужно ${crystalsBet}💎, у вас ${player.crystals}💎` });

        // Проверяем предметы
        const validateItems = (cb) => {
          if (itemIds.length === 0) return cb([]);
          const valid = [];
          let done = 0;
          for (const invId of itemIds) {
            db.get(`SELECT inv.id, i.name, i.rarity FROM inventory inv
                    JOIN items i ON inv.item_id=i.id
                    WHERE inv.id=? AND inv.player_id=? AND inv.equipped=0`,
              [invId, uid], (err, item) => {
                if (!err && item) valid.push({ id: item.id, name: item.name, rarity: item.rarity, value: RARITY_VALUES[item.rarity] || 50 });
                if (++done === itemIds.length) cb(valid);
              });
          }
        };

        validateItems((validItems) => {
          const itemsValue = validItems.reduce((s, i) => s + i.value, 0);
          const totalValue = goldBet + crystalsBet * 5 + itemsValue;
          if (totalValue === 0) return res.status(400).json({ error: 'Ценность ставки равна 0' });

          // Цвет игрока
          db.get(`SELECT COUNT(*) as cnt FROM roulette_bets WHERE room_id=?`, [room.id], (err, cnt) => {
            const color = PLAYER_COLORS[(cnt ? cnt.cnt : 0) % PLAYER_COLORS.length];

            // Списываем ресурсы
            db.run(`UPDATE players SET gold=gold-?, crystals=crystals-? WHERE user_id=?`,
              [goldBet, crystalsBet, uid], (err) => {
                if (err) return res.status(500).json({ error: err.message });

                // Блокируем предметы (equipped=2 означает "в ставке")
                validItems.forEach(item => db.run(`UPDATE inventory SET equipped=2 WHERE id=?`, [item.id]));

                // Сохраняем ставку
                db.run(`INSERT INTO roulette_bets (room_id,user_id,username,gold,crystals,items_value,total_value,items,color)
                        VALUES (?,?,?,?,?,?,?,?,?)`,
                  [room.id, uid, username || String(uid), goldBet, crystalsBet, itemsValue, totalValue,
                   JSON.stringify(validItems), color],
                  function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    const betId = this.lastID;
                    validItems.forEach(item => {
                      db.run(`INSERT INTO roulette_items (bet_id,room_id,user_id,inventory_id,item_name,item_rarity,item_value)
                              VALUES (?,?,?,?,?,?,?)`,
                        [betId, room.id, uid, item.id, item.name, item.rarity, item.value]);
                    });
                    db.run(`UPDATE roulette_rooms SET total_value=total_value+? WHERE id=?`, [totalValue, room.id]);
                    res.json({ success: true, totalValue, color });
                  });
              });
          });
        });
      });
    });
  });
});

// POST /spin/:roomId
router.post('/spin/:roomId', (req, res) => {
  const roomId = parseInt(req.params.roomId);

  db.get(`SELECT * FROM roulette_rooms WHERE id=? AND status='waiting'`, [roomId], (err, room) => {
    if (err || !room) return res.status(400).json({ error: 'Комната не найдена или уже закрыта' });

    db.all(`SELECT * FROM roulette_bets WHERE room_id=?`, [roomId], (err, bets) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!bets || bets.length < 2) return res.status(400).json({ error: 'Нужно минимум 2 игрока' });

      bets.forEach(b => { try { b.items = JSON.parse(b.items || '[]'); } catch(e) { b.items = []; } });

      const totalValue = bets.reduce((s, b) => s + b.total_value, 0);
      const spinResult = Math.random();

      // Выбираем победителя пропорционально ставке
      let cumulative = 0;
      let winner = bets[bets.length - 1];
      for (const bet of bets) {
        cumulative += bet.total_value / totalValue;
        if (spinResult <= cumulative) { winner = bet; break; }
      }

      // Закрываем комнату
      db.run(`UPDATE roulette_rooms SET status='closed', winner_id=?, winner_username=?,
              spin_result=?, closed_at=strftime('%s','now') WHERE id=?`,
        [winner.user_id, winner.username, spinResult, roomId], (err) => {
          if (err) return res.status(500).json({ error: err.message });

          const totalGold = bets.reduce((s, b) => s + b.gold, 0);
          const totalCrystals = bets.reduce((s, b) => s + b.crystals, 0);

          // Передаём все предметы победителю
          db.all(`SELECT * FROM roulette_items WHERE room_id=?`, [roomId], (err, allItems) => {
            allItems = allItems || [];
            allItems.forEach(item => {
              if (item.user_id !== winner.user_id) {
                db.run(`UPDATE inventory SET player_id=?, equipped=0 WHERE id=?`,
                  [winner.user_id, item.inventory_id]);
              } else {
                db.run(`UPDATE inventory SET equipped=0 WHERE id=?`, [item.inventory_id]);
              }
            });

            // Выдаём золото и кристаллы победителю
            db.run(`UPDATE players SET gold=gold+?, crystals=crystals+? WHERE user_id=?`,
              [totalGold, totalCrystals, winner.user_id], () => {
                // Уведомляем через бот
                try {
                  if (global.telegramBot) {
                    global.telegramBot.sendMessage(winner.user_id,
                      `🎰 *Ты выиграл рулетку!*\n\n` +
                      `💰 +${totalGold} золота\n` +
                      `💎 +${totalCrystals} кристаллов\n` +
                      `🎒 +${allItems.filter(i => i.user_id !== winner.user_id).length} предметов`,
                      { parse_mode: 'Markdown' }
                    ).catch(() => {});
                  }
                } catch(e) {}

                res.json({
                  success: true, winner, spinResult,
                  totalGold, totalCrystals,
                  wonItems: allItems.filter(i => i.user_id !== winner.user_id).length,
                  bets
                });
              });
          });
        });
    });
  });
});

// GET /history
router.get('/history', (req, res) => {
  db.all(`SELECT r.id, r.total_value, r.winner_username, r.closed_at
          FROM roulette_rooms r
          WHERE r.status='closed'
          ORDER BY r.closed_at DESC LIMIT 20`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

module.exports = { router, initRouletteDB };
