const express = require('express');
const path = require('path');
const db = require('./database_simple');

const router = express.Router();

// Инициализация таблиц маркетплейса
function initializeMarketplace() {
  console.log('Инициализация маркетплейса...');
  
  // Таблица предметов на продаже
  db.run(`CREATE TABLE IF NOT EXISTS marketplace_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id INTEGER NOT NULL,
    seller_name TEXT NOT NULL,
    inventory_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    item_description TEXT,
    item_rarity TEXT NOT NULL,
    item_slot TEXT NOT NULL,
    power_bonus INTEGER DEFAULT 0,
    hp_bonus INTEGER DEFAULT 0,
    attack_bonus INTEGER DEFAULT 0,
    defense_bonus INTEGER DEFAULT 0,
    special_effect TEXT,
    price INTEGER NOT NULL,
    currency TEXT NOT NULL CHECK(currency IN ('gold', 'crystals')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES players(user_id),
    FOREIGN KEY (inventory_id) REFERENCES inventory(id),
    FOREIGN KEY (item_id) REFERENCES items(id)
  )`, (err) => {
    if (err) {
      console.error('Ошибка создания таблицы marketplace_items:', err);
    } else {
      console.log('✅ Таблица marketplace_items создана');
    }
  });
  
  // Таблица валют на продаже
  db.run(`CREATE TABLE IF NOT EXISTS marketplace_currencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id INTEGER NOT NULL,
    seller_name TEXT NOT NULL,
    currency_type TEXT NOT NULL CHECK(currency_type IN ('gold', 'crystals')),
    amount INTEGER NOT NULL,
    price_per_unit INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    price_currency TEXT NOT NULL CHECK(price_currency IN ('gold', 'crystals')),
    rate_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES players(user_id)
  )`, (err) => {
    if (err) {
      console.error('Ошибка создания таблицы marketplace_currencies:', err);
    } else {
      console.log('✅ Таблица marketplace_currencies создана');
    }
  });
  
  // Таблица аукционов
  db.run(`CREATE TABLE IF NOT EXISTS auctions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id INTEGER NOT NULL,
    seller_name TEXT NOT NULL,
    inventory_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    item_description TEXT,
    item_rarity TEXT NOT NULL,
    item_slot TEXT NOT NULL,
    power_bonus INTEGER DEFAULT 0,
    hp_bonus INTEGER DEFAULT 0,
    attack_bonus INTEGER DEFAULT 0,
    defense_bonus INTEGER DEFAULT 0,
    special_effect TEXT,
    start_price INTEGER NOT NULL,
    current_bid INTEGER NOT NULL,
    currency TEXT NOT NULL CHECK(currency IN ('gold', 'crystals')),
    highest_bidder_id INTEGER,
    highest_bidder_name TEXT,
    bid_count INTEGER DEFAULT 0,
    ends_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
    FOREIGN KEY (seller_id) REFERENCES players(user_id),
    FOREIGN KEY (inventory_id) REFERENCES inventory(id),
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (highest_bidder_id) REFERENCES players(user_id)
  )`, (err) => {
    if (err) {
      console.error('Ошибка создания таблицы auctions:', err);
    } else {
      console.log('✅ Таблица auctions создана');
    }
  });
  
  // Таблица ставок на аукционах
  db.run(`CREATE TABLE IF NOT EXISTS auction_bids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_id INTEGER NOT NULL,
    bidder_id INTEGER NOT NULL,
    bidder_name TEXT NOT NULL,
    bid_amount INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auction_id) REFERENCES auctions(id),
    FOREIGN KEY (bidder_id) REFERENCES players(user_id)
  )`, (err) => {
    if (err) {
      console.error('Ошибка создания таблицы auction_bids:', err);
    } else {
      console.log('✅ Таблица auction_bids создана');
    }
  });
  
  // Таблица истории операций
  db.run(`CREATE TABLE IF NOT EXISTS marketplace_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    other_user_id INTEGER NOT NULL,
    other_user_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('purchase', 'sale')),
    item_type TEXT NOT NULL CHECK(item_type IN ('item', 'currency')),
    item_name TEXT,
    currency_type TEXT,
    price INTEGER NOT NULL,
    currency TEXT NOT NULL CHECK(currency IN ('gold', 'crystals')),
    commission INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES players(user_id),
    FOREIGN KEY (other_user_id) REFERENCES players(user_id)
  )`, (err) => {
    if (err) {
      console.error('Ошибка создания таблицы marketplace_history:', err);
    } else {
      console.log('✅ Таблица marketplace_history создана');
    }
  });
}

// Статическая раздача файлов маркетплейса
router.use('/app', express.static(path.join(__dirname, 'marketplace')));

// Главная страница маркетплейса
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'marketplace', 'index.html'));
});

// Получить данные пользователя
router.get('/user/:userId', (req, res) => {
  const userId = req.params.userId;
  
  db.get(`SELECT gold, crystals, username FROM players WHERE user_id = ?`, [userId], (err, player) => {
    if (err) {
      return res.json({ success: false, message: 'Ошибка получения данных пользователя' });
    }
    
    if (!player) {
      return res.json({ success: false, message: 'Пользователь не найден' });
    }
    
    res.json({
      success: true,
      data: {
        gold: player.gold,
        crystals: player.crystals,
        username: player.username
      }
    });
  });
});

