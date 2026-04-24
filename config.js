module.exports = {
  BOT_TOKEN: process.env.BOT_TOKEN || '8609569802:AAFUVzdCvy3haqeRHOnXcsJ8zJHXsNjS1GA',
  
  // Прокси настройки (раскомментируйте и настройте при необходимости)
  // PROXY: {
  //   host: '127.0.0.1',
  //   port: 1080,
  //   type: 'socks5' // или 'http'
  // },
  
  // Константы игры
  INITIAL_GOLD: 0,
  INITIAL_CRYSTALS: 10, // Стартовые кристаллы для первой крутки
  INITIAL_LEVEL: 1,
  DAILY_QUEST_RESET_HOUR: 0,
  
  // Кулдауны (в секундах)
  LOOT_COOLDOWN: 3600, // 1 час
  DUEL_COOLDOWN: 600, // 10 минут
  DAILY_REWARD_COOLDOWN: 86400, // 24 часа
  WORK_COOLDOWN: 7200, // 2 часа
  
  // Стоимость крутки рас
  RACE_ROLL_CRYSTAL_COST: 10,
  RACE_ROLL_GOLD_COST: 0, // Нельзя крутить за золото
  
  // Пробуждение - новая система
  AWAKENING_CRYSTAL_COST: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50], // Кристаллы за каждый уровень
  AWAKENING_FOREST_LEVEL_REQUIRED: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100], // Требуемый уровень леса
  AWAKENING_BOSSES_REQUIRED: [1, 3, 5, 8, 12, 16, 20, 25, 30, 35], // Требуемое количество убитых боссов
  
  // VIP подписка
  ADMIN_USERNAME: 'trimetillllll',
  VIP_CRYSTAL_REWARD: 500,
  VIP_EMOJI: '💎',
  
  // Обязательная подписка
  REQUIRED_CHANNEL: '@zilsor_of',
  
  // Логирование
  LOG_CHANNEL_ID: null, // ID канала для логов (устанавливается админом)
  
  // Опыт и уровни
  EXP_PER_LEVEL: 100,
  EXP_MULTIPLIER: 1.5,
  
  // Дуэли
  DUEL_REWARD_MULTIPLIER: 1.2,
  
  // Кланы
  CLAN_CREATE_COST: 1000,
  CLAN_MAX_MEMBERS: 50,
  
  // Редкости
  RARITY: {
    COMMON: { name: 'Обычный', color: '⚪️', chance: 60 },
    RARE: { name: 'Редкий', color: '🔵', chance: 25 },
    EPIC: { name: 'Эпический', color: '🟣', chance: 10 },
    MYTHIC: { name: 'Мистический', color: '🔴', chance: 4 },
    LEGENDARY: { name: 'Легендарный', color: '🟡', chance: 0.5 },
    SECRET: { name: 'Секретный', color: '⚫️', chance: 0.001 }
  }
};
