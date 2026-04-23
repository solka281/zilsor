const db = require('./database_simple');

// База из 100 ежедневных квестов
const DAILY_QUESTS_POOL = [
  // Квесты на дуэли (20 квестов)
  { name: 'Воин арены', description: 'Победите в 1 дуэли', type: 'duel_win', requirement: 1, reward_gold: 50, reward_exp: 30 },
  { name: 'Боец дня', description: 'Победите в 2 дуэлях', type: 'duel_win', requirement: 2, reward_gold: 100, reward_exp: 60 },
  { name: 'Чемпион арены', description: 'Победите в 3 дуэлях', type: 'duel_win', requirement: 3, reward_gold: 150, reward_exp: 100 },
  { name: 'Мастер дуэлей', description: 'Победите в 5 дуэлях', type: 'duel_win', requirement: 5, reward_gold: 250, reward_exp: 150 },
  { name: 'Участник турнира', description: 'Проведите 3 дуэли', type: 'duel_participate', requirement: 3, reward_gold: 80, reward_exp: 50 },
  { name: 'Активный боец', description: 'Проведите 5 дуэлей', type: 'duel_participate', requirement: 5, reward_gold: 120, reward_exp: 80 },
  { name: 'Гладиатор', description: 'Проведите 7 дуэлей', type: 'duel_participate', requirement: 7, reward_gold: 180, reward_exp: 120 },
  { name: 'Непобедимый', description: 'Победите в 4 дуэлях подряд', type: 'duel_streak', requirement: 4, reward_gold: 200, reward_exp: 150 },
  { name: 'Серия побед', description: 'Победите в 3 дуэлях подряд', type: 'duel_streak', requirement: 3, reward_gold: 150, reward_exp: 100 },
  { name: 'Разминка', description: 'Победите в 1 дуэли', type: 'duel_win', requirement: 1, reward_gold: 40, reward_exp: 25 },
  { name: 'Тренировка', description: 'Проведите 2 дуэли', type: 'duel_participate', requirement: 2, reward_gold: 60, reward_exp: 40 },
  { name: 'Испытание силы', description: 'Победите в 2 дуэлях', type: 'duel_win', requirement: 2, reward_gold: 90, reward_exp: 55 },
  { name: 'Боевая практика', description: 'Проведите 4 дуэли', type: 'duel_participate', requirement: 4, reward_gold: 100, reward_exp: 70 },
  { name: 'Путь воина', description: 'Победите в 3 дуэлях', type: 'duel_win', requirement: 3, reward_gold: 140, reward_exp: 90 },
  { name: 'Арена славы', description: 'Проведите 6 дуэлей', type: 'duel_participate', requirement: 6, reward_gold: 160, reward_exp: 110 },
  { name: 'Легенда арены', description: 'Победите в 6 дуэлях', type: 'duel_win', requirement: 6, reward_gold: 300, reward_exp: 200 },
  { name: 'Испытание дня', description: 'Победите в 1 дуэли', type: 'duel_win', requirement: 1, reward_gold: 45, reward_exp: 28 },
  { name: 'Боевой дух', description: 'Проведите 3 дуэли', type: 'duel_participate', requirement: 3, reward_gold: 85, reward_exp: 52 },
  { name: 'Мастер боя', description: 'Победите в 4 дуэлях', type: 'duel_win', requirement: 4, reward_gold: 180, reward_exp: 120 },
  { name: 'Воин света', description: 'Победите в 2 дуэлях', type: 'duel_win', requirement: 2, reward_gold: 95, reward_exp: 58 },

  // Квесты на темный лес (20 квестов)
  { name: 'Исследователь леса', description: 'Победите 3 врагов в темном лесу', type: 'forest_win', requirement: 3, reward_gold: 80, reward_exp: 50 },
  { name: 'Охотник на монстров', description: 'Победите 5 врагов в темном лесу', type: 'forest_win', requirement: 5, reward_gold: 130, reward_exp: 80 },
  { name: 'Покоритель леса', description: 'Победите 7 врагов в темном лесу', type: 'forest_win', requirement: 7, reward_gold: 180, reward_exp: 120 },
  { name: 'Мастер леса', description: 'Победите 10 врагов в темном лесу', type: 'forest_win', requirement: 10, reward_gold: 250, reward_exp: 180 },
  { name: 'Прогулка по лесу', description: 'Победите 2 врагов в темном лесу', type: 'forest_win', requirement: 2, reward_gold: 60, reward_exp: 35 },
  { name: 'Лесной патруль', description: 'Победите 4 врагов в темном лесу', type: 'forest_win', requirement: 4, reward_gold: 100, reward_exp: 65 },
  { name: 'Темный охотник', description: 'Победите 6 врагов в темном лесу', type: 'forest_win', requirement: 6, reward_gold: 150, reward_exp: 100 },
  { name: 'Страж леса', description: 'Победите 8 врагов в темном лесу', type: 'forest_win', requirement: 8, reward_gold: 200, reward_exp: 140 },
  { name: 'Лесная тропа', description: 'Победите 1 врага в темном лесу', type: 'forest_win', requirement: 1, reward_gold: 40, reward_exp: 25 },
  { name: 'Глубины леса', description: 'Победите 5 врагов в темном лесу', type: 'forest_win', requirement: 5, reward_gold: 125, reward_exp: 75 },
  { name: 'Лесной воин', description: 'Победите 3 врагов в темном лесу', type: 'forest_win', requirement: 3, reward_gold: 85, reward_exp: 52 },
  { name: 'Тени леса', description: 'Победите 4 врагов в темном лесу', type: 'forest_win', requirement: 4, reward_gold: 105, reward_exp: 68 },
  { name: 'Лесная охота', description: 'Победите 2 врагов в темном лесу', type: 'forest_win', requirement: 2, reward_gold: 65, reward_exp: 38 },
  { name: 'Властелин леса', description: 'Победите 9 врагов в темном лесу', type: 'forest_win', requirement: 9, reward_gold: 220, reward_exp: 160 },
  { name: 'Лесной рейд', description: 'Победите 6 врагов в темном лесу', type: 'forest_win', requirement: 6, reward_gold: 155, reward_exp: 105 },
  { name: 'Темная тропа', description: 'Победите 3 врагов в темном лесу', type: 'forest_win', requirement: 3, reward_gold: 82, reward_exp: 48 },
  { name: 'Лесной дозор', description: 'Победите 5 врагов в темном лесу', type: 'forest_win', requirement: 5, reward_gold: 128, reward_exp: 78 },
  { name: 'Сердце леса', description: 'Победите 7 врагов в темном лесу', type: 'forest_win', requirement: 7, reward_gold: 175, reward_exp: 118 },
  { name: 'Лесная экспедиция', description: 'Победите 4 врагов в темном лесу', type: 'forest_win', requirement: 4, reward_gold: 102, reward_exp: 66 },
  { name: 'Темный путь', description: 'Победите 8 врагов в темном лесу', type: 'forest_win', requirement: 8, reward_gold: 195, reward_exp: 135 },

  // Квесты на поиск предметов (15 квестов)
  { name: 'Искатель сокровищ', description: 'Найдите 3 предмета', type: 'loot', requirement: 3, reward_gold: 70, reward_exp: 45 },
  { name: 'Коллекционер', description: 'Найдите 5 предметов', type: 'loot', requirement: 5, reward_gold: 110, reward_exp: 70 },
  { name: 'Мастер поиска', description: 'Найдите 7 предметов', type: 'loot', requirement: 7, reward_gold: 150, reward_exp: 100 },
  { name: 'Охотник за артефактами', description: 'Найдите 10 предметов', type: 'loot', requirement: 10, reward_gold: 220, reward_exp: 150 },
  { name: 'Первая находка', description: 'Найдите 1 предмет', type: 'loot', requirement: 1, reward_gold: 30, reward_exp: 20 },
  { name: 'Удачливый', description: 'Найдите 2 предмета', type: 'loot', requirement: 2, reward_gold: 50, reward_exp: 30 },
  { name: 'Кладоискатель', description: 'Найдите 4 предмета', type: 'loot', requirement: 4, reward_gold: 90, reward_exp: 55 },
  { name: 'Мастер удачи', description: 'Найдите 6 предметов', type: 'loot', requirement: 6, reward_gold: 130, reward_exp: 85 },
  { name: 'Легенда поиска', description: 'Найдите 8 предметов', type: 'loot', requirement: 8, reward_gold: 170, reward_exp: 115 },
  { name: 'Поиск сокровищ', description: 'Найдите 3 предмета', type: 'loot', requirement: 3, reward_gold: 72, reward_exp: 46 },
  { name: 'Охота за добычей', description: 'Найдите 5 предметов', type: 'loot', requirement: 5, reward_gold: 112, reward_exp: 72 },
  { name: 'Мастер находок', description: 'Найдите 4 предмета', type: 'loot', requirement: 4, reward_gold: 92, reward_exp: 57 },
  { name: 'Удача дня', description: 'Найдите 2 предмета', type: 'loot', requirement: 2, reward_gold: 52, reward_exp: 32 },
  { name: 'Великий искатель', description: 'Найдите 9 предметов', type: 'loot', requirement: 9, reward_gold: 195, reward_exp: 135 },
  { name: 'Путь удачи', description: 'Найдите 6 предметов', type: 'loot', requirement: 6, reward_gold: 132, reward_exp: 87 },

  // Квесты на прокачку (15 квестов)
  { name: 'Путь силы', description: 'Прокачайте расу 1 раз', type: 'upgrade', requirement: 1, reward_gold: 50, reward_exp: 30 },
  { name: 'Развитие', description: 'Прокачайте расу 2 раза', type: 'upgrade', requirement: 2, reward_gold: 90, reward_exp: 55 },
  { name: 'Эволюция', description: 'Прокачайте расу 3 раза', type: 'upgrade', requirement: 3, reward_gold: 130, reward_exp: 80 },
  { name: 'Мастер прокачки', description: 'Прокачайте расу 5 раз', type: 'upgrade', requirement: 5, reward_gold: 200, reward_exp: 130 },
  { name: 'Первый шаг', description: 'Прокачайте расу 1 раз', type: 'upgrade', requirement: 1, reward_gold: 48, reward_exp: 28 },
  { name: 'Рост силы', description: 'Прокачайте расу 2 раза', type: 'upgrade', requirement: 2, reward_gold: 88, reward_exp: 53 },
  { name: 'Путь развития', description: 'Прокачайте расу 3 раза', type: 'upgrade', requirement: 3, reward_gold: 128, reward_exp: 78 },
  { name: 'Совершенствование', description: 'Прокачайте расу 4 раза', type: 'upgrade', requirement: 4, reward_gold: 165, reward_exp: 105 },
  { name: 'Легенда силы', description: 'Прокачайте расу 6 раз', type: 'upgrade', requirement: 6, reward_gold: 240, reward_exp: 160 },
  { name: 'Усиление', description: 'Прокачайте расу 1 раз', type: 'upgrade', requirement: 1, reward_gold: 52, reward_exp: 32 },
  { name: 'Двойной рост', description: 'Прокачайте расу 2 раза', type: 'upgrade', requirement: 2, reward_gold: 92, reward_exp: 57 },
  { name: 'Тройная сила', description: 'Прокачайте расу 3 раза', type: 'upgrade', requirement: 3, reward_gold: 132, reward_exp: 82 },
  { name: 'Мощь героя', description: 'Прокачайте расу 4 раза', type: 'upgrade', requirement: 4, reward_gold: 168, reward_exp: 108 },
  { name: 'Великая сила', description: 'Прокачайте расу 5 раз', type: 'upgrade', requirement: 5, reward_gold: 205, reward_exp: 135 },
  { name: 'Путь героя', description: 'Прокачайте расу 2 раза', type: 'upgrade', requirement: 2, reward_gold: 95, reward_exp: 60 },

  // Квесты на работу (10 квестов)
  { name: 'Трудовой день', description: 'Поработайте 1 раз', type: 'work', requirement: 1, reward_gold: 40, reward_exp: 25 },
  { name: 'Усердный работник', description: 'Поработайте 2 раза', type: 'work', requirement: 2, reward_gold: 75, reward_exp: 45 },
  { name: 'Мастер труда', description: 'Поработайте 3 раза', type: 'work', requirement: 3, reward_gold: 110, reward_exp: 70 },
  { name: 'Трудяга', description: 'Поработайте 4 раза', type: 'work', requirement: 4, reward_gold: 145, reward_exp: 95 },
  { name: 'Легенда труда', description: 'Поработайте 5 раз', type: 'work', requirement: 5, reward_gold: 180, reward_exp: 120 },
  { name: 'Первая смена', description: 'Поработайте 1 раз', type: 'work', requirement: 1, reward_gold: 42, reward_exp: 26 },
  { name: 'Двойная смена', description: 'Поработайте 2 раза', type: 'work', requirement: 2, reward_gold: 78, reward_exp: 47 },
  { name: 'Рабочая неделя', description: 'Поработайте 3 раза', type: 'work', requirement: 3, reward_gold: 112, reward_exp: 72 },
  { name: 'Путь труда', description: 'Поработайте 2 раза', type: 'work', requirement: 2, reward_gold: 80, reward_exp: 50 },
  { name: 'Золотые руки', description: 'Поработайте 4 раза', type: 'work', requirement: 4, reward_gold: 148, reward_exp: 98 },

  // Квесты на золото (10 квестов)
  { name: 'Богатство', description: 'Накопите 1000 золота', type: 'gold_total', requirement: 1000, reward_gold: 100, reward_exp: 50 },
  { name: 'Состояние', description: 'Накопите 2000 золота', type: 'gold_total', requirement: 2000, reward_gold: 150, reward_exp: 80 },
  { name: 'Магнат', description: 'Накопите 3000 золота', type: 'gold_total', requirement: 3000, reward_gold: 200, reward_exp: 110 },
  { name: 'Миллионер', description: 'Накопите 5000 золота', type: 'gold_total', requirement: 5000, reward_gold: 300, reward_exp: 150 },
  { name: 'Первый капитал', description: 'Накопите 500 золота', type: 'gold_total', requirement: 500, reward_gold: 60, reward_exp: 35 },
  { name: 'Золотой запас', description: 'Накопите 1500 золота', type: 'gold_total', requirement: 1500, reward_gold: 120, reward_exp: 65 },
  { name: 'Богач', description: 'Накопите 2500 золота', type: 'gold_total', requirement: 2500, reward_gold: 175, reward_exp: 95 },
  { name: 'Казна героя', description: 'Накопите 4000 золота', type: 'gold_total', requirement: 4000, reward_gold: 250, reward_exp: 130 },
  { name: 'Путь богатства', description: 'Накопите 1200 золота', type: 'gold_total', requirement: 1200, reward_gold: 110, reward_exp: 55 },
  { name: 'Золотая лихорадка', description: 'Накопите 3500 золота', type: 'gold_total', requirement: 3500, reward_gold: 225, reward_exp: 120 },

  // Комбинированные квесты (10 квестов)
  { name: 'Универсал', description: 'Победите в 2 дуэлях и найдите 2 предмета', type: 'combo_duel_loot', requirement: 2, reward_gold: 120, reward_exp: 80 },
  { name: 'Мастер на все руки', description: 'Победите в 1 дуэли, найдите 1 предмет и поработайте 1 раз', type: 'combo_all', requirement: 1, reward_gold: 100, reward_exp: 65 },
  { name: 'Активный день', description: 'Победите 2 врагов в лесу и найдите 2 предмета', type: 'combo_forest_loot', requirement: 2, reward_gold: 110, reward_exp: 70 },
  { name: 'Путь героя', description: 'Победите в 1 дуэли и 2 врагов в лесу', type: 'combo_duel_forest', requirement: 1, reward_gold: 105, reward_exp: 68 },
  { name: 'Трудовой подвиг', description: 'Поработайте 2 раза и найдите 2 предмета', type: 'combo_work_loot', requirement: 2, reward_gold: 95, reward_exp: 60 },
  { name: 'Полный день', description: 'Победите в 1 дуэли, 1 враге в лесу и найдите 1 предмет', type: 'combo_triple', requirement: 1, reward_gold: 115, reward_exp: 75 },
  { name: 'Великий день', description: 'Победите в 2 дуэлях и 2 врагов в лесу', type: 'combo_battles', requirement: 2, reward_gold: 130, reward_exp: 85 },
  { name: 'День удачи', description: 'Найдите 3 предмета и поработайте 1 раз', type: 'combo_loot_work', requirement: 1, reward_gold: 90, reward_exp: 58 },
  { name: 'Боевой день', description: 'Победите в 1 дуэли и 3 врагов в лесу', type: 'combo_duel_forest', requirement: 1, reward_gold: 125, reward_exp: 82 },
  { name: 'Идеальный день', description: 'Победите в 1 дуэли, 1 враге в лесу, найдите 1 предмет и поработайте 1 раз', type: 'combo_perfect', requirement: 1, reward_gold: 150, reward_exp: 100 }
];