// Получить предметы на продаже
router.get('/items', (req, res) => {
  db.all(`SELECT * FROM marketplace_items ORDER BY created_at DESC`, (err, items) => {
    if (err) {
      return res.json({ success: false, message: 'Ошибка получения предметов' });
    }
    
    res.json({ success: true, data: items });
  });
});

// Получить инвентарь пользователя
router.get('/inventory/:userId', (req, res) => {
  const userId = req.params.userId;
  
  db.all(`SELECT inv.id as inventory_id, inv.item_id, inv.equipped, i.* 
          FROM inventory inv
          JOIN items i ON inv.item_id = i.id
          WHERE inv.player_id = ?
          ORDER BY i.rarity DESC, i.name`, [userId], (err, items) => {
    if (err) {
      return res.json({ success: false, message: 'Ошибка получения инвентаря' });
    }
    
    res.json({ success: true, data: items });
  });
});

// Получить активные аукционы
router.get('/auctions', (req, res) => {
  db.all(`SELECT * FROM auctions 
          WHERE status = 'active' AND ends_at > datetime('now')
          ORDER BY ends_at ASC`, (err, auctions) => {
    if (err) {
      return res.json({ success: false, message: 'Ошибка получения аукционов' });
    }
    
    res.json({ success: true, data: auctions });
  });
});

// Получить валюты на продаже
router.get('/currencies', (req, res) => {
  db.all(`SELECT * FROM marketplace_currencies ORDER BY created_at DESC`, (err, currencies) => {
    if (err) {
      return res.json({ success: false, message: 'Ошибка получения валют' });
    }
    
    res.json({ success: true, data: currencies });
  });
});

