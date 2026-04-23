const db = require('./database_simple');
const config = require('./config');

// Пул рейд-боссов
const RAID_BOSSES = [
  // Рейдовый босс
  {
    name: 'Повелитель ветра',
    level: 1,
    hp: 75000,
    image: 'raid_wind_lord.jpg',
    description: 'Древний повелитель стихии ветра',
    rewards: {
      total_gold: 1000,
      total_crystals: 20,
      total_exp: 1000
    }
  }
];

// Инициализация таблиц для рейдов
function initializeRaids() {
  console.log('Инициализация системы рейдов...');
  
  // Таблица достижений игроков в рейдах
  db.run(`CREATE TABLE IF NOT EXISTS player_raid_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    boss_name TEXT NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, boss_name),
    FOREIGN KEY (user_id) REFERENCES players(user_id)
  )`, (err) => {
    if (err) {
      console.error('Ошибка создания таблицы player_raid_achievements:', err);
    } else {
      console.log('✅ Таблица player_raid_achievements создана');
    }
  });
  
  // Сначала создаем таблицу raid_bosses
  db.run(`CREATE TABLE IF NOT EXISTS raid_bosses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    level INTEGER NOT NULL,
    base_hp INTEGER NOT NULL,
    times_defeated INTEGER DEFAULT 0,
    image TEXT,
    description TEXT,
    rewards TEXT,
    cooldown_hours INTEGER DEFAULT 2,
    requirements TEXT,
    special_rewards TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Ошибка создания таблицы raid_bosses:', err);
      return;
    }
    
    // Теперь проверяем структуру таблицы raid_bosses
    db.all(`PRAGMA table_info(raid_bosses)`, (err, columns) => {
      if (err) {
        console.error('Ошибка проверки структуры таблицы raid_bosses:', err);
        return;
      }
      
      const hasRequirements = columns && columns.some(col => col.name === 'requirements');
      const hasSpecialRewards = columns && columns.some(col => col.name === 'special_rewards');
      const hasCooldownHours = columns && columns.some(col => col.name === 'cooldown_hours');
      
      if (!hasRequirements || !hasSpecialRewards || !hasCooldownHours) {
        console.log('Обновляем структуру таблицы raid_bosses...');
        
        // Добавляем недостающие колонки
        if (!hasCooldownHours) {
          db.run(`ALTER TABLE raid_bosses ADD COLUMN cooldown_hours INTEGER DEFAULT 2`, (err) => {
            if (err) console.error('Ошибка добавления cooldown_hours:', err);
            else console.log('✅ Колонка cooldown_hours добавлена');
          });
        }
        
        if (!hasRequirements) {
          db.run(`ALTER TABLE raid_bosses ADD COLUMN requirements TEXT`, (err) => {
            if (err) console.error('Ошибка добавления requirements:', err);
            else console.log('✅ Колонка requirements добавлена');
          });
        }
        
        if (!hasSpecialRewards) {
          db.run(`ALTER TABLE raid_bosses ADD COLUMN special_rewards TEXT`, (err) => {
            if (err) console.error('Ошибка добавления special_rewards:', err);
            else console.log('✅ Колонка special_rewards добавлена');
          });
        }
      }
      
      // Добавляем базового босса если его нет
      db.get(`SELECT * FROM raid_bosses WHERE name = 'Повелитель ветра'`, (err, boss) => {
        if (err) {
          console.error('Ошибка проверки босса:', err);
          return;
        }
        
        if (!boss) {
          console.log('Создаем базового босса рейда...');
          db.run(`INSERT INTO raid_bosses (name, level, base_hp, image, description, rewards, cooldown_hours, requirements, special_rewards)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['Повелитель ветра', 1, 75000, 'raid_wind_lord.jpg', 
             'Древний повелитель стихии ветра',
             JSON.stringify({ total_gold: 1000, total_crystals: 20, total_exp: 1000 }),
             2, null, null],
            (insertErr) => {
              if (insertErr) {
                console.error('Ошибка создания базового босса:', insertErr);
              } else {
                console.log('✅ Базовый босс рейда создан');
              }
            });
        } else {
          console.log('✅ Базовый босс рейда уже существует');
          
          // Обновляем уровень Повелителя ветра если он неправильный
          if (boss.level !== 1) {
            db.run(`UPDATE raid_bosses SET level = 1 WHERE name = 'Повелитель ветра'`, (err) => {
              if (err) {
                console.error('Ошибка обновления уровня Повелителя ветра:', err);
              } else {
                console.log('✅ Уровень Повелителя ветра обновлен на 1');
              }
            });
          }
        }
      });
      
      // Добавляем Владыку тьмы если его нет
      db.get(`SELECT * FROM raid_bosses WHERE name = 'Владыка тьмы'`, (err, darkLord) => {
        if (err) {
          console.error('Ошибка проверки Владыки тьмы:', err);
          return;
        }
        
        if (!darkLord) {
          console.log('Создаем Владыку тьмы...');
          const requirements = JSON.stringify({
            min_race_level: 10,
            required_raid_participation: 'Повелитель ветра'
          });
          
          const specialRewards = JSON.stringify({
            top_1_guaranteed_item: 'Амулет тьмы'
          });
          
          db.run(`INSERT INTO raid_bosses (name, level, base_hp, image, description, rewards, cooldown_hours, requirements, special_rewards)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['Владыка тьмы', 2, 175000, 'dark_lord.jpg', 
             'Повелитель темных сил и теней',
             JSON.stringify({ total_gold: 2000, total_crystals: 30, total_exp: 4000 }),
             5, requirements, specialRewards],
            (insertErr) => {
              if (insertErr) {
                console.error('Ошибка создания Владыки тьмы:', insertErr);
              } else {
                console.log('✅ Владыка тьмы создан');
              }
            });
        } else {
          console.log('✅ Владыка тьмы уже существует');
        }
      });
    });
  });
  
  // Сначала создаем правильную структуру таблицы active_raids
  createActiveRaidsTable();
  
  // Остальные таблицы
  createOtherRaidTables();
}

// Создать таблицу активных рейдов
function createActiveRaidsTable() {
  // Сначала проверяем, существует ли таблица и какая у неё структура
  db.all(`PRAGMA table_info(active_raids)`, (err, columns) => {
    if (err) {
      console.error('Ошибка проверки структуры таблицы:', err);
      // Создаем новую таблицу
      createNewActiveRaidsTable();
      return;
    }
    
    if (!columns || columns.length === 0) {
      // Таблица не существует, создаем новую
      console.log('Создаем новую таблицу active_raids...');
      createNewActiveRaidsTable();
      return;
    }
    
    // Проверяем есть ли колонка boss_id
    const hasBossId = columns.some(col => col.name === 'boss_id');
    
    if (!hasBossId) {
      console.log('Обновляем структуру таблицы active_raids...');
      // Пересоздаем таблицу с правильной структурой
      recreateActiveRaidsTable();
    } else {
      console.log('✅ Таблица active_raids уже имеет правильную структуру');
    }
  });
}

// Создать новую таблицу active_raids
function createNewActiveRaidsTable() {
  db.run(`CREATE TABLE IF NOT EXISTS active_raids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    boss_id INTEGER,
    boss_name TEXT NOT NULL,
    boss_level INTEGER NOT NULL,
    boss_hp INTEGER NOT NULL,
    current_hp INTEGER NOT NULL,
    boss_image TEXT,
    boss_description TEXT,
    rewards TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ends_at TIMESTAMP,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (boss_id) REFERENCES raid_bosses(id)
  )`, (err) => {
    if (err) {
      console.error('Ошибка создания таблицы active_raids:', err);
    } else {
      console.log('✅ Таблица active_raids создана');
    }
  });
}

// Пересоздать таблицу активных рейдов
function recreateActiveRaidsTable() {
  console.log('Пересоздаем таблицу active_raids...');
  
  // Сохраняем старые данные
  db.all(`SELECT * FROM active_raids`, (err, oldData) => {
    if (err) {
      console.error('Ошибка чтения старых данных:', err);
      oldData = [];
    }
    
    // Удаляем старую таблицу
    db.run(`DROP TABLE IF EXISTS active_raids`, (dropErr) => {
      if (dropErr) {
        console.error('Ошибка удаления старой таблицы:', dropErr);
        return;
      }
      
      // Создаем новую таблицу
      createNewActiveRaidsTable();
      
      // Восстанавливаем данные (если были)
      if (oldData && oldData.length > 0) {
        console.log(`Восстанавливаем ${oldData.length} записей...`);
        oldData.forEach(raid => {
          // Добавляем boss_id как NULL для старых записей
          db.run(`INSERT INTO active_raids 
            (boss_id, boss_name, boss_level, boss_hp, current_hp, boss_image, boss_description, rewards, ends_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [null, raid.boss_name, raid.boss_level, raid.boss_hp, raid.current_hp, 
             raid.boss_image, raid.boss_description, raid.rewards, raid.ends_at, raid.status],
            (insertErr) => {
              if (insertErr) {
                console.error('Ошибка восстановления записи рейда:', insertErr);
              }
            });
        });
      }
      
      console.log('✅ Таблица active_raids пересоздана');
    });
  });
}