// Инициализация ежедневных квестов
function initializeDailyQuests() {
  console.log('Начинаем инициализацию ежедневных квестов...');
  
  // Проверяем есть ли квесты в таблице
  db.get(`SELECT COUNT(*) as count FROM daily_quests_pool`, (err, result) => {
    if (err) {
      console.error('Ошибка проверки пула квестов:', err);
      return;
    }
    
    if (result && result.count > 0) {
      console.log(`✅ База ежедневных квестов уже инициализирована (${result.count} квестов)`);
      return;
    }
    
    console.log('Пул квестов пуст, заполняем...');
    
    if (db.prepare) {
      const stmt = db.prepare(`INSERT OR IGNORE INTO daily_quests_pool 
        (name, description, type, requirement, reward_gold, reward_exp) 
        VALUES (?, ?, ?, ?, ?, ?)`);
      
      let count = 0;
      DAILY_QUESTS_POOL.forEach(quest => {
        stmt.run(quest.name, quest.description, quest.type, quest.requirement, 
                 quest.reward_gold, quest.reward_exp);
        count++;
      });
      
      stmt.finalize(() => {
        console.log(`✅ База ежедневных квестов инициализирована (${count} квестов)`);
      });
    }
  });
}

// Выдать случайные квесты игроку на день (3 для обычных, 5 для VIP)
function assignDailyQuests(playerId, callback) {
  const today = new Date().toISOString().split('T')[0];
  console.log(`📅 Выдача квестов игроку ${playerId} на дату: ${today}`);
  
  // Получаем информацию об игроке для проверки VIP статуса
  db.get(`SELECT vip FROM players WHERE user_id = ?`, [playerId], (err, player) => {
    if (err) {
      console.error('Ошибка получения игрока:', err);
      return callback(err);
    }
    
    const isVip = player && player.vip === 1;
    const questCount = isVip ? 5 : 3;
    console.log(`👤 Игрок ${playerId} ${isVip ? 'VIP' : 'обычный'}, выдаем ${questCount} квестов`);
    
    // Проверяем есть ли уже квесты на сегодня
    db.get(`SELECT COUNT(*) as count FROM player_daily_quests 
            WHERE player_id = ? AND DATE(assigned_at) = ? AND completed = 0`,
      [playerId, today], (err, result) => {
        if (err) {
          console.error('Ошибка проверки квестов:', err);
          return callback(err);
        }
        
        const currentQuests = result ? result.count : 0;
        console.log(`📊 Игрок ${playerId} имеет ${currentQuests} активных квестов на сегодня`);
        
        // Если уже есть нужное количество квестов - не выдаем новые
        if (currentQuests >= questCount) {
          console.log(`✅ Игрок ${playerId} уже имеет достаточно квестов`);
          return callback(null, { alreadyAssigned: true });
        }
        
        // Удаляем все старые квесты (не сегодняшние)
        db.run(`DELETE FROM player_daily_quests 
                WHERE player_id = ? AND DATE(assigned_at) != ?`,
          [playerId, today], (err) => {
            if (err) {
              console.error('Ошибка удаления старых квестов:', err);
            } else {
              console.log(`🗑️ Удалены старые квесты для игрока ${playerId}`);
            }
            
            // Если есть квесты на сегодня, но меньше нужного - удаляем их и выдаем новые
            if (currentQuests > 0 && currentQuests < questCount) {
              db.run(`DELETE FROM player_daily_quests 
                      WHERE player_id = ? AND DATE(assigned_at) = ?`,
                [playerId, today], (err) => {
                  if (err) {
                    console.error('Ошибка удаления неполных квестов:', err);
                  }
                  assignNewQuests(playerId, questCount, callback);
                });
            } else {
              assignNewQuests(playerId, questCount, callback);
            }
          });
      });
  });
}