// Выставить валюту на продажу
router.post('/sell-currency', (req, res) => {
  const { userId, currencyType, amount, pricePerUnit } = req.body;
  
  if (!userId || !currencyType || !amount || !pricePerUnit) {
    return res.json({ success: false, message: 'Недостаточно данных' });
  }
  
  // Проверяем минимальные суммы
  if (currencyType === 'gold' && amount < 1000) {
    return res.json({ success: false, message: 'Минимум 1000 золота для продажи' });
  }
  
  if (currencyType === 'crystals' && amount < 1) {
    return res.json({ success: false, message: 'Минимум 1 кристалл для продажи' });
  }
  
  // Получаем данные пользователя
  db.get(`SELECT gold, crystals, username FROM players WHERE user_id = ?`, [userId], (err, player) => {
    if (err || !player) {
      return res.json({ success: false, message: 'Пользователь не найден' });
    }
    
    // Проверяем достаточно ли валюты
    const currentAmount = currencyType === 'gold' ? player.gold : player.crystals;
    if (currentAmount < amount) {
      return res.json({ success: false, message: `Недостаточно ${currencyType === 'gold' ? 'золота' : 'кристаллов'}` });
    }
    
    // Вычисляем цены
    const priceCurrency = currencyType === 'gold' ? 'crystals' : 'gold';
    let totalPrice, rateText;
    
    if (currencyType === 'gold') {
      // Продаем золото за кристаллы (цена за 1000 золота)
      const goldBlocks = Math.floor(amount / 1000);
      totalPrice = goldBlocks * pricePerUnit;
      rateText = `${pricePerUnit} кристаллов за 1000 золота`;
    } else {
      // Продаем кристаллы за золото (цена за 1 кристалл)
      totalPrice = amount * pricePerUnit;
      rateText = `${pricePerUnit} золота за 1 кристалл`;
    }
    
    // Начинаем транзакцию
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Списываем валюту у продавца
      const updateQuery = currencyType === 'gold' 
        ? `UPDATE players SET gold = gold - ? WHERE user_id = ?`
        : `UPDATE players SET crystals = crystals - ? WHERE user_id = ?`;
      
      db.run(updateQuery, [amount, userId], (err) => {
        if (err) {
          db.run('ROLLBACK');
          return res.json({ success: false, message: 'Ошибка списания валюты' });
        }
        
        // Добавляем валюту на маркетплейс
        db.run(`INSERT INTO marketplace_currencies (
          seller_id, seller_name, currency_type, amount, price_per_unit, 
          total_price, price_currency, rate_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, player.username, currencyType, amount, pricePerUnit, 
           totalPrice, priceCurrency, rateText], (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.json({ success: false, message: 'Ошибка выставления на продажу' });
            }
            
            db.run('COMMIT');
            res.json({ success: true, message: 'Валюта выставлена на продажу' });
          });
      });
    });
  });
});

// Купить валюту
router.post('/buy-currency', (req, res) => {
  const { userId, currencyId } = req.body;
  
  if (!userId || !currencyId) {
    return res.json({ success: false, message: 'Недостаточно данных' });
  }
  
  // Получаем информацию о валюте и покупателе
  db.get(`SELECT * FROM marketplace_currencies WHERE id = ?`, [currencyId], (err, currencyItem) => {
    if (err || !currencyItem) {
      return res.json({ success: false, message: 'Валюта не найдена' });
    }
    
    if (currencyItem.seller_id === userId) {
      return res.json({ success: false, message: 'Нельзя купить свою валюту' });
    }
    
    db.get(`SELECT gold, crystals, username FROM players WHERE user_id = ?`, [userId], (err, buyer) => {
      if (err || !buyer) {
        return res.json({ success: false, message: 'Покупатель не найден' });
      }
      
      // Проверяем достаточно ли средств у покупателя
      const requiredAmount = currencyItem.total_price;
      const currentAmount = currencyItem.price_currency === 'gold' ? buyer.gold : buyer.crystals;
      
      if (currentAmount < requiredAmount) {
        return res.json({ success: false, message: 'Недостаточно средств' });
      }
      
      // Вычисляем комиссию (20%)
      const commission = Math.floor(requiredAmount * 0.2);
      const sellerReceives = requiredAmount - commission;
      
      // Начинаем транзакцию
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Списываем средства у покупателя
        const updateBuyerQuery = currencyItem.price_currency === 'gold' 
          ? `UPDATE players SET gold = gold - ? WHERE user_id = ?`
          : `UPDATE players SET crystals = crystals - ? WHERE user_id = ?`;
        
        db.run(updateBuyerQuery, [requiredAmount, userId], (err) => {
          if (err) {
            db.run('ROLLBACK');
            return res.json({ success: false, message: 'Ошибка списания средств' });
          }
          
          // Начисляем средства продавцу (с учетом комиссии)
          const updateSellerQuery = currencyItem.price_currency === 'gold'
            ? `UPDATE players SET gold = gold + ? WHERE user_id = ?`
            : `UPDATE players SET crystals = crystals + ? WHERE user_id = ?`;
          
          db.run(updateSellerQuery, [sellerReceives, currencyItem.seller_id], (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.json({ success: false, message: 'Ошибка начисления средств продавцу' });
            }
            
            // Начисляем валюту покупателю
            const updateBuyerCurrencyQuery = currencyItem.currency_type === 'gold'
              ? `UPDATE players SET gold = gold + ? WHERE user_id = ?`
              : `UPDATE players SET crystals = crystals + ? WHERE user_id = ?`;
            
            db.run(updateBuyerCurrencyQuery, [currencyItem.amount, userId], (err) => {
              if (err) {
                db.run('ROLLBACK');
                return res.json({ success: false, message: 'Ошибка начисления валюты' });
              }
              
              // Удаляем валюту с маркетплейса
              db.run(`DELETE FROM marketplace_currencies WHERE id = ?`, [currencyId], (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  return res.json({ success: false, message: 'Ошибка удаления с маркетплейса' });
                }
                
                db.run('COMMIT');
                
                // Записываем в историю
                
                // История для покупателя
                db.run(`INSERT INTO marketplace_history 
                        (user_id, other_user_id, other_user_name, type, item_type, currency_type, price, currency, commission)
                        VALUES (?, ?, ?, 'purchase', 'currency', ?, ?, ?, ?)`,
                  [userId, currencyItem.seller_id, currencyItem.seller_name, currencyItem.currency_type, requiredAmount, currencyItem.price_currency, commission]);
                
                // История для продавца
                db.run(`INSERT INTO marketplace_history 
                        (user_id, other_user_id, other_user_name, type, item_type, currency_type, price, currency, commission)
                        VALUES (?, ?, ?, 'sale', 'currency', ?, ?, ?, ?)`,
                  [currencyItem.seller_id, userId, buyer.username, currencyItem.currency_type, sellerReceives, currencyItem.price_currency, commission]);
                
                res.json({ 
                  success: true, 
                  message: `Валюта куплена! Комиссия: ${commission} ${currencyItem.price_currency === 'gold' ? 'золота' : 'кристаллов'}` 
                });
              });
            });
          });
        });
      });
    });
  });
});

// Выставить предмет на продажу
router.post('/sell', (req, res) => {
  const { userId, itemId, price, currency } = req.body;
  
  if (!userId || !itemId || !price || !currency) {
    return res.json({ success: false, message: 'Недостаточно данных' });
  }
  
  // Проверяем, что предмет принадлежит пользователю и не экипирован
  db.get(`SELECT inv.id as inventory_id, inv.equipped, i.*, p.username
          FROM inventory inv
          JOIN items i ON inv.item_id = i.id
          JOIN players p ON inv.player_id = p.user_id
          WHERE inv.player_id = ? AND inv.id = ? AND inv.equipped = 0`,
    [userId, itemId], (err, item) => {
      if (err) {
        return res.json({ success: false, message: 'Ошибка проверки предмета' });
      }
      
      if (!item) {
        return res.json({ success: false, message: 'Предмет не найден или экипирован' });
      }
      
      // Добавляем предмет на маркетплейс
      db.run(`INSERT INTO marketplace_items (
        seller_id, seller_name, inventory_id, item_id, item_name, item_description,
        item_rarity, item_slot, power_bonus, hp_bonus, attack_bonus, defense_bonus,
        special_effect, price, currency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, item.username, item.inventory_id, item.id, item.name, item.description,
         item.rarity, item.slot, item.power_bonus, item.hp_bonus, item.attack_bonus,
         item.defense_bonus, item.special_effect, price, currency], (err) => {
          if (err) {
            return res.json({ success: false, message: 'Ошибка выставления на продажу' });
          }
          
          // Удаляем предмет из инвентаря
          db.run(`DELETE FROM inventory WHERE id = ?`, [item.inventory_id], (err) => {
            if (err) {
              console.error('Ошибка удаления из инвентаря:', err);
            }
            
            res.json({ success: true, message: 'Предмет выставлен на продажу' });
          });
        });
    });
});

// Купить предмет
router.post('/buy', (req, res) => {
  const { userId, itemId } = req.body;
  
  if (!userId || !itemId) {
    return res.json({ success: false, message: 'Недостаточно данных' });
  }
  
  // Получаем информацию о предмете и покупателе
  db.get(`SELECT * FROM marketplace_items WHERE id = ?`, [itemId], (err, marketItem) => {
    if (err || !marketItem) {
      return res.json({ success: false, message: 'Предмет не найден' });
    }
    
    if (marketItem.seller_id === userId) {
      return res.json({ success: false, message: 'Нельзя купить свой предмет' });
    }
    
    db.get(`SELECT gold, crystals, username FROM players WHERE user_id = ?`, [userId], (err, buyer) => {
      if (err || !buyer) {
        return res.json({ success: false, message: 'Покупатель не найден' });
      }
      
      // Проверяем достаточно ли средств
      const requiredAmount = marketItem.price;
      const currentAmount = marketItem.currency === 'gold' ? buyer.gold : buyer.crystals;
      
      if (currentAmount < requiredAmount) {
        return res.json({ success: false, message: 'Недостаточно средств' });
      }
      
      // Вычисляем комиссию (20%)
      const commission = Math.floor(requiredAmount * 0.2);
      const sellerReceives = requiredAmount - commission;
      
      // Начинаем транзакцию
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Списываем средства у покупателя
        const updateBuyerQuery = marketItem.currency === 'gold' 
          ? `UPDATE players SET gold = gold - ? WHERE user_id = ?`
          : `UPDATE players SET crystals = crystals - ? WHERE user_id = ?`;
        
        db.run(updateBuyerQuery, [requiredAmount, userId], (err) => {
          if (err) {
            db.run('ROLLBACK');
            return res.json({ success: false, message: 'Ошибка списания средств' });
          }
          
          // Начисляем средства продавцу (с учетом комиссии)
          const updateSellerQuery = marketItem.currency === 'gold'
            ? `UPDATE players SET gold = gold + ? WHERE user_id = ?`
            : `UPDATE players SET crystals = crystals + ? WHERE user_id = ?`;
          
          db.run(updateSellerQuery, [sellerReceives, marketItem.seller_id], (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.json({ success: false, message: 'Ошибка начисления средств' });
            }
            
            // Переносим предмет от продавца к покупателю
            db.run(`UPDATE inventory SET player_id = ?, equipped = 0 WHERE id = ?`,
              [userId, marketItem.inventory_id], (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  return res.json({ success: false, message: 'Ошибка передачи предмета' });
                }
                
                // Удаляем предмет с маркетплейса
                db.run(`DELETE FROM marketplace_items WHERE id = ?`, [itemId], (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    return res.json({ success: false, message: 'Ошибка удаления с маркетплейса' });
                  }
                  
                  db.run('COMMIT');
                  
                  // Записываем в историю
                  const commission = Math.floor(requiredAmount * 0.2);
                  
                  // История для покупателя
                  db.run(`INSERT INTO marketplace_history 
                          (user_id, other_user_id, other_user_name, type, item_type, item_name, price, currency, commission)
                          VALUES (?, ?, ?, 'purchase', 'item', ?, ?, ?, ?)`,
                    [userId, marketItem.seller_id, marketItem.seller_name, marketItem.item_name, requiredAmount, marketItem.currency, commission]);
                  
                  // История для продавца
                  db.run(`INSERT INTO marketplace_history 
                          (user_id, other_user_id, other_user_name, type, item_type, item_name, price, currency, commission)
                          VALUES (?, ?, ?, 'sale', 'item', ?, ?, ?, ?)`,
                    [marketItem.seller_id, userId, buyer.username, marketItem.item_name, sellerReceives, marketItem.currency, commission]);
                  
                  // Уведомляем продавца о покупке
                  notifyItemSold(marketItem.seller_id, marketItem.item_name, sellerReceives, marketItem.currency, buyer.username);
                  
                  res.json({ 
                    success: true, 
                    message: `Предмет куплен! Комиссия: ${commission} ${marketItem.currency === 'gold' ? 'золота' : 'кристаллов'}` 
                  });
                });
              });
          });
        });
      });
    });
  });
});