// Создать остальные таблицы рейдов
function createOtherRaidTables() {
  
  // Проверяем и обновляем структуру таблицы raid_participants
  db.all(`PRAGMA table_info(raid_participants)`, (err, columns) => {
    if (err) {
      console.error('Ошибка проверки структуры таблицы raid_participants:', err);
    } else if (columns && columns.length > 0) {
      // Проверяем есть ли колонка user_id
      const hasUserId = columns.some(col => col.name === 'user_id');
      const hasPlayerId = columns.some(col => col.name === 'player_id');
      
      if (hasPlayerId && !hasUserId) {
        console.log('🔄 Обновляем структуру таблицы raid_participants: player_id -> user_id');
        
        // Пересоздаем таблицу с правильной структурой
        db.all(`SELECT * FROM raid_participants`, (err, oldData) => {
          if (err) oldData = [];
          
          db.run(`DROP TABLE IF EXISTS raid_participants`, (err) => {
            if (err) {
              console.error('Ошибка удаления старой таблицы raid_participants:', err);
              return;
            }
            
            // Создаем новую таблицу с user_id
            db.run(`CREATE TABLE raid_participants (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              raid_id INTEGER NOT NULL,
              user_id INTEGER NOT NULL,
              damage_dealt INTEGER DEFAULT 0,
              attacks_count INTEGER DEFAULT 0,
              last_attack_time INTEGER DEFAULT 0,
              joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (raid_id) REFERENCES active_raids(id)
            )`, (err) => {
              if (err) {
                console.error('Ошибка создания новой таблицы raid_participants:', err);
                return;
              }
              
              console.log('✅ Таблица raid_participants обновлена с user_id');
              
              // Восстанавливаем данные если были
              if (oldData && oldData.length > 0) {
                console.log(`🔄 Восстанавливаем ${oldData.length} записей участников...`);
                oldData.forEach(participant => {
                  db.run(`INSERT INTO raid_participants 
                    (raid_id, user_id, damage_dealt, attacks_count, last_attack_time, joined_at)
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [participant.raid_id, participant.player_id, participant.damage_dealt, 
                     participant.attacks_count, participant.last_attack_time, participant.joined_at],
                    (err) => {
                      if (err) console.error('Ошибка восстановления участника:', err);
                    });
                });
              }
            });
          });
        });
      } else if (hasUserId) {
        console.log('✅ Таблица raid_participants уже имеет правильную структуру (user_id)');
      }
    }
  });
  
  // Таблица участников рейда
  db.run(`CREATE TABLE IF NOT EXISTS raid_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raid_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    damage_dealt INTEGER DEFAULT 0,
    attacks_count INTEGER DEFAULT 0,
    last_attack_time INTEGER DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (raid_id) REFERENCES active_raids(id)
  )`, (err) => {
    if (err) console.error('Ошибка создания таблицы raid_participants:', err);
  });
  
  // Таблица истории рейдов
  db.run(`CREATE TABLE IF NOT EXISTS raid_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    boss_name TEXT NOT NULL,
    boss_level INTEGER NOT NULL,
    total_damage INTEGER NOT NULL,
    participants_count INTEGER NOT NULL,
    status TEXT,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error('Ошибка создания таблицы raid_history:', err);
    else console.log('✅ Система рейдов инициализирована');
  });
}

// Создать новый рейд
function createRaid(callback) {
  console.log('🎯 Создание нового рейда...');
  
  // Сначала проверяем структуру таблицы
  db.all(`PRAGMA table_info(active_raids)`, (err, columns) => {
    if (err || !columns) {
      console.error('Ошибка проверки структуры таблицы active_raids:', err);
      // Пересоздаем таблицу и повторяем попытку
      createActiveRaidsTable();
      setTimeout(() => createRaidInternal(callback), 1000);
      return;
    }
    
    const hasBossId = columns.some(col => col.name === 'boss_id');
    if (!hasBossId) {
      console.log('Таблица active_raids не имеет колонки boss_id, обновляем...');
      recreateActiveRaidsTable();
      setTimeout(() => createRaidInternal(callback), 1000);
      return;
    }
    
    // Структура таблицы корректна, создаем рейд
    createRaidInternal(callback);
  });
}

// Внутренняя функция создания рейда
function createRaidInternal(callback) {
  // Получаем босса из базы данных
  db.get(`SELECT * FROM raid_bosses ORDER BY RANDOM() LIMIT 1`, (err, boss) => {
    if (err) {
      console.error('Ошибка получения босса из БД:', err);
      // Fallback на старую систему
      return createFallbackRaid(callback);
    }
    
    if (!boss) {
      console.log('Босс не найден в БД, создаем базового босса...');
      // Создаем базового босса и повторяем попытку
      db.run(`INSERT INTO raid_bosses (name, level, base_hp, image, description, rewards)
              VALUES (?, ?, ?, ?, ?, ?)`,
        ['Повелитель ветра', 9, 75000, 'raid_wind_lord.jpg', 
         'Древний повелитель стихии ветра',
         JSON.stringify({ total_gold: 1000, total_crystals: 20, total_exp: 1000 })],
        function(insertErr) {
          if (insertErr) {
            console.error('Ошибка создания базового босса:', insertErr);
            return createFallbackRaid(callback);
          }
          
          // Получаем только что созданного босса
          db.get(`SELECT * FROM raid_bosses WHERE id = ?`, [this.lastID], (err, newBoss) => {
            if (err || !newBoss) {
              return createFallbackRaid(callback);
            }
            createRaidFromBoss(newBoss, callback);
          });
        });
      return;
    }
    
    createRaidFromBoss(boss, callback);
  });
}

// Создать рейд из данных босса
function createRaidFromBoss(boss, callback) {
  // Рассчитываем HP с учетом прогрессии
  const hpBonus = boss.times_defeated * 5000;
  const totalHP = boss.base_hp + hpBonus;
  
  // Рейд длится 2 часа
  const duration = 2 * 60 * 60 * 1000; // 2 часа в миллисекундах
  const endsAt = new Date(Date.now() + duration);
  
  const rewards = JSON.parse(boss.rewards);
  
  console.log('🧹 Очищаем участников старых завершенных/проваленных рейдов...');
  
  // ВАЖНО: Удаляем только участников завершенных/проваленных рейдов, НЕ активных
  db.run(`DELETE FROM raid_participants 
          WHERE raid_id IN (
            SELECT id FROM active_raids 
            WHERE status IN ('completed', 'failed', 'cancelled')
          )`, (err) => {
    if (err) {
      console.error('Ошибка очистки участников старых рейдов:', err);
    } else {
      console.log('✅ Участники старых рейдов очищены');
    }
    
    // Также очищаем старые активные рейды
    db.run(`DELETE FROM active_raids WHERE status != 'active' OR ends_at < datetime('now')`, (err) => {
      if (err) {
        console.error('Ошибка очистки старых рейдов:', err);
      } else {
        console.log('✅ Старые рейды очищены');
      }
      
      db.run(`INSERT INTO active_raids 
        (boss_id, boss_name, boss_level, boss_hp, current_hp, boss_image, boss_description, rewards, ends_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [boss.id, boss.name, boss.level, totalHP, totalHP, boss.image, boss.description, 
         boss.rewards, endsAt.toISOString()],
        function(err) {
          if (err) {
            console.error('Ошибка создания рейда:', err);
            return callback(err);
          }
          
          const raidId = this.lastID;
          console.log(`✅ Рейд создан: ${boss.name} (ID: ${raidId}, HP: ${totalHP}, Побед: ${boss.times_defeated}, Бонус: +${hpBonus})`);
          console.log('🎯 Список участников пуст - готов к новым игрокам');
          
          callback(null, {
            id: raidId,
            boss_id: boss.id,
            name: boss.name,
            level: boss.level,
            hp: totalHP,
            current_hp: totalHP,
            image: boss.image,
            description: boss.description,
            rewards: rewards,
            ends_at: endsAt,
            times_defeated: boss.times_defeated,
            hp_bonus: hpBonus
          });
        });
    });
  });
}

// Fallback на старую систему рейдов
function createFallbackRaid(callback) {
  console.log('🔄 Используем fallback систему рейдов...');
  
  const boss = RAID_BOSSES[0]; // Повелитель ветра
  const duration = 2 * 60 * 60 * 1000;
  const endsAt = new Date(Date.now() + duration);
  
  db.run(`INSERT INTO active_raids 
    (boss_name, boss_level, boss_hp, current_hp, boss_image, boss_description, rewards, ends_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [boss.name, boss.level, boss.hp, boss.hp, boss.image, boss.description, 
     JSON.stringify(boss.rewards), endsAt.toISOString()],
    function(err) {
      if (err) {
        console.error('Ошибка создания fallback рейда:', err);
        return callback(err);
      }
      
      const raidId = this.lastID;
      console.log(`✅ Fallback рейд создан: ${boss.name} (ID: ${raidId})`);
      
      callback(null, {
        id: raidId,
        name: boss.name,
        level: boss.level,
        hp: boss.hp,
        current_hp: boss.hp,
        image: boss.image,
        description: boss.description,
        rewards: boss.rewards,
        ends_at: endsAt,
        times_defeated: 0,
        hp_bonus: 0
      });
    });
}

// Создать рейд вручную (для админа)
function createManualRaid(bossLevel, callback) {
  console.log(`🎯 Создание ручного рейда (уровень ${bossLevel})...`);
  
  // Сначала проверяем структуру таблицы
  db.all(`PRAGMA table_info(active_raids)`, (err, columns) => {
    if (err || !columns) {
      console.error('Ошибка проверки структуры таблицы active_raids:', err);
      // Пересоздаем таблицу и повторяем попытку
      createActiveRaidsTable();
      setTimeout(() => createManualRaidInternal(bossLevel, callback), 1000);
      return;
    }
    
    const hasBossId = columns.some(col => col.name === 'boss_id');
    if (!hasBossId) {
      console.log('Таблица active_raids не имеет колонки boss_id, обновляем...');
      recreateActiveRaidsTable();
      setTimeout(() => createManualRaidInternal(bossLevel, callback), 1000);
      return;
    }
    
    // Структура таблицы корректна, создаем рейд
    createManualRaidInternal(bossLevel, callback);
  });
}

// Внутренняя функция создания ручного рейда
function createManualRaidInternal(bossLevel, callback) {
  // Получаем босса из базы данных
  let query = `SELECT * FROM raid_bosses`;
  let params = [];
  
  if (bossLevel) {
    query += ` WHERE level = ?`;
    params.push(bossLevel);
  }
  
  query += ` ORDER BY RANDOM() LIMIT 1`;
  
  db.get(query, params, (err, boss) => {
    if (err) {
      console.error('Ошибка получения босса из БД:', err);
      return callback(err);
    }
    
    if (!boss) {
      return callback(new Error(`Нет боссов${bossLevel ? ` уровня ${bossLevel}` : ''}`));
    }
    
    // Завершаем текущий активный рейд, если есть
    db.run(`UPDATE active_raids SET status = 'cancelled' WHERE status = 'active'`, (err) => {
      if (err) console.error('Ошибка отмены старого рейда:', err);
      
      createRaidFromBoss(boss, callback);
    });
  });
}

// Получить активный рейд
function getActiveRaid(callback) {
  db.get(`SELECT * FROM active_raids WHERE status = 'active' ORDER BY id DESC LIMIT 1`, 
    (err, raid) => {
      if (err) return callback(err);
      
      if (!raid) return callback(null, null);
      
      // Проверяем, не истекло ли время рейда
      const now = new Date();
      const endsAt = new Date(raid.ends_at);
      
      if (now > endsAt) {
        // Рейд провален (время истекло)
        failRaid(raid.id, () => {
          callback(null, null);
        });
      } else {
        // Парсим rewards из JSON
        raid.rewards = JSON.parse(raid.rewards);
        callback(null, raid);
      }
    });
}

// Получить активный рейд для конкретного босса
function getActiveRaidForBoss(bossName, callback) {
  db.get(`SELECT * FROM active_raids WHERE status = 'active' AND boss_name = ? ORDER BY id DESC LIMIT 1`, 
    [bossName], (err, raid) => {
      if (err) return callback(err);
      
      if (!raid) return callback(null, null);
      
      // Проверяем, не истекло ли время рейда
      const now = new Date();
      const endsAt = new Date(raid.ends_at);
      
      if (now > endsAt) {
        // Рейд провален (время истекло)
        failRaid(raid.id, () => {
          callback(null, null);
        });
      } else {
        // Парсим rewards из JSON
        raid.rewards = JSON.parse(raid.rewards);
        callback(null, raid);
      }
    });
}

// Получить время до следующего рейда для конкретного босса
function getNextRaidTimeForBoss(bossName, callback) {
  // Проверяем последний завершенный рейд с этим боссом
  db.get(`SELECT rh.*, rb.cooldown_hours 
          FROM raid_history rh
          LEFT JOIN raid_bosses rb ON rh.boss_name = rb.name
          WHERE rh.status = 'completed' AND rh.boss_name = ?
          ORDER BY rh.id DESC LIMIT 1`,
    [bossName], (err, lastRaid) => {
      if (err) {
        console.error('Ошибка получения времени рейда для босса:', err);
        return callback(null, { ready: true, timeLeft: 0 });
      }
      
      if (!lastRaid) {
        // Нет завершенных рейдов с этим боссом - можно создать сразу
        return callback(null, { ready: true, timeLeft: 0 });
      }
      
      // Рейд появляется через указанное время после завершения предыдущего
      const cooldownHours = lastRaid.cooldown_hours || 2;
      const completedAt = new Date(lastRaid.completed_at);
      const nextRaidTime = new Date(completedAt.getTime() + cooldownHours * 60 * 60 * 1000);
      const now = new Date();
      
      if (now >= nextRaidTime) {
        return callback(null, { ready: true, timeLeft: 0 });
      }
      
      const timeLeft = Math.floor((nextRaidTime - now) / 1000); // в секундах
      callback(null, { ready: false, timeLeft, nextRaidTime });
    });
}

// Получить время до следующего рейда (любого босса)
function getNextRaidTime(callback) {
  // Получаем всех боссов и проверяем их кулдауны
  getBossList((err, bosses) => {
    if (err || !bosses || bosses.length === 0) {
      return callback(null, { ready: false, timeLeft: 7200 }); // 2 часа по умолчанию
    }
    
    let readyBosses = [];
    let minTimeLeft = Infinity;
    let processedBosses = 0;
    
    bosses.forEach(boss => {
      getNextRaidTimeForBoss(boss.name, (err, raidTime) => {
        processedBosses++;
        
        if (!err && raidTime) {
          if (raidTime.ready) {
            readyBosses.push(boss);
          } else if (raidTime.timeLeft < minTimeLeft) {
            minTimeLeft = raidTime.timeLeft;
          }
        }
        
        // Когда обработали всех боссов
        if (processedBosses === bosses.length) {
          if (readyBosses.length > 0) {
            // Есть готовые боссы
            callback(null, { ready: true, timeLeft: 0, readyBosses });
          } else {
            // Все боссы на кулдауне
            callback(null, { ready: false, timeLeft: minTimeLeft === Infinity ? 7200 : minTimeLeft });
          }
        }
      });
    });
  });
}

// Проверить условия участия в рейде
function checkRaidRequirements(playerId, bossName, callback) {
  // Получаем информацию о боссе
  db.get(`SELECT requirements FROM raid_bosses WHERE name = ?`, [bossName], (err, boss) => {
    if (err || !boss) {
      return callback(null, { canJoin: true, reason: null });
    }
    
    if (!boss.requirements) {
      return callback(null, { canJoin: true, reason: null });
    }
    
    const requirements = JSON.parse(boss.requirements);
    
    // Получаем информацию об игроке
    db.get(`SELECT p.*, r.name as race_name FROM players p 
            LEFT JOIN races r ON p.race_id = r.id 
            WHERE p.user_id = ?`, [playerId], (err, player) => {
      if (err || !player) {
        return callback(null, { canJoin: false, reason: 'Игрок не найден' });
      }
      
      // Проверяем минимальный уровень расы
      if (requirements.min_race_level && player.level < requirements.min_race_level) {
        return callback(null, { 
          canJoin: false, 
          reason: `Требуется ${requirements.min_race_level}+ уровень расы (у вас ${player.level})` 
        });
      }
      
      // Проверяем участие в предыдущих рейдах
      if (requirements.required_raid_participation) {
        // Проверяем достижение игрока - победил ли он требуемого босса
        db.get(`SELECT * FROM player_raid_achievements 
                WHERE user_id = ? AND boss_name = ?`,
          [playerId, requirements.required_raid_participation], (err, achievement) => {
            if (err) {
              console.error('Ошибка проверки достижения:', err);
              return callback(null, { canJoin: false, reason: 'Ошибка проверки достижения' });
            }
            
            if (!achievement) {
              console.log(`❌ Игрок ${playerId} НЕ победил босса "${requirements.required_raid_participation}"`);
              return callback(null, { 
                canJoin: false, 
                reason: `Требуется победа над боссом "${requirements.required_raid_participation}"` 
              });
            }
            
            console.log(`✅ Игрок ${playerId} победил босса "${requirements.required_raid_participation}" (${achievement.completed_at})`);
            callback(null, { canJoin: true, reason: null });
          });
      } else {
        callback(null, { canJoin: true, reason: null });
      }
    });
  });
}

// Альтернативная проверка участия в рейде больше не нужна

// Присоединиться к рейду
function joinRaid(raidId, playerId, callback) {
  console.log(`🎯 joinRaid вызвана: raidId=${raidId}, playerId=${playerId}`);
  
  // Получаем информацию о рейде
  db.get(`SELECT * FROM active_raids WHERE id = ? AND status = 'active'`, [raidId], (err, raid) => {
    if (err) {
      console.error('❌ Ошибка получения рейда:', err);
      return callback(err);
    }
    if (!raid) {
      console.log('❌ Рейд не найден или завершен');
      return callback(new Error('Рейд не найден или завершен'));
    }
    
    console.log(`📋 Найден рейд: ${raid.boss_name} (ID: ${raid.id})`);
    
    // Проверяем условия участия
    checkRaidRequirements(playerId, raid.boss_name, (err, requirements) => {
      if (err) {
        console.error('❌ Ошибка проверки требований:', err);
        return callback(err);
      }
      
      console.log('📋 Результат проверки требований:', requirements);
      
      if (!requirements.canJoin) {
        console.log(`❌ Не может присоединиться: ${requirements.reason}`);
        return callback(null, { 
          cannotJoin: true, 
          reason: requirements.reason 
        });
      }
      
      // Проверяем, не присоединился ли игрок уже (используем user_id)
      db.get(`SELECT * FROM raid_participants WHERE raid_id = ? AND user_id = ?`,
        [raidId, playerId], (err, participant) => {
          if (err) {
            console.error('❌ Ошибка проверки участника:', err);
            return callback(err);
          }
          
          if (participant) {
            console.log('✅ Игрок уже участвует в рейде');
            return callback(null, { alreadyJoined: true });
          }
          
          console.log('➕ Добавляем игрока в участники рейда');
          
          // Добавляем игрока в участники (используем user_id)
          db.run(`INSERT INTO raid_participants (raid_id, user_id, damage_dealt, attacks_count)
                  VALUES (?, ?, 0, 0)`,
            [raidId, playerId], (err) => {
              if (err) {
                console.error('❌ Ошибка добавления участника:', err);
                return callback(err);
              }
              
              console.log(`✅ Игрок ${playerId} успешно присоединился к рейду ${raidId}`);
              callback(null, { joined: true });
            });
        });
    });
  });
}

// Атаковать босса
function attackBoss(raidId, playerId, playerAttack, callback) {
  // Получаем информацию о рейде
  db.get(`SELECT * FROM active_raids WHERE id = ? AND status = 'active'`, [raidId], (err, raid) => {
    if (err) return callback(err);
    if (!raid) return callback(new Error('Рейд не найден или завершен'));
    
    // Проверяем время рейда
    const now = new Date();
    const endsAt = new Date(raid.ends_at);
    
    if (now > endsAt) {
      failRaid(raidId, () => {
        callback(new Error('Время рейда истекло'));
      });
      return;
    }
    
    // Рассчитываем урон (атака игрока + случайность ±20%)
    const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 - 1.2
    const damage = Math.floor(playerAttack * randomFactor);
    
    // Обновляем HP босса
    const newHp = Math.max(0, raid.current_hp - damage);
    
    db.run(`UPDATE active_raids SET current_hp = ? WHERE id = ?`, [newHp, raidId], (err) => {
      if (err) return callback(err);
      
      // Обновляем статистику игрока (используем user_id)
      db.run(`UPDATE raid_participants 
              SET damage_dealt = damage_dealt + ?, 
                  attacks_count = attacks_count + 1
              WHERE raid_id = ? AND user_id = ?`,
        [damage, raidId, playerId], (err) => {
          if (err) return callback(err);
          
          console.log(`⚔️ Игрок ${playerId} нанес ${damage} урона боссу (осталось HP: ${newHp}/${raid.boss_hp})`);
          
          // Проверяем, побежден ли босс
          if (newHp <= 0) {
            completeRaid(raidId, (err, results) => {
              callback(null, {
                damage,
                bossDefeated: true,
                results
              });
            });
          } else {
            callback(null, {
              damage,
              bossDefeated: false,
              currentHp: newHp,
              maxHp: raid.boss_hp
            });
          }
        });
    });
  });
}

// Завершить рейд (босс побежден)
function completeRaid(raidId, callback) {
  console.log(`🏆 Завершение рейда ${raidId}...`);
  
  // Получаем информацию о рейде и боссе
  db.get(`SELECT ar.*, rb.special_rewards, rb.cooldown_hours 
          FROM active_raids ar
          LEFT JOIN raid_bosses rb ON ar.boss_id = rb.id
          WHERE ar.id = ?`, [raidId], (err, raid) => {
    if (err) return callback(err);
    
    // Получаем всех участников с именами (используем user_id)
    db.all(`SELECT rp.*, p.username, p.display_name 
            FROM raid_participants rp
            LEFT JOIN players p ON rp.user_id = p.user_id
            WHERE rp.raid_id = ? 
            ORDER BY rp.damage_dealt DESC`,
      [raidId], (err, participants) => {
        if (err) return callback(err);
        
        const totalDamage = participants.reduce((sum, p) => sum + p.damage_dealt, 0);
        const rewards = JSON.parse(raid.rewards);
        
        // Фильтруем участников с уроном >= 2%
        const eligibleParticipants = participants.filter(p => {
          const damagePercent = (p.damage_dealt / totalDamage) * 100;
          return damagePercent >= 2;
        });
        
        // Раздаем награды
        const results = [];
        
        eligibleParticipants.forEach((participant, index) => {
          const damagePercent = Math.floor((participant.damage_dealt / totalDamage) * 100);
          
          // Рассчитываем награды пропорционально урону
          const gold = Math.floor(rewards.total_gold * (damagePercent / 100));
          const crystals = Math.floor(rewards.total_crystals * (damagePercent / 100));
          const exp = Math.floor(rewards.total_exp * (damagePercent / 100));
          
          results.push({
            player_id: participant.user_id, // используем user_id
            username: participant.display_name || participant.username || `Игрок ${participant.user_id}`,
            damage_dealt: participant.damage_dealt,
            damage_percent: damagePercent,
            gold,
            crystals,
            exp,
            special_reward: null
          });
          
          // Выдаем награды игроку (используем user_id)
          db.run(`UPDATE players SET gold = gold + ?, crystals = crystals + ?, exp = exp + ? 
                  WHERE user_id = ?`,
            [gold, crystals, exp, participant.user_id], (err) => {
              if (err) console.error('Ошибка выдачи наград:', err);
            });
          
          // Проверяем специальные награды для топ-1 игрока
          if (index === 0 && raid.special_rewards) {
            console.log(`🎁 Проверяем специальные награды для топ-1 игрока ${participant.user_id}`);
            console.log(`📦 special_rewards из БД:`, raid.special_rewards);
            
            try {
              const specialRewards = JSON.parse(raid.special_rewards);
              console.log(`📦 Распарсенные специальные награды:`, specialRewards);
              
              if (specialRewards.top_1_guaranteed_item) {
                const itemName = specialRewards.top_1_guaranteed_item;
                console.log(`🔍 Ищем предмет "${itemName}" в базе данных...`);
                
                // Выдаем предмет топ-1 игроку
                db.get(`SELECT * FROM items WHERE name = ?`, [itemName], (err, item) => {
                  if (err) {
                    console.error(`❌ Ошибка поиска предмета "${itemName}":`, err);
                    return;
                  }
                  
                  if (!item) {
                    console.error(`❌ Предмет "${itemName}" не найден в базе данных!`);
                    return;
                  }
                  
                  console.log(`✅ Предмет найден: ID=${item.id}, Name=${item.name}`);
                  console.log(`📝 Добавляем предмет в инвентарь игрока ${participant.user_id}...`);
                  
                  db.run(`INSERT INTO inventory (player_id, item_id, equipped)
                          VALUES (?, ?, 0)`,
                    [participant.user_id, item.id], (err) => {
                      if (err) {
                        console.error('❌ Ошибка выдачи специального предмета:', err);
                      } else {
                        console.log(`🎁 Игрок ${participant.user_id} получил специальную награду: ${itemName}`);
                        results[0].special_reward = itemName;
                      }
                    });
                });
              } else {
                console.log(`⚠️ Нет гарантированного предмета для топ-1`);
              }
            } catch (e) {
              console.error('❌ Ошибка парсинга специальных наград:', e);
            }
          }
        });
        
        // Обновляем статус рейда
        db.run(`UPDATE active_raids SET status = 'completed' WHERE id = ?`, [raidId]);
        
        // Записываем достижения для всех участников
        console.log(`📝 Записываем достижения для ${eligibleParticipants.length} участников...`);
        eligibleParticipants.forEach(participant => {
          db.run(`INSERT OR IGNORE INTO player_raid_achievements (user_id, boss_name)
                  VALUES (?, ?)`,
            [participant.user_id, raid.boss_name], (err) => {
              if (err) {
                console.error(`Ошибка записи достижения для игрока ${participant.user_id}:`, err);
              } else {
                console.log(`✅ Достижение записано: игрок ${participant.user_id} победил "${raid.boss_name}"`);
              }
            });
        });
        
        // НЕ удаляем участников завершенного рейда - они нужны для проверки требований!
        // Участники будут очищены только при создании нового рейда
        console.log('✅ Участники завершенного рейда сохранены для истории');
        
        // Увеличиваем счетчик побед босса
        db.run(`UPDATE raid_bosses SET times_defeated = times_defeated + 1 WHERE name = ?`, 
          [raid.boss_name], (err) => {
            if (err) console.error('Ошибка обновления счетчика побед:', err);
            else console.log(`📈 Босс "${raid.boss_name}" побежден. Следующий HP: +5000`);
          });
        
        // Добавляем в историю
        db.run(`INSERT INTO raid_history 
                (boss_name, boss_level, total_damage, participants_count, status)
                VALUES (?, ?, ?, ?, 'completed')`,
          [raid.boss_name, raid.boss_level, totalDamage, participants.length]);
        
        console.log(`✅ Рейд ${raidId} завершен. Участников: ${participants.length}, Урон: ${totalDamage}`);
        
        // Планируем создание нового рейда с учетом кулдауна босса
        const cooldownHours = raid.cooldown_hours || 2;
        const cooldownMs = cooldownHours * 60 * 60 * 1000;
        
        console.log(`⏰ Новый рейд будет создан через ${cooldownHours} часов`);
        setTimeout(() => {
          createRaid((err, newRaid) => {
            if (err) {
              console.error('Ошибка создания нового рейда:', err);
            } else {
              console.log(`✅ Автоматически создан новый рейд: ${newRaid.name}`);
            }
          });
        }, cooldownMs);
        
        callback(null, {
          boss_name: raid.boss_name,
          boss_level: raid.boss_level,
          total_damage: totalDamage,
          participants: results
        });
      });
  });
}

// Провалить рейд (время истекло)
function failRaid(raidId, callback) {
  console.log(`❌ Рейд ${raidId} провален (время истекло)`);
  
  db.get(`SELECT * FROM active_raids WHERE id = ?`, [raidId], (err, raid) => {
    if (err) return callback(err);
    
    db.get(`SELECT COUNT(*) as count FROM raid_participants WHERE raid_id = ?`, 
      [raidId], (err, result) => {
        const participantsCount = result ? result.count : 0;
        
        // Обновляем статус рейда
        db.run(`UPDATE active_raids SET status = 'failed' WHERE id = ?`, [raidId]);
        
        // НЕ удаляем участников провалившегося рейда - они могут понадобиться для статистики
        console.log('✅ Участники провалившегося рейда сохранены');
        
        // Добавляем в историю
        db.run(`INSERT INTO raid_history 
                (boss_name, boss_level, total_damage, participants_count, status)
                VALUES (?, ?, 0, ?, 'failed')`,
          [raid.boss_name, raid.boss_level, participantsCount]);
        
        callback();
      });
  });
}

// Получить участников рейда
function getRaidParticipants(raidId, callback) {
  db.all(`SELECT rp.*, p.username, p.display_name 
          FROM raid_participants rp
          LEFT JOIN players p ON rp.user_id = p.user_id
          WHERE rp.raid_id = ?
          ORDER BY rp.damage_dealt DESC`,
    [raidId], callback);
}

// Получить статистику игрока в рейде
function getPlayerRaidStats(raidId, playerId, callback) {
  db.get(`SELECT * FROM raid_participants WHERE raid_id = ? AND player_id = ?`,
    [raidId, playerId], callback);
}

// Получить список всех боссов
function getBossList(callback) {
  console.log('🔍 Получение списка боссов...');
  db.all(`SELECT * FROM raid_bosses ORDER BY level ASC`, (err, bosses) => {
    if (err) {
      console.error('❌ Ошибка получения списка боссов:', err);
      return callback(err);
    }
    
    console.log(`📋 Найдено боссов в БД: ${bosses ? bosses.length : 0}`);
    if (bosses && bosses.length > 0) {
      bosses.forEach((boss, index) => {
        console.log(`  ${index + 1}. ${boss.name} (Уровень ${boss.level}, ID: ${boss.id})`);
      });
    }
    
    callback(null, bosses);
  });
}

// Принудительно очистить участников только активных рейдов
function clearAllRaidParticipants(callback) {
  console.log('🧹 Принудительная очистка участников активных рейдов...');
  
  db.run(`DELETE FROM raid_participants 
          WHERE raid_id IN (
            SELECT id FROM active_raids WHERE status = 'active'
          )`, (err) => {
    if (err) {
      console.error('Ошибка очистки участников:', err);
      if (callback) callback(err);
    } else {
      console.log('✅ Участники активных рейдов очищены');
      if (callback) callback(null);
    }
  });
}

// Админская функция: мгновенно запустить рейд с боссом (сбросить кулдаун)
function forceStartRaidWithBoss(bossId, callback) {
  console.log(`⚡ Админ принудительно запускает рейд с боссом ID: ${bossId}`);
  
  // Получаем информацию о боссе
  db.get(`SELECT * FROM raid_bosses WHERE id = ?`, [bossId], (err, boss) => {
    if (err || !boss) {
      console.error('Ошибка получения босса для принудительного запуска:', err);
      return callback(err || new Error('Босс не найден'));
    }
    
    // Сбрасываем кулдаун этого босса (удаляем его из истории)
    db.run(`DELETE FROM raid_history WHERE boss_name = ?`, [boss.name], (err) => {
      if (err) {
        console.error('Ошибка сброса кулдауна босса:', err);
      } else {
        console.log(`🔄 Кулдаун босса "${boss.name}" сброшен`);
      }
      
      // Отменяем любой активный рейд
      db.run(`UPDATE active_raids SET status = 'cancelled' WHERE status = 'active'`, (err) => {
        if (err) {
          console.error('Ошибка отмены активного рейда:', err);
        }
        
        // Очищаем только участников активных рейдов
        db.run(`DELETE FROM raid_participants 
                WHERE raid_id IN (
                  SELECT id FROM active_raids WHERE status = 'active'
                )`, (err) => {
          if (err) {
            console.error('Ошибка очистки участников:', err);
          }
          
          // Создаем новый рейд с этим боссом
          createRaidFromBoss(boss, (err, newRaid) => {
            if (err) {
              console.error('Ошибка создания принудительного рейда:', err);
              return callback(err);
            }
            
            console.log(`⚡ Админ успешно запустил рейд: ${newRaid.name}`);
            callback(null, newRaid);
          });
        });
      });
    });
  });
}

// Создать шаблон босса
function createBossTemplate(bossData, callback) {
  const rewards = JSON.stringify({
    total_gold: bossData.gold,
    total_crystals: bossData.crystals,
    total_exp: bossData.exp
  });
  
  const imageName = `raid_${bossData.name.toLowerCase().replace(/\s+/g, '_')}.jpg`;
  
  db.run(`INSERT INTO raid_bosses (name, level, base_hp, image, description, rewards)
          VALUES (?, ?, ?, ?, ?, ?)`,
    [bossData.name, bossData.level, bossData.base_hp, imageName, bossData.description, rewards],
    function(err) {
      if (err) return callback(err);
      
      callback(null, {
        id: this.lastID,
        name: bossData.name,
        level: bossData.level,
        base_hp: bossData.base_hp,
        image: imageName,
        description: bossData.description,
        rewards: {
          total_gold: bossData.gold,
          total_crystals: bossData.crystals,
          total_exp: bossData.exp
        }
      });
    });
}

// Обновить босса
function updateBoss(bossId, field, value, callback) {
  // Валидация полей
  const allowedFields = ['name', 'level', 'base_hp', 'description', 'image'];
  
  if (allowedFields.includes(field)) {
    db.run(`UPDATE raid_bosses SET ${field} = ? WHERE id = ?`, [value, bossId], callback);
  } else {
    callback(new Error('Недопустимое поле для обновления'));
  }
}

// Обновить награды босса
function updateBossRewards(bossId, rewardType, value, callback) {
  db.get(`SELECT rewards FROM raid_bosses WHERE id = ?`, [bossId], (err, boss) => {
    if (err || !boss) return callback(err || new Error('Босс не найден'));
    
    const rewards = JSON.parse(boss.rewards);
    
    switch (rewardType) {
      case 'gold':
        rewards.total_gold = value;
        break;
      case 'crystals':
        rewards.total_crystals = value;
        break;
      case 'exp':
        rewards.total_exp = value;
        break;
      default:
        return callback(new Error('Неизвестный тип награды'));
    }
    
    db.run(`UPDATE raid_bosses SET rewards = ? WHERE id = ?`, 
      [JSON.stringify(rewards), bossId], callback);
  });
}

// Удалить босса
function deleteBoss(bossId, callback) {
  // Проверяем, не используется ли босс в активном рейде
  db.get(`SELECT id FROM active_raids WHERE boss_id = ? AND status = 'active'`, [bossId], (err, activeRaid) => {
    if (err) return callback(err);
    
    if (activeRaid) {
      return callback(new Error('Нельзя удалить босса, который используется в активном рейде'));
    }
    
    db.run(`DELETE FROM raid_bosses WHERE id = ?`, [bossId], callback);
  });
}

// Автоматическое создание рейдов
function startAutoRaidCreation() {
  console.log('🤖 Запуск автоматического создания рейдов...');
  
  // Первая проверка сразу при запуске (через 10 секунд)
  setTimeout(() => {
    console.log('🔄 Первая проверка рейдов после запуска бота...');
    checkAndCreateRaid();
  }, 10000);
  
  // Проверяем каждые 5 минут
  setInterval(() => {
    checkAndCreateRaid();
  }, 5 * 60 * 1000);
  
  // Дополнительно: планируем таймеры для каждого босса на основе истории
  scheduleRaidTimers();
}

// Планировать таймеры для автоматического создания рейдов на основе истории
function scheduleRaidTimers() {
  console.log('📅 Планирование таймеров рейдов на основе истории...');
  
  // Получаем всех боссов
  db.all(`SELECT * FROM raid_bosses`, (err, bosses) => {
    if (err || !bosses || bosses.length === 0) {
      console.log('❌ Нет боссов для планирования таймеров');
      return;
    }
    
    bosses.forEach(boss => {
      // Находим последний завершенный рейд с этим боссом
      db.get(`SELECT * FROM raid_history 
              WHERE boss_name = ? AND status = 'completed' 
              ORDER BY completed_at DESC LIMIT 1`, [boss.name], (err, lastRaid) => {
        if (err || !lastRaid) {
          console.log(`⚠️ Нет истории для босса "${boss.name}", будет создан при первой проверке`);
          return;
        }
        
        const cooldownHours = boss.cooldown_hours || 2;
        const cooldownMs = cooldownHours * 60 * 60 * 1000;
        const completedAt = new Date(lastRaid.completed_at);
        const readyAt = new Date(completedAt.getTime() + cooldownMs);
        const now = new Date();
        const timeUntilReady = readyAt - now;
        
        if (timeUntilReady <= 0) {
          console.log(`✅ Босс "${boss.name}" уже готов к рейду`);
        } else {
          const minutesLeft = Math.floor(timeUntilReady / 1000 / 60);
          console.log(`⏰ Босс "${boss.name}" будет готов через ${minutesLeft} минут`);
          
          // Планируем проверку когда босс будет готов
          setTimeout(() => {
            console.log(`🔔 Время для босса "${boss.name}"! Проверяем создание рейда...`);
            checkAndCreateRaid();
          }, timeUntilReady);
        }
      });
    });
  });
}

// Проверить и создать рейд если нужно
function checkAndCreateRaid() {
  console.log('🔍 Проверяем какие боссы готовы к рейду...');
  
  // Получаем всех боссов
  db.all(`SELECT * FROM raid_bosses`, (err, bosses) => {
    if (err || !bosses || bosses.length === 0) {
      console.log('❌ Нет боссов для проверки');
      return;
    }
    
    console.log(`📋 Проверяем ${bosses.length} боссов...`);
    
    // Проверяем каждого босса отдельно
    bosses.forEach(boss => {
      // Проверяем есть ли активный рейд для этого босса
      getActiveRaidForBoss(boss.name, (err, activeRaid) => {
        if (err) {
          console.error(`Ошибка проверки активного рейда для "${boss.name}":`, err);
          return;
        }
        
        if (activeRaid) {
          console.log(`🐉 Босс "${boss.name}" уже имеет активный рейд`);
          return;
        }
        
        // Проверяем кулдаун босса
        getNextRaidTimeForBoss(boss.name, (err, bossRaidTime) => {
          if (err) {
            console.error(`Ошибка получения времени рейда для "${boss.name}":`, err);
            return;
          }
          
          if (!bossRaidTime.ready) {
            const minutes = Math.floor(bossRaidTime.timeLeft / 60);
            console.log(`⏰ Босс "${boss.name}" не готов, осталось ${minutes} минут`);
            return;
          }
          
          console.log(`✅ Босс "${boss.name}" готов! Создаем рейд...`);
          
          // Создаем рейд с этим боссом
          createRaidFromBoss(boss, (err, newRaid) => {
            if (err) {
              console.error(`Ошибка создания рейда для "${boss.name}":`, err);
              return;
            }
            
            console.log(`🎉 Автоматически создан рейд: ${newRaid.name}`);
            notifyPlayersAboutNewRaid(newRaid);
          });
        });
      });
    });
  });
}

// Уведомить игроков о новом рейде
function notifyPlayersAboutNewRaid(raid) {
  const db = require('./database_simple');
  
  db.all(`SELECT user_id FROM players WHERE race_id IS NOT NULL`, (err, players) => {
    if (err || !players) {
      console.error('Ошибка получения списка игроков для уведомления:', err);
      return;
    }
    
    const timeLeft = Math.floor((new Date(raid.ends_at) - new Date()) / 1000 / 60);
    const rewards = raid.rewards;
    
    const raidMessage = 
      `🐉 *НОВЫЙ РЕЙД НАЧАЛСЯ!*\n\n` +
      `👹 ${raid.name} (Ур.${raid.level})\n` +
      `📝 ${raid.description}\n\n` +
      `❤️ HP: ${raid.hp.toLocaleString()}\n` +
      `⏰ Время: ${timeLeft} мин\n\n` +
      `💰 Награды (делятся по урону):\n` +
      `• ${rewards.total_gold} золота\n` +
      `• ${rewards.total_crystals} алмазов\n` +
      `• ${rewards.total_exp} опыта\n\n` +
      `⚠️ Минимум 2% урона для награды\n\n` +
      `Откройте меню "🐉 Рейды" чтобы присоединиться!`;
    
    const bot = require('./bot.js');
    let notifiedCount = 0;
    
    players.forEach(player => {
      if (bot && bot.sendMessage) {
        bot.sendMessage(player.user_id, raidMessage, { parse_mode: 'Markdown' })
          .then(() => {
            notifiedCount++;
          })
          .catch(err => {
            console.error(`Ошибка отправки уведомления игроку ${player.user_id}:`, err.message);
          });
      }
    });
    
    console.log(`📢 Отправляем уведомления о рейде ${players.length} игрокам`);
  });
}

// Получить достижения игрока в рейдах
function getPlayerRaidAchievements(playerId, callback) {
  db.all(`SELECT * FROM player_raid_achievements WHERE user_id = ? ORDER BY completed_at DESC`,
    [playerId], callback);
}

// Проверить есть ли у игрока достижение
function hasPlayerAchievement(playerId, bossName, callback) {
  db.get(`SELECT * FROM player_raid_achievements WHERE user_id = ? AND boss_name = ?`,
    [playerId, bossName], (err, achievement) => {
      if (err) return callback(err);
      callback(null, !!achievement);
    });
}

// Админская функция: ускорить кулдаун босса (установить 1 минуту до готовности)
function speedupBossCooldown(bossName, callback) {
  console.log(`⚡ Админ ускоряет кулдаун босса "${bossName}"`);
  
  // Находим последний завершенный рейд с этим боссом
  db.get(`SELECT * FROM raid_history 
          WHERE boss_name = ? AND status = 'completed' 
          ORDER BY id DESC LIMIT 1`, [bossName], (err, lastRaid) => {
    if (err) {
      console.error('Ошибка поиска последнего рейда:', err);
      return callback(err);
    }
    
    if (!lastRaid) {
      console.log(`❌ Не найдено завершенных рейдов с боссом "${bossName}"`);
      return callback(new Error('Не найдено завершенных рейдов с этим боссом'));
    }
    
    // Получаем информацию о боссе для кулдауна
    db.get(`SELECT * FROM raid_bosses WHERE name = ?`, [bossName], (err, boss) => {
      if (err || !boss) {
        console.error('Ошибка получения информации о боссе:', err);
        return callback(err || new Error('Босс не найден'));
      }
      
      const cooldownHours = boss.cooldown_hours || 2;
      const cooldownMs = cooldownHours * 60 * 60 * 1000;
      
      // Вычисляем новое время completed_at так, чтобы до готовности осталась 1 минута
      const now = new Date();
      const newCompletedAt = new Date(now.getTime() - cooldownMs + 60 * 1000); // -кулдаун +1 минута
      
      // Обновляем время завершения последнего рейда
      db.run(`UPDATE raid_history SET completed_at = ? WHERE id = ?`,
        [newCompletedAt.toISOString(), lastRaid.id], (err) => {
          if (err) {
            console.error('Ошибка обновления времени рейда:', err);
            return callback(err);
          }
          
          console.log(`✅ Кулдаун босса "${bossName}" ускорен. Рейд будет создан через 1 минуту`);
          
          // Планируем автоматическое создание рейда через 1 минуту
          setTimeout(() => {
            console.log(`🔔 Время истекло! Создаем рейд с боссом "${bossName}"...`);
            
            // Создаем рейд с этим боссом (независимо от других активных рейдов)
            createRaidFromBoss(boss, (err, newRaid) => {
              if (err) {
                console.error('Ошибка создания рейда после ускорения:', err);
                return;
              }
              
              console.log(`🎉 Автоматически создан рейд после ускорения: ${newRaid.name}`);
              notifyPlayersAboutNewRaid(newRaid);
            });
          }, 60 * 1000); // 1 минута
          
          callback(null, {
            boss_name: bossName,
            cooldown_hours: cooldownHours,
            ready_in_seconds: 60
          });
        });
    });
  });
}

module.exports = {
  RAID_BOSSES,
  initializeRaids,
  createRaid,
  createRaidFromBoss,
  createManualRaid,
  getActiveRaid,
  getActiveRaidForBoss,
  getNextRaidTime,
  checkRaidRequirements,
  joinRaid,
  attackBoss,
  completeRaid,
  failRaid,
  getRaidParticipants,
  getPlayerRaidStats,
  getBossList,
  createBossTemplate,
  updateBoss,
  updateBossRewards,
  deleteBoss,
  startAutoRaidCreation,
  checkAndCreateRaid,
  getNextRaidTimeForBoss,
  clearAllRaidParticipants,
  forceStartRaidWithBoss,
  getPlayerRaidAchievements,
  hasPlayerAchievement,
  speedupBossCooldown,
  scheduleRaidTimers
};