// Вспомогательная функция для выдачи новых квестов
function assignNewQuests(playerId, questCount, callback) {
  const today = new Date().toISOString().split('T')[0];
  
  console.log(`🎯 Выдаем ${questCount} новых квестов игроку ${playerId}`);
  
  // Получаем случайные квесты
  db.all(`SELECT * FROM daily_quests_pool ORDER BY RANDOM() LIMIT ?`, [questCount], (err, quests) => {
    if (err) {
      console.error('Ошибка получения квестов из пула:', err);
      return callback(err);
    }
    
    if (!quests || quests.length === 0) {
      console.error('❌ Пул квестов пуст!');
      return callback(new Error('Пул квестов пуст'));
    }
    
    console.log(`📋 Получено ${quests.length} квестов из пула:`, quests.map(q => q.name));
    
    // Добавляем квесты игроку
    if (db.prepare) {
      const stmt = db.prepare(`INSERT INTO player_daily_quests 
        (player_id, quest_id, quest_name, quest_description, quest_type, requirement, reward_gold, reward_exp, progress, assigned_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`);
      
      let insertedCount = 0;
      quests.forEach(quest => {
        stmt.run(playerId, quest.id, quest.name, quest.description, quest.type, 
                 quest.requirement, quest.reward_gold, quest.reward_exp, (err) => {
          if (err) {
            console.error('Ошибка вставки квеста:', err);
          } else {
            insertedCount++;
            console.log(`✅ Квест "${quest.name}" добавлен игроку ${playerId}`);
          }
        });
      });
      
      stmt.finalize((err) => {
        if (err) {
          console.error('Ошибка финализации вставки квестов:', err);
        } else {
          console.log(`✅ Все квесты добавлены игроку ${playerId} (${insertedCount}/${quests.length})`);
        }
        callback(null, { quests, newlyAssigned: true, questCount: insertedCount });
      });
    } else {
      console.error('❌ db.prepare недоступен');
      callback(new Error('db.prepare недоступен'));
    }
  });
}