// Создать аукцион
router.post('/auction/create', (req, res) => {
  const { userId, itemId, startPrice, currency, duration } = req.body;
  
  if (!userId || !itemId || !startPrice || !currency || !duration) {
    return res.json({ success: false, message: 'Недостаточно данных' });
  }
  
  // Проверяем предмет
  db.get(`SELECT inv.id as inventory_id, inv.equipped, i.*, p.username
          FROM inventory inv
          JOIN items i ON inv.item_id = i.id
          JOIN players p ON inv.player_id = p.user_id
          WHERE inv.player_id = ? AND inv.item_id = ? AND inv.equipped = 0`,
    [userId, itemId], (err, item) => {
      if (err) {
        return res.json({ success: false, message: 'Ошибка проверки предмета' });
      }
      
      if (!item) {
        return res.json({ success: false, message: 'Предмет не найден или экипирован' });
      }
      
      // Вычисляем время окончания аукциона
      const endTime = new Date();
      endTime.setHours(endTime.getHours() + parseInt(duration));
      
      // Создаем аукцион
      db.run(`INSERT INTO auctions (
        seller_id, seller_name, inventory_id, item_id, item_name, item_description,
        item_rarity, item_slot, power_bonus, hp_bonus, attack_bonus, defense_bonus,
        special_effect, start_price, current_bid, currency, ends_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, item.username, item.inventory_id, itemId, item.name, item.description,
         item.rarity, item.slot, item.power_bonus, item.hp_bonus, item.attack_bonus,
         item.defense_bonus, item.special_effect, startPrice, startPrice, currency, endTime.toISOString()], (err) => {
          if (err) {
            return res.json({ success: false, message: 'Ошибка создания аукциона' });
          }
          
          // Удаляем предмет из инвентаря
          db.run(`DELETE FROM inventory WHERE id = ?`, [item.inventory_id], (err) => {
            if (err) {
              console.error('Ошибка удаления из инвентаря:', err);
            }
            
            res.json({ success: true, message: 'Аукцион создан' });
          });
        });
    });
});

// Получить мои продажи
router.get('/my-sales/:userId', (req, res) => {
  const userId = req.params.userId;
  
  // Получаем предметы на продаже
  const itemsQuery = `
    SELECT 'item' as type, id, item_name, item_rarity, item_slot, 
           power_bonus, hp_bonus, attack_bonus, defense_bonus, 
           price, currency, created_at
    FROM marketplace_items 
    WHERE seller_id = ?
  `;
  
  // Получаем валюты на продаже
  const currenciesQuery = `
    SELECT 'currency' as type, id, currency_type, amount, 
           total_price, price_currency, rate_text, created_at
    FROM marketplace_currencies 
    WHERE seller_id = ?
  `;
  
  // Получаем аукционы
  const auctionsQuery = `
    SELECT 'auction' as type, id, item_name, item_rarity, item_slot,
           power_bonus, hp_bonus, attack_bonus, defense_bonus,
           current_bid, currency, bid_count, ends_at, created_at
    FROM auctions 
    WHERE seller_id = ? AND status = 'active'
  `;
  
  Promise.all([
    new Promise((resolve, reject) => {
      db.all(itemsQuery, [userId], (err, items) => {
        if (err) reject(err);
        else resolve(items);
      });
    }),
    new Promise((resolve, reject) => {
      db.all(currenciesQuery, [userId], (err, currencies) => {
        if (err) reject(err);
        else resolve(currencies);
      });
    }),
    new Promise((resolve, reject) => {
      db.all(auctionsQuery, [userId], (err, auctions) => {
        if (err) reject(err);
        else resolve(auctions);
      });
    })
  ]).then(([items, currencies, auctions]) => {
    const allSales = [...items, ...currencies, ...auctions]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json({ success: true, data: allSales });
  }).catch(err => {
    console.error('Ошибка получения продаж:', err);
    res.json({ success: false, message: 'Ошибка получения продаж' });
  });
});

// Получить историю операций
router.get('/history/:userId', (req, res) => {
  const userId = req.params.userId;
  
  db.all(`SELECT * FROM marketplace_history 
          WHERE user_id = ? 
          ORDER BY created_at DESC 
          LIMIT 50`, [userId], (err, history) => {
    if (err) {
      return res.json({ success: false, message: 'Ошибка получения истории' });
    }
    
    res.json({ success: true, data: history });
  });
});

// Снять предмет с продажи
router.post('/remove-sale', (req, res) => {
  const { userId, saleId, type } = req.body;
  
  if (!userId || !saleId || !type) {
    return res.json({ success: false, message: 'Недостаточно данных' });
  }
  
  let table, itemField;
  
  switch(type) {
    case 'item':
      table = 'marketplace_items';
      itemField = 'item_id';
      break;
    case 'currency':
      table = 'marketplace_currencies';
      itemField = null;
      break;
    default:
      return res.json({ success: false, message: 'Неверный тип продажи' });
  }
  
  // Получаем информацию о продаже
  db.get(`SELECT * FROM ${table} WHERE id = ? AND seller_id = ?`, [saleId, userId], (err, sale) => {
    if (err || !sale) {
      return res.json({ success: false, message: 'Продажа не найдена' });
    }
    
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      if (type === 'item') {
        // Возвращаем предмет в инвентарь
        db.run(`INSERT INTO inventory (player_id, item_id, equipped) VALUES (?, ?, 0)`,
          [userId, sale.item_id], (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.json({ success: false, message: 'Ошибка возврата предмета' });
            }
            
            // Удаляем с маркетплейса
            db.run(`DELETE FROM ${table} WHERE id = ?`, [saleId], (err) => {
              if (err) {
                db.run('ROLLBACK');
                return res.json({ success: false, message: 'Ошибка удаления с маркетплейса' });
              }
              
              db.run('COMMIT');
              res.json({ success: true, message: 'Предмет снят с продажи' });
            });
          });
      } else if (type === 'currency') {
        // Возвращаем валюту игроку
        const updateQuery = sale.currency_type === 'gold' 
          ? `UPDATE players SET gold = gold + ? WHERE user_id = ?`
          : `UPDATE players SET crystals = crystals + ? WHERE user_id = ?`;
        
        db.run(updateQuery, [sale.amount, userId], (err) => {
          if (err) {
            db.run('ROLLBACK');
            return res.json({ success: false, message: 'Ошибка возврата валюты' });
          }
          
          // Удаляем с маркетплейса
          db.run(`DELETE FROM ${table} WHERE id = ?`, [saleId], (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.json({ success: false, message: 'Ошибка удаления с маркетплейса' });
            }
            
            db.run('COMMIT');
            res.json({ success: true, message: 'Валюта снята с продажи' });
          });
        });
      }
    });
  });
});

// Сделать ставку в аукционе
router.post('/auction/bid', (req, res) => {
  const { userId, auctionId, bidAmount } = req.body;
  
  if (!userId || !auctionId || !bidAmount) {
    return res.json({ success: false, message: 'Недостаточно данных' });
  }
  
  // Получаем информацию об аукционе
  db.get(`SELECT * FROM auctions WHERE id = ? AND status = 'active'`, [auctionId], (err, auction) => {
    if (err || !auction) {
      return res.json({ success: false, message: 'Аукцион не найден' });
    }
    
    if (auction.seller_id === userId) {
      return res.json({ success: false, message: 'Нельзя делать ставки на свой аукцион' });
    }
    
    if (new Date(auction.ends_at) <= new Date()) {
      return res.json({ success: false, message: 'Аукцион завершен' });
    }
    
    const minBid = auction.current_bid + Math.max(1, Math.floor(auction.current_bid * 0.05));
    if (bidAmount < minBid) {
      return res.json({ success: false, message: `Минимальная ставка: ${minBid}` });
    }
    
    // Проверяем средства игрока
    db.get(`SELECT gold, crystals, username FROM players WHERE user_id = ?`, [userId], (err, player) => {
      if (err || !player) {
        return res.json({ success: false, message: 'Игрок не найден' });
      }
      
      const currentAmount = auction.currency === 'gold' ? player.gold : player.crystals;
      if (currentAmount < bidAmount) {
        return res.json({ success: false, message: 'Недостаточно средств' });
      }
      
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Возвращаем средства предыдущему лидеру (если есть)
        if (auction.highest_bidder_id) {
          const returnQuery = auction.currency === 'gold'
            ? `UPDATE players SET gold = gold + ? WHERE user_id = ?`
            : `UPDATE players SET crystals = crystals + ? WHERE user_id = ?`;
          
          db.run(returnQuery, [auction.current_bid, auction.highest_bidder_id], (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.json({ success: false, message: 'Ошибка возврата средств' });
            }
          });
        }
        
        // Списываем средства у нового лидера
        const deductQuery = auction.currency === 'gold'
          ? `UPDATE players SET gold = gold - ? WHERE user_id = ?`
          : `UPDATE players SET crystals = crystals - ? WHERE user_id = ?`;
        
        db.run(deductQuery, [bidAmount, userId], (err) => {
          if (err) {
            db.run('ROLLBACK');
            return res.json({ success: false, message: 'Ошибка списания средств' });
          }
          
          // Проверяем, нужно ли продлить аукцион (если осталось меньше 5 минут)
          const now = new Date();
          const endsAt = new Date(auction.ends_at);
          const timeLeft = endsAt - now;
          const fiveMinutes = 5 * 60 * 1000; // 5 минут в миллисекундах
          
          let newEndsAt = auction.ends_at;
          let timeExtended = false;
          
          if (timeLeft < fiveMinutes) {
            // Продлеваем аукцион на 5 минут от текущего времени
            newEndsAt = new Date(now.getTime() + fiveMinutes).toISOString();
            timeExtended = true;
            console.log(`⏰ Аукцион #${auctionId} продлен на 5 минут. Новое время окончания: ${newEndsAt}`);
          }
          
          // Обновляем аукцион
          db.run(`UPDATE auctions SET 
                  current_bid = ?, 
                  highest_bidder_id = ?, 
                  highest_bidder_name = ?,
                  bid_count = bid_count + 1,
                  ends_at = ?
                  WHERE id = ?`,
            [bidAmount, userId, player.username, newEndsAt, auctionId], (err) => {
              if (err) {
                db.run('ROLLBACK');
                return res.json({ success: false, message: 'Ошибка обновления аукциона' });
              }
              
              // Добавляем запись о ставке
              db.run(`INSERT INTO auction_bids (auction_id, bidder_id, bidder_name, bid_amount)
                      VALUES (?, ?, ?, ?)`,
                [auctionId, userId, player.username, bidAmount], (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    return res.json({ success: false, message: 'Ошибка записи ставки' });
                  }
                  
                  db.run('COMMIT');
                  
                  let message = 'Ставка принята';
                  if (timeExtended) {
                    message += '! Аукцион продлен на 5 минут';
                  }
                  
                  res.json({ 
                    success: true, 
                    message: message,
                    timeExtended: timeExtended,
                    newEndsAt: newEndsAt
                  });
                  
                  // Уведомляем предыдущего лидера что его ставку перебили
                  if (auction.current_bidder_id && auction.current_bidder_id !== userId) {
                    notifyBidOutbid(auction.current_bidder_id, auction.item_name, bidAmount, auction.currency);
                  }
                });
            });
        });
      });
    });
  });
});

