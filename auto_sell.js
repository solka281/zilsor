// Система автопродажи предметов по редкости
const db = require('./database_simple');

// Цены продажи по редкости (в золоте) - 50% от базовой цены
const SELL_PRICES = {
  'COMMON': 25,      // 50 * 0.5
  'RARE': 75,        // 150 * 0.5
  'EPIC': 200,       // 400 * 0.5
  'MYTHIC': 500,     // 1000 * 0.5
  'LEGENDARY': 1250, // 2500 * 0.5
  'SECRET': 2500     // 5000 * 0.5
};

// Получить настройки автопродажи игрока
function getAutoSellSettings(playerId, callback) {
  db.get(`SELECT * FROM auto_sell_settings WHERE player_id = ?`, [playerId], (err, settings) => {
    if (err) return callback(err);
    
    // Если настроек нет, создаем дефолтные
    if (!settings) {
      db.run(`INSERT INTO auto_sell_settings (player_id) VALUES (?)`, [playerId], (err) => {
        if (err) return callback(err);
        
        // Возвращаем дефолтные настройки
        callback(null, {
          player_id: playerId,
          common_enabled: 0,
          rare_enabled: 0,
          epic_enabled: 0,
          mythic_enabled: 0,
          legendary_enabled: 0
        });
      });
    } else {
      callback(null, settings);
    }
  });
}

// Обновить настройки автопродажи
function updateAutoSellSettings(playerId, rarity, enabled, callback) {
  const column = `${rarity.toLowerCase()}_enabled`;
  const value = enabled ? 1 : 0;
  
  console.log(`[AUTO_SELL] Обновление настроек: player=${playerId}, rarity=${rarity}, enabled=${enabled}, column=${column}`);
  
  // Сначала проверяем существует ли запись
  getAutoSellSettings(playerId, (err, settings) => {
    if (err) return callback(err);
    
    // Теперь обновляем
    db.run(`UPDATE auto_sell_settings SET ${column} = ? WHERE player_id = ?`, 
      [value, playerId], (err) => {
        if (err) {
          console.error('[AUTO_SELL] Ошибка обновления:', err);
          return callback(err);
        }
        console.log(`[AUTO_SELL] Настройки обновлены успешно`);
        callback(null, true);
      });
  });
}

// Проверить и автоматически продать предмет
function checkAutoSell(playerId, itemId, callback) {
  console.log(`[AUTO_SELL] Проверка автопродажи: player=${playerId}, inventoryId=${itemId}`);
  
  // Получаем информацию о предмете
  db.get(`SELECT i.*, inv.id as inventory_id 
          FROM inventory inv 
          JOIN items i ON inv.item_id = i.id 
          WHERE inv.id = ? AND inv.player_id = ?`, 
    [itemId, playerId], (err, item) => {
      if (err || !item) {
        console.error('[AUTO_SELL] Предмет не найден:', err);
        return callback(err || new Error('Предмет не найден'));
      }
      
      console.log(`[AUTO_SELL] Предмет найден: ${item.name} (${item.rarity})`);
      
      // Получаем настройки автопродажи
      getAutoSellSettings(playerId, (err, settings) => {
        if (err) {
          console.error('[AUTO_SELL] Ошибка получения настроек:', err);
          return callback(err);
        }
        
        const rarity = item.rarity.toUpperCase();
        const rarityEnabled = settings[`${rarity.toLowerCase()}_enabled`];
        
        console.log(`[AUTO_SELL] Настройки: rarity=${rarity}, enabled=${rarityEnabled}`);
        
        if (rarityEnabled) {
          // Продаем предмет
          console.log(`[AUTO_SELL] Продаем предмет автоматически`);
          sellItem(playerId, item, callback);
        } else {
          // Автопродажа не включена для этой редкости
          console.log(`[AUTO_SELL] Автопродажа отключена для ${rarity}`);
          callback(null, { sold: false, reason: 'auto_sell_disabled' });
        }
      });
    });
}

// Продать предмет
function sellItem(playerId, item, callback) {
  const sellPrice = SELL_PRICES[item.rarity.toUpperCase()] || 5;
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Удаляем предмет из инвентаря
    db.run(`DELETE FROM inventory WHERE id = ?`, [item.inventory_id], (err) => {
      if (err) {
        db.run('ROLLBACK');
        return callback(err);
      }
      
      // Добавляем золото игроку
      db.run(`UPDATE players SET gold = gold + ? WHERE user_id = ?`, 
        [sellPrice, playerId], (err) => {
          if (err) {
            db.run('ROLLBACK');
            return callback(err);
          }
          
          db.run('COMMIT');
          callback(null, {
            sold: true,
            item_name: item.name,
            rarity: item.rarity,
            price: sellPrice
          });
        });
    });
  });
}