// Получить активные ежедневные квесты игрока
function getPlayerDailyQuests(playerId, callback) {
  const today = new Date().toISOString().split('T')[0];
  
  // Сначала удаляем старые квесты (не сегодняшние)
  db.run(`DELETE FROM player_daily_quests 
          WHERE player_id = ? AND DATE(assigned_at) != ?`,
    [playerId, today], (err) => {
      if (err) console.error('Ошибка удаления старых квестов:', err);
      
      // Получаем квесты на сегодня
      db.all(`SELECT * FROM player_daily_quests 
              WHERE player_id = ? AND DATE(assigned_at) = ? AND completed = 0
              ORDER BY id ASC`,
        [playerId, today], callback);
    });
}

// Обновить прогресс квеста
function updateQuestProgress(playerId, questType, amount, callback) {
  const today = new Date().toISOString().split('T')[0];
  
  console.log(`📊 Обновление прогресса: playerId=${playerId}, type=${questType}, amount=${amount}`);
  
  db.all(`SELECT * FROM player_daily_quests 
          WHERE player_id = ? AND quest_type = ? AND DATE(assigned_at) = ? AND completed = 0`,
    [playerId, questType, today], (err, quests) => {
      if (err) {
        console.error('Ошибка получения квестов:', err);
        return callback(err);
      }
      
      if (!quests || quests.length === 0) {
        console.log(`Нет активных квестов типа ${questType} для игрока ${playerId}`);
        return callback(null, []);
      }
      
      console.log(`Найдено ${quests.length} квестов типа ${questType}`);
      
      const completedQuests = [];
      let processed = 0;
      
      quests.forEach(quest => {
        let newProgress;
        
        // Для квестов на золото проверяем текущее количество, а не добавляем
        if (questType === 'gold_total') {
          newProgress = amount; // amount уже содержит текущее количество золота
        } else {
          newProgress = quest.progress + amount;
        }
        
        console.log(`Квест "${quest.quest_name}": ${quest.progress} -> ${newProgress} / ${quest.requirement}`);
        
        if (newProgress >= quest.requirement && quest.completed === 0) {
          // Квест выполнен!
          console.log(`✅ Квест "${quest.quest_name}" выполнен!`);
          
          // Помечаем квест как выполненный и удаляем его
          db.run(`UPDATE player_daily_quests SET progress = ?, completed = 1, completed_at = CURRENT_TIMESTAMP 
                  WHERE id = ?`, [newProgress, quest.id], (err) => {
            if (err) console.error('Ошибка обновления квеста:', err);
            
            // Выдаем награду
            db.run(`UPDATE players SET gold = gold + ?, exp = exp + ? WHERE user_id = ?`,
              [quest.reward_gold, quest.reward_exp, playerId], (err) => {
                if (err) {
                  console.error('Ошибка выдачи награды:', err);
                } else {
                  console.log(`💰 Награда выдана: ${quest.reward_gold} золота, ${quest.reward_exp} опыта`);
                }
                
                // Удаляем выполненный квест из таблицы
                db.run(`DELETE FROM player_daily_quests WHERE id = ?`, [quest.id], (err) => {
                  if (err) {
                    console.error('Ошибка удаления выполненного квеста:', err);
                  } else {
                    console.log(`🗑️ Выполненный квест "${quest.quest_name}" удален из списка`);
                  }
                  
                  processed++;
                  completedQuests.push({
                    ...quest,
                    progress: newProgress
                  });
                  
                  if (processed === quests.length) {
                    callback(null, completedQuests);
                  }
                });
              });
          });
        } else {
          // Обновляем прогресс
          db.run(`UPDATE player_daily_quests SET progress = ? WHERE id = ?`, [newProgress, quest.id], (err) => {
            if (err) {
              console.error('Ошибка обновления прогресса:', err);
            } else {
              console.log(`📈 Прогресс обновлен для квеста "${quest.quest_name}"`);
            }
            
            processed++;
            if (processed === quests.length) {
              callback(null, completedQuests);
            }
          });
        }
      });
    });
}