// Функция завершения истекших аукционов
function completeExpiredAuctions() {
  console.log('🔍 Проверка истекших аукционов...');
  
  db.all(`SELECT * FROM auctions 
          WHERE status = 'active' AND ends_at <= datetime('now')`, (err, auctions) => {
    if (err) {
      console.error('Ошибка получения истекших аукционов:', err);
      return;
    }
    
    if (!auctions || auctions.length === 0) {
      return;
    }
    
    console.log(`📦 Найдено ${auctions.length} истекших аукционов`);
    
    auctions.forEach(auction => {
      if (auction.bid_count > 0 && auction.current_bidder_id) {
        // Есть победитель - передаем предмет
        console.log(`✅ Аукцион #${auction.id} завершен, победитель: ${auction.current_bidder_name}`);
        
        // Начинаем транзакцию
        db.run('BEGIN TRANSACTION');
        
        // Передаем предмет победителю
        db.run(`UPDATE inventory SET player_id = ? WHERE id = ?`,
          [auction.current_bidder_id, auction.inventory_id], (err) => {
            if (err) {
              console.error('Ошибка передачи предмета:', err);
              db.run('ROLLBACK');
              return;
            }
            
            // Передаем деньги продавцу (80% от ставки)
            const sellerAmount = Math.floor(auction.current_bid * 0.8);
            const column = auction.currency === 'gold' ? 'gold' : 'crystals';
            
            db.run(`UPDATE players SET ${column} = ${column} + ? WHERE user_id = ?`,
              [sellerAmount, auction.seller_id], (err) => {
                if (err) {
                  console.error('Ошибка передачи денег:', err);
                  db.run('ROLLBACK');
                  return;
                }
                
                // Обновляем статус аукциона
                db.run(`UPDATE auctions SET status = 'completed' WHERE id = ?`,
                  [auction.id], (err) => {
                    if (err) {
                      console.error('Ошибка обновления статуса:', err);
                      db.run('ROLLBACK');
                      return;
                    }
                    
                    db.run('COMMIT');
                    console.log(`💰 Аукцион #${auction.id} завершен успешно`);
                    
                    // Уведомляем продавца
                    notifyAuctionSold(auction.seller_id, auction.item_name, sellerAmount, auction.currency, auction.current_bidder_name);
                    
                    // Уведомляем победителя
                    notifyAuctionWon(auction.current_bidder_id, auction.item_name, auction.current_bid, auction.currency);
                  });
              });
          });
      } else {
        // Нет ставок - возвращаем предмет продавцу
        console.log(`❌ Аукцион #${auction.id} завершен без ставок`);
        
        db.run(`UPDATE auctions SET status = 'cancelled' WHERE id = ?`,
          [auction.id], (err) => {
            if (err) {
              console.error('Ошибка обновления статуса:', err);
            } else {
              notifyAuctionExpired(auction.seller_id, auction.item_name);
            }
          });
      }
    });
  });
}

