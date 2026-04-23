const db = require('./database_simple');

// Список зелий
const POTIONS = [
  {
    id: 1,
    name: 'Малое зелье жизни',
    description: 'Восстанавливает 30% HP',
    type: 'heal',
    heal_amount: 30, // процент от макс HP
    price: 100
  },
  {
    id: 2,
    name: 'Большое зелье жизни',
    description: 'Восстанавливает 60% HP',
    type: 'heal',
    heal_amount: 60, // процент от макс HP
    price: 250
  }
];

// Инициализация зелий в базе
function initializePotions() {
  POTIONS.forEach(potion => {
    db.run(`INSERT OR IGNORE INTO potions (id, name, description, type, heal_amount, price)
            VALUES (?, ?, ?, ?, ?, ?)`,
      [potion.id, potion.name, potion.description, potion.type, potion.heal_amount, potion.price],
      (err) => {
        if (err) console.error(`Ошибка добавления зелья ${potion.name}:`, err);
      }
    );
  });
  console.log('✅ Зелья инициализированы');
}

// Получить все зелья
function getAllPotions(callback) {
  db.all(`SELECT * FROM potions ORDER BY price ASC`, callback);
}

// Получить зелье по ID
function getPotionById(potionId, callback) {
  db.get(`SELECT * FROM potions WHERE id = ?`, [potionId], callback);
}

// Получить инвентарь зелий игрока
function getPlayerPotions(playerId, callback) {
  db.all(`SELECT pp.*, p.name, p.description, p.type, p.heal_amount, p.price
          FROM player_potions pp
          JOIN potions p ON pp.potion_id = p.id
          WHERE pp.player_id = ? AND pp.quantity > 0
          ORDER BY p.price ASC`, [playerId], callback);
}

// Купить зелье
function buyPotion(playerId, potionId, quantity, callback) {
  // Проверяем существование зелья
  getPotionById(potionId, (err, potion) => {
    if (err || !potion) return callback(err || new Error('Зелье не найдено'));
    
    const totalCost = potion.price * quantity;
    
    // Проверяем золото игрока
    db.get(`SELECT gold FROM players WHERE user_id = ?`, [playerId], (err, player) => {
      if (err || !player) return callback(err || new Error('Игрок не найден'));
      
      if (player.gold < totalCost) {
        return callback(new Error(`Недостаточно золота! Нужно: ${totalCost}`));
      }
      
      // Списываем золото
      db.run(`UPDATE players SET gold = gold - ? WHERE user_id = ?`, [totalCost, playerId], (err) => {
        if (err) return callback(err);
        
        // Добавляем зелье в инвентарь или увеличиваем количество
        db.run(`INSERT INTO player_potions (player_id, potion_id, quantity)
                VALUES (?, ?, ?)
                ON CONFLICT(player_id, potion_id) 
                DO UPDATE SET quantity = quantity + ?`,
          [playerId, potionId, quantity, quantity], (err) => {
            if (err) return callback(err);
            callback(null, { potion, quantity, totalCost });
          });
      });
    });
  });
}

// Экипировать зелье
function equipPotion(playerId, potionId, callback) {
  // Проверяем что у игрока есть это зелье
  db.get(`SELECT * FROM player_potions WHERE player_id = ? AND potion_id = ? AND quantity > 0`,
    [playerId, potionId], (err, playerPotion) => {
      if (err) return callback(err);
      if (!playerPotion) return callback(new Error('У вас нет этого зелья'));
      
      // Экипируем зелье
      db.run(`UPDATE players SET equipped_potion_id = ? WHERE user_id = ?`,
        [potionId, playerId], callback);
    });
}

// Снять зелье
function unequipPotion(playerId, callback) {
  db.run(`UPDATE players SET equipped_potion_id = NULL WHERE user_id = ?`, [playerId], callback);
}

// Использовать зелье в бою
function usePotion(playerId, callback) {
  // Получаем экипированное зелье
  db.get(`SELECT p.equipped_potion_id, pot.* 
          FROM players p
          LEFT JOIN potions pot ON p.equipped_potion_id = pot.id
          WHERE p.user_id = ?`, [playerId], (err, result) => {
    if (err) return callback(err);
    if (!result.equipped_potion_id) return callback(new Error('Нет экипированного зелья'));
    
    const potionId = result.equipped_potion_id;
    
    // Проверяем количество
    db.get(`SELECT quantity FROM player_potions WHERE player_id = ? AND potion_id = ?`,
      [playerId, potionId], (err, playerPotion) => {
        if (err) return callback(err);
        if (!playerPotion || playerPotion.quantity <= 0) {
          // Автоматически снимаем зелье если закончилось
          unequipPotion(playerId, () => {});
          return callback(new Error('Зелье закончилось'));
        }
        
        // Уменьшаем количество
        db.run(`UPDATE player_potions SET quantity = quantity - 1 
                WHERE player_id = ? AND potion_id = ?`,
          [playerId, potionId], (err) => {
            if (err) return callback(err);
            
            // Возвращаем информацию о зелье
            callback(null, {
              id: potionId,
              name: result.name,
              type: result.type,
              heal_amount: result.heal_amount
            });
          });
      });
  });
}

// Получить количество конкретного зелья
function getPotionQuantity(playerId, potionId, callback) {
  db.get(`SELECT quantity FROM player_potions WHERE player_id = ? AND potion_id = ?`,
    [playerId, potionId], (err, result) => {
      if (err) return callback(err);
      callback(null, result ? result.quantity : 0);
    });
}

module.exports = {
  POTIONS,
  initializePotions,
  getAllPotions,
  getPotionById,
  getPlayerPotions,
  buyPotion,
  equipPotion,
  unequipPotion,
  usePotion,
  getPotionQuantity
};