// Автоматическое обновление квестов в 00:00 для всех игроков
function startDailyQuestsScheduler() {
  console.log('🕐 Запуск планировщика ежедневных квестов...');
  
  // Функция проверки и обновления квестов
  function checkAndResetQuests() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Проверяем каждую минуту, если 00:00 - обновляем квесты
    if (hours === 0 && minutes === 0) {
      console.log('🌅 Полночь! Обновляем ежедневные квесты для всех игроков...');
      
      // Получаем всех игроков
      db.all(`SELECT user_id FROM players WHERE race_id IS NOT NULL`, (err, players) => {
        if (err) {
          console.error('Ошибка получения списка игроков:', err);
          return;
        }
        
        console.log(`📋 Найдено ${players.length} игроков для обновления квестов`);
        
        // Удаляем все старые квесты
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayDate = yesterday.toISOString().split('T')[0];
        
        db.run(`DELETE FROM player_daily_quests WHERE DATE(assigned_at) <= ?`, 
          [yesterdayDate], (err) => {
            if (err) {
              console.error('Ошибка удаления старых квестов:', err);
            } else {
              console.log('✅ Старые квесты удалены');
            }
            
            // Выдаем новые квесты всем игрокам
            let processed = 0;
            players.forEach(player => {
              assignDailyQuests(player.user_id, (err) => {
                processed++;
                if (err) {
                  console.error(`Ошибка выдачи квестов игроку ${player.user_id}:`, err);
                }
                
                if (processed === players.length) {
                  console.log(`✅ Квесты обновлены для ${players.length} игроков`);
                }
              });
            });
          });
      });
    }
  }
  
  // Проверяем каждую минуту
  setInterval(checkAndResetQuests, 60 * 1000); // Каждую минуту
  
  // Первая проверка сразу при запуске
  checkAndResetQuests();
  
  console.log('✅ Планировщик ежедневных квестов запущен');
}

module.exports = {
  DAILY_QUESTS_POOL,
  initializeDailyQuests,
  assignDailyQuests,
  getPlayerDailyQuests,
  updateQuestProgress,
  startDailyQuestsScheduler
};