// Уведомления через бота
function notifyBidOutbid(userId, itemName, newBid, currency) {
  try {
    if (global.telegramBot) {
      const currencySymbol = currency === 'gold' ? '💰' : '💎';
      global.telegramBot.sendMessage(userId, 
        `⚠️ *Вашу ставку перебили!*\n\n` +
        `📦 Предмет: ${itemName}\n` +
        `${currencySymbol} Новая ставка: ${newBid}\n\n` +
        `Сделайте новую ставку чтобы вернуть лидерство!`,
        { parse_mode: 'Markdown' }
      ).catch(err => console.log(`Не удалось отправить уведомление игроку ${userId}:`, err));
    }
  } catch (e) {
    console.error('Ошибка отправки уведомления о перебитой ставке:', e);
  }
}

function notifyAuctionSold(sellerId, itemName, amount, currency, buyerName) {
  try {
    if (global.telegramBot) {
      const currencySymbol = currency === 'gold' ? '💰' : '💎';
      global.telegramBot.sendMessage(sellerId,
        `✅ *Ваш аукцион завершен!*\n\n` +
        `📦 Предмет: ${itemName}\n` +
        `👤 Покупатель: ${buyerName}\n` +
        `${currencySymbol} Вы получили: ${amount} (комиссия 20%)\n\n` +
        `Деньги зачислены на ваш счет!`,
        { parse_mode: 'Markdown' }
      ).catch(err => console.log(`Не удалось отправить уведомление игроку ${sellerId}:`, err));
    }
  } catch (e) {
    console.error('Ошибка отправки уведомления о продаже аукциона:', e);
  }
}