// Автопродажа всех предметов в инвентаре по настройкам
function autoSellInventory(playerId, callback) {
  // Получаем настройки автопродажи
  getAutoSellSettings(playerId, (err, settings) => {
    if (err) return callback(err);
    
    // Собираем включенные редкости
    const enabledRarities = [];
    if (settings.common_enabled) enabledRarities.push('COMMON');
    if (settings.rare_enabled) enabledRarities.push('RARE');
    if (settings.epic_enabled) enabledRarities.push('EPIC');
    if (settings.mythic_enabled) enabledRarities.push('MYTHIC');
    if (settings.legendary_enabled) enabledRarities.push('LEGENDARY');
    
    if (enabledRarities.length === 0) {
      return callback(null, { sold_items: [], total_gold: 0 });
    }
    
    // Получаем все предметы подходящих редкостей (не экипированные)
    const placeholders = enabledRarities.map(() => '?').join(',');
    db.all(`SELECT i.*, inv.id as inventory_id 
            FROM inventory inv 
            JOIN items i ON inv.item_id = i.id 
            WHERE inv.player_id = ? AND inv.equipped = 0 AND i.rarity IN (${placeholders})`,
      [playerId, ...enabledRarities], (err, items) => {
        if (err) return callback(err);
        
        if (items.length === 0) {
          return callback(null, { sold_items: [], total_gold: 0 });
        }
        
        // Продаем все предметы в ОДНОЙ транзакции
        let totalGold = 0;
        const soldItems = [];
        
        db.serialize(() => {
          db.run('BEGIN TRANSACTION', (err) => {
            if (err) {
              console.error('Ошибка начала транзакции:', err);
              return callback(err);
            }
            
            let processed = 0;
            let hasError = false;
            
            items.forEach(item => {
              const sellPrice = SELL_PRICES[item.rarity.toUpperCase()] || 5;
              
              // Удаляем предмет из инвентаря
              db.run(`DELETE FROM inventory WHERE id = ?`, [item.inventory_id], (err) => {
                if (err && !hasError) {
                  hasError = true;
                  db.run('ROLLBACK');
                  return callback(err);
                }
                
                if (!hasError) {
                  totalGold += sellPrice;
                  soldItems.push({
                    sold: true,
                    item_name: item.name,
                    rarity: item.rarity,
                    price: sellPrice
                  });
                }
                
                processed++;
                
                // Когда все предметы обработаны
                if (processed === items.length && !hasError) {
                  // Добавляем золото игроку
                  db.run(`UPDATE players SET gold = gold + ? WHERE user_id = ?`, 
                    [totalGold, playerId], (err) => {
                      if (err) {
                        db.run('ROLLBACK');
                        return callback(err);
                      }
                      
                      db.run('COMMIT', (err) => {
                        if (err) {
                          console.error('Ошибка коммита:', err);
                          return callback(err);
                        }
                        callback(null, { sold_items: soldItems, total_gold: totalGold });
                      });
                    });
                }
              });
            });
          });
        });
      });
  });
}

// Получить статистику автопродажи
function getAutoSellStats(playerId, callback) {
  getAutoSellSettings(playerId, (err, settings) => {
    if (err) return callback(err);
    
    // Подсчитываем количество предметов каждой редкости в инвентаре
    db.all(`SELECT i.rarity, COUNT(*) as count 
            FROM inventory inv 
            JOIN items i ON inv.item_id = i.id 
            WHERE inv.player_id = ? AND inv.equipped = 0 
            GROUP BY i.rarity`,
      [playerId], (err, counts) => {
        if (err) return callback(err);
        
        const stats = {
          settings: settings,
          inventory_counts: {},
          potential_gold: 0
        };
        
        // Обрабатываем статистику
        counts.forEach(row => {
          const rarity = row.rarity.toUpperCase();
          stats.inventory_counts[rarity] = row.count;
          
          // Если автопродажа включена для этой редкости
          if (settings[`${rarity.toLowerCase()}_enabled`]) {
            stats.potential_gold += row.count * (SELL_PRICES[rarity] || 5);
          }
        });
        
        callback(null, stats);
      });
  });
}

module.exports = {
  getAutoSellSettings,
  updateAutoSellSettings,
  checkAutoSell,
  autoSellInventory,
  getAutoSellStats,
  SELL_PRICES
};