function notifyAuctionWon(winnerId, itemName, amount, currency) {
  try {
    if (global.telegramBot) {
      const currencySymbol = currency === 'gold' ? '💰' : '💎';
      global.telegramBot.sendMessage(winnerId,
        `🎉 *Вы выиграли аукцион!*\n\n` +
        `📦 Предмет: ${itemName}\n` +
        `${currencySymbol} Ваша ставка: ${amount}\n\n` +
        `Предмет добавлен в ваш инвентарь!`,
        { parse_mode: 'Markdown' }
      ).catch(err => console.log(`Не удалось отправить уведомление игроку ${winnerId}:`, err));
    }
  } catch (e) {
    console.error('Ошибка отправки уведомления о выигрыше аукциона:', e);
  }
}

function notifyAuctionExpired(sellerId, itemName) {
  try {
    if (global.telegramBot) {
      global.telegramBot.sendMessage(sellerId,
        `⏰ *Аукцион завершен*\n\n` +
        `📦 Предмет: ${itemName}\n` +
        `❌ Не было ставок\n\n` +
        `Предмет остался в вашем инвентаре.`,
        { parse_mode: 'Markdown' }
      ).catch(err => console.log(`Не удалось отправить уведомление игроку ${sellerId}:`, err));
    }
  } catch (e) {
    console.error('Ошибка отправки уведомления об истечении аукциона:', e);
  }
}

function notifyItemSold(sellerId, itemName, amount, currency, buyerName) {
  try {
    // Пытаемся получить бота разными способами
    let bot = null;
    
    // Способ 1: Глобальная переменная
    if (global.telegramBot) {
      bot = global.telegramBot;
    }
    // Способ 2: Прямой импорт (с задержкой для избежания циклической зависимости)
    else {
      try {
        delete require.cache[require.resolve('./bot')];
        const botModule = require('./bot');
        bot = botModule.bot || botModule;
      } catch (e) {
        console.log('❌ Не удалось импортировать бота:', e.message);
      }
    }
    
    if (bot && typeof bot.sendMessage === 'function') {
      const currencySymbol = currency === 'gold' ? '💰' : '💎';
      const message = `✅ *Ваш предмет куплен!*\n\n` +
        `📦 Предмет: ${itemName}\n` +
        `👤 Покупатель: ${buyerName}\n` +
        `${currencySymbol} Вы получили: ${amount} (комиссия 20%)\n\n` +
        `Деньги зачислены на ваш счет!`;
      
      bot.sendMessage(sellerId, message, { parse_mode: 'Markdown' })
        .then(() => {
          console.log('✅ Уведомление о продаже отправлено продавцу', sellerId);
        })
        .catch(err => {
          console.error('❌ Ошибка отправки уведомления продавцу', sellerId, ':', err);
        });
    } else {
      console.error('❌ Бот не доступен для отправки уведомления о продаже');
    }
  } catch (e) {
    console.error('❌ Критическая ошибка в notifyItemSold:', e);
  }
}

// Запускаем проверку аукционов каждую минуту
setInterval(completeExpiredAuctions, 60 * 1000);

// Первая проверка через 10 секунд после запуска
setTimeout(completeExpiredAuctions, 10000);

// Тестовая функция для проверки уведомлений
router.post('/test-notification', (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.json({ success: false, message: 'userId не указан' });
  }
  
  console.log('🧪 Тестируем уведомление для пользователя:', userId);
  
  try {
    // Пытаемся получить бота разными способами
    let bot = null;
    
    // Способ 1: Глобальная переменная
    if (global.telegramBot) {
      bot = global.telegramBot;
      console.log('🤖 Используем global.telegramBot для теста');
    }
    // Способ 2: Прямой импорт
    else {
      try {
        delete require.cache[require.resolve('./bot')];
        const botModule = require('./bot');
        bot = botModule.bot || botModule;
        console.log('🤖 Используем прямой импорт бота для теста');
      } catch (e) {
        console.log('❌ Не удалось импортировать бота для теста:', e.message);
      }
    }
    
    if (bot && typeof bot.sendMessage === 'function') {
      bot.sendMessage(userId, 
        '🧪 *Тест уведомлений маркетплейса*\n\nЕсли вы видите это сообщение, уведомления работают!',
        { parse_mode: 'Markdown' }
      ).then(() => {
        console.log('✅ Тестовое уведомление отправлено');
        res.json({ success: true, message: 'Тестовое уведомление отправлено' });
      }).catch(err => {
        console.error('❌ Ошибка отправки тестового уведомления:', err);
        res.json({ success: false, message: 'Ошибка отправки: ' + err.message });
      });
    } else {
      console.error('❌ Бот не доступен для тестирования');
      res.json({ success: false, message: 'Бот не доступен' });
    }
  } catch (e) {
    console.error('❌ Критическая ошибка в тесте:', e);
    res.json({ success: false, message: 'Критическая ошибка: ' + e.message });
  }
});

module.exports = {
  router,
  initializeMarketplace,
  notifyItemSold
};