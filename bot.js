const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const db = require('./database_simple');
const races = require('./races');
const items = require('./items');
const quests = require('./quests');
const achievements = require('./achievements');
const clans = require('./clans');
const clanManagement = require('./clan_management');
const duels = require('./duels');
const monsters = require('./monsters');
const battleSystem = require('./battle_system');
const raceAbilities = require('./race_abilities');
const characteristics = require('./characteristics');
const mmrSystem = require('./mmr_system');
const potions = require('./potions');
const dailyQuests = require('./daily_quests');
const raids = require('./raids');
const marketplaceAPI = require('./marketplace_api');

const bot = new TelegramBot(config.BOT_TOKEN, { polling: true });

// Express сервер для маркетплейса
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('marketplace'));

// API маркетплейса
app.use('/api/marketplace', marketplaceAPI.router);

// Главная страница для проверки
app.get('/', (req, res) => {
  res.send(`
    <h1>🏪 Zilsor Race Marketplace</h1>
    <p>Маркетплейс работает!</p>
    <p>Сервер запущен на порту ${PORT}</p>
    <a href="/marketplace">Открыть маркетплейс</a>
  `);
});

// Health check для Railway
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', port: PORT });
});

// Редирект на маркетплейс
app.get('/marketplace', (req, res) => {
  res.sendFile(__dirname + '/marketplace/index.html');
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Сервер маркетплейса запущен на порту ${PORT}`);
  console.log(`🔗 URL: https://your-railway-domain.railway.app`);
});

// Инициализация маркетплейса
marketplaceAPI.initializeMarketplace();

// Utility functions - MUST be defined before use
// Функция для проверки размера изображения
function checkImageSize(imagePath) {
  try {
    const fullPath = path.join(__dirname, 'images', imagePath);
    if (!fs.existsSync(fullPath)) {
      return { exists: false, size: 0 };
    }
    
    const stats = fs.statSync(fullPath);
    const fileSizeInBytes = stats.size;
    const fileSizeInMB = fileSizeInBytes / (1024 * 1024);
    
    return {
      exists: true,
      size: fileSizeInBytes,
      sizeMB: fileSizeInMB.toFixed(2),
      tooLarge: fileSizeInMB > 10 // Telegram лимит ~20MB, но лучше держать под 10MB
    };
  } catch (error) {
    console.log(`Ошибка проверки размера ${imagePath}:`, error.message);
    return { exists: false, size: 0, error: error.message };
  }
}

// Безопасная отправка сообщений с обработкой ошибок
function safeSendMessage(chatId, text, options = {}) {
  // Убираем проблемные символы из markdown
  const safeText = text.replace(/\*([^*]*)\*/g, '$1'); // Убираем звездочки
  
  bot.sendMessage(chatId, safeText, {
    reply_markup: options.reply_markup
    // Полностью убираем parse_mode
  }).catch(error => {
    console.log('Ошибка отправки сообщения:', error.message);
    // Пытаемся отправить ещё более простую версию
    bot.sendMessage(chatId, safeText.replace(/[*_`]/g, ''), {
      reply_markup: options.reply_markup
    }).catch(err => console.log('Критическая ошибка отправки:', err.message));
  });
}

// Функция для отправки изображения с текстом
function sendImageWithText(chatId, imagePath, text, options = {}) {
  const safeText = text.replace(/\*([^*]*)\*/g, '$1'); // Убираем проблемные звездочки
  
  // Проверяем размер изображения
  const imageInfo = checkImageSize(imagePath);
  
  if (!imageInfo.exists) {
    console.log(`Изображение не найдено: ${imagePath}`);
    safeSendMessage(chatId, `📸 ${safeText}`, options);
    return;
  }
  
  if (imageInfo.tooLarge) {
    console.log(`Изображение ${imagePath} слишком большое: ${imageInfo.sizeMB}MB`);
    safeSendMessage(chatId, `📸 ${safeText}`, options);
    return;
  }
  
  const fullPath = path.join(__dirname, 'images', imagePath);
  
  // Отправляем изображение
  bot.sendPhoto(chatId, fullPath, {
    caption: safeText,
    reply_markup: options.reply_markup
  }).catch(error => {
    console.log(`Ошибка отправки фото ${imagePath} (${imageInfo.sizeMB}MB):`, error.message);
    
    // При любой ошибке отправляем текст
    safeSendMessage(chatId, `📸 ${safeText}`, options);
  });
}

// Функция для редактирования сообщения с изображением
function editImageWithText(chatId, messageId, imagePath, text, options = {}) {
  // Удаляем старое сообщение и отправляем новое
  bot.deleteMessage(chatId, messageId).catch(error => {
    console.log('Не удалось удалить сообщение:', error.message);
  });
  
  // Отправляем новое сообщение
  sendImageWithText(chatId, imagePath, text, options);
}

// Получить имя файла расы по названию
function getRaceImageName(raceName) {
  const raceMap = {
    'Человек': 'human.jpg',
    'Эльф': 'elf.jpg',
    'Дварф': 'dwarf.jpg',
    'Орк': 'orc.jpg',
    'Темный Эльф': 'dark_elf.jpg',
    'Полуорк': 'half_orc.jpg',
    'Гном': 'gnome.jpg',
    'Драконорожденный': 'dragonborn.jpg',
    'Демон': 'demon.jpg',
    'Ангел': 'angel.jpg',
    'Феникс': 'phoenix.jpg',
    'Вампир': 'vampire.jpg',
    'Титан': 'titan.jpg',
    'Бог Войны': 'war_god.jpg',
    'Древний': 'ancient.jpg',
    // Новые расы
    'Кентавр': 'centaur.jpg',
    'Минотавр': 'minotaur.jpg',
    'Элементаль': 'elemental.jpg',
    'Нежить': 'undead.jpg',
    'Оборотень': 'werewolf.jpg',
    'Дракон': 'dragon.jpg',
    'Лич': 'lich.jpg',
    'Джинн': 'genie.jpg'
  };
  
  return raceMap[raceName] || 'human.jpg';
}

// Безопасное редактирование текстовых сообщений
function safeEditMessageText(chatId, messageId, text, options = {}) {
  // Удаляем старое сообщение
  bot.deleteMessage(chatId, messageId).catch(() => {});
  
  // Отправляем новое
  safeSendMessage(chatId, text, options);
}

// Обработка ошибок polling
bot.on('polling_error', (error) => {
  console.log('Polling error:', error.message);
  
  // Логируем ошибку
  sendLogMessage(
    `❌ Ошибка polling\n` +
    `📝 Сообщение: ${error.message}\n` +
    `🔍 Код: ${error.code || 'неизвестно'}`,
    'ERROR'
  );
  
  // Если конфликт с другим ботом
  if (error.message.includes('409 Conflict')) {
    console.log('Обнаружен конфликт с другим экземпляром бота.');
    console.log('Остановка текущего экземпляра...');
    
    sendLogMessage(
      `⚠️ Конфликт экземпляров бота\n` +
      `🔄 Остановка текущего экземпляра...`,
      'WARNING'
    );
    
    // Останавливаем polling и завершаем процесс
    bot.stopPolling().then(() => {
      console.log('Polling остановлен. Завершение процесса...');
      process.exit(1);
    }).catch(() => {
      process.exit(1);
    });
  }
  
  // Другие ошибки - просто логируем
  if (error.message.includes('ETELEGRAM')) {
    console.log('Telegram API error, продолжаем работу...');
  }
});

// Обработка необработанных ошибок
process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Инициализация данных
races.initializeRaces();
items.initializeItems();
quests.initializeQuests();
achievements.initializeAchievements();
characteristics.initializeCharacteristics();
potions.initializePotions();
dailyQuests.initializeDailyQuests();
raids.initializeRaids();

// Запускаем автоматическое создание рейдов
raids.startAutoRaidCreation();

// Тестируем доступ к каналу при запуске
testChannelAccess();

// Проверка подписки на канал
async function checkSubscription(userId) {
  try {
    const member = await bot.getChatMember(config.REQUIRED_CHANNEL, userId);
    return ['member', 'administrator', 'creator'].includes(member.status);
  } catch (error) {
    console.log(`Ошибка проверки подписки для ${userId}:`, error.message);
    
    // Если ошибка "member list is inaccessible", значит у бота нет нужных прав
    if (error.message.includes('member list is inaccessible')) {
      console.log('❌ У бота нет прав на просмотр списка участников канала');
      console.log('💡 Решение: Дайте боту право "Просмотр сообщений" в настройках администратора канала');
      return true; // Временно пропускаем
    }
    
    if (error.message.includes('chat not found')) {
      console.log('❌ Канал не найден');
      return true; // Временно пропускаем
    }
    
    if (error.message.includes('Forbidden')) {
      console.log('❌ Доступ запрещён - бот не является администратором');
      return true; // Временно пропускаем
    }
    
    return false;
  }
}

// Тестовая функция для проверки канала
async function testChannelAccess() {
  try {
    console.log(`🔍 Тестируем доступ к каналу ${config.REQUIRED_CHANNEL}...`);
    
    // Пытаемся получить информацию о канале
    const chat = await bot.getChat(config.REQUIRED_CHANNEL);
    console.log(`✅ Канал найден: ${chat.title}`);
    console.log(`📊 Тип: ${chat.type}`);
    console.log(`👥 Участников: ${chat.members_count || 'неизвестно'}`);
    
    // Проверяем права бота в канале
    try {
      // Получаем информацию о боте
      const botInfo = await bot.getMe();
      const botMember = await bot.getChatMember(config.REQUIRED_CHANNEL, botInfo.id);
      console.log(`🤖 Статус бота в канале: ${botMember.status}`);
      
      if (botMember.status === 'administrator') {
        console.log(`✅ Бот является администратором`);
        
        // Проверяем конкретные права
        console.log(`📋 Права бота:`, {
          can_manage_chat: botMember.can_manage_chat,
          can_delete_messages: botMember.can_delete_messages,
          can_manage_video_chats: botMember.can_manage_video_chats,
          can_restrict_members: botMember.can_restrict_members,
          can_promote_members: botMember.can_promote_members,
          can_change_info: botMember.can_change_info,
          can_invite_users: botMember.can_invite_users,
          can_post_messages: botMember.can_post_messages,
          can_edit_messages: botMember.can_edit_messages,
          can_pin_messages: botMember.can_pin_messages
        });
      } else {
        console.log(`❌ Бот не является администратором (статус: ${botMember.status})`);
      }
    } catch (memberError) {
      console.log(`❌ Ошибка получения информации о боте: ${memberError.message}`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Ошибка доступа к каналу: ${error.message}`);
    
    if (error.message.includes('chat not found')) {
      console.log('💡 Канал не найден. Возможные причины:');
      console.log('   - Канал не существует');
      console.log('   - Неправильное имя канала');
      console.log('   - Канал приватный');
    } else if (error.message.includes('Forbidden')) {
      console.log('💡 Доступ запрещён. Возможные причины:');
      console.log('   - Бот не добавлен в канал');
      console.log('   - Бот не является администратором');
    }
    
    return false;
  }
}

// Отправка сообщения о необходимости подписки
function sendSubscriptionMessage(chatId) {
  const subscriptionKeyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📢 Подписаться на канал', url: `https://t.me/${config.REQUIRED_CHANNEL.replace('@', '')}` }
        ],
        [
          { text: '✅ Проверить подписку', callback_data: 'check_subscription' }
        ]
      ]
    }
  };

  bot.sendMessage(chatId, 
    `🔒 Для использования бота необходимо подписаться на канал!\n\n` +
    `📢 Канал: ${config.REQUIRED_CHANNEL}\n\n` +
    `После подписки нажмите "Проверить подписку"`,
    subscriptionKeyboard
  );
}

// Middleware для проверки подписки
async function requireSubscription(userId, chatId, callback) {
  const isSubscribed = await checkSubscription(userId);
  
  if (!isSubscribed) {
    sendSubscriptionMessage(chatId);
    return false;
  }
  
  if (callback) callback();
  return true;
}
function getOrCreatePlayer(userId, username, callback) {
  db.get(`SELECT * FROM players WHERE user_id = ?`, [userId], (err, player) => {
    if (err) return callback(err);
    
    if (player) {
      return callback(null, player);
    }
    
    // Создаем нового игрока БЕЗ расы, только с кристаллами
    db.run(`INSERT INTO players (user_id, username, gold, crystals, level, exp, power)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, username, 0, config.INITIAL_CRYSTALS, config.INITIAL_LEVEL, 0, 100],
      function(err) {
        if (err) return callback(err);
        
        // Логируем регистрацию нового игрока
        sendLogMessage(
          `🆕 Новый игрок зарегистрирован\n` +
          `👤 ID: ${userId}\n` +
          `📝 Username: @${username || 'без username'}\n` +
          `💎 Стартовые кристаллы: ${config.INITIAL_CRYSTALS}`,
          'USER'
        );
        
        db.get(`SELECT * FROM players WHERE user_id = ?`, [userId], callback);
      });
  });
}

// Проверка кулдауна
function checkCooldown(lastTime, cooldownSeconds) {
  // Если lastTime null, undefined или 0 - кулдаун готов
  if (!lastTime || lastTime === 0) {
    return { ready: true };
  }
  
  const now = Math.floor(Date.now() / 1000);
  const timePassed = now - lastTime;
  
  if (timePassed < cooldownSeconds) {
    const remaining = cooldownSeconds - timePassed;
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;
    
    let timeStr = '';
    if (hours > 0) timeStr += `${hours}ч `;
    if (minutes > 0) timeStr += `${minutes}м `;
    if (seconds > 0 || timeStr === '') timeStr += `${seconds}с`;
    
    return { 
      ready: false, 
      remaining: timeStr,
      remainingSeconds: remaining
    };
  }
  
  return { ready: true };
}

// Форматирование времени кулдауна
function formatCooldown(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) return `${hours}ч ${minutes}м`;
  if (minutes > 0) return `${minutes}м`;
  return `${seconds}с`;
}

// Форматирование характеристик предмета
function formatItemStats(item) {
  if (!item) return '';
  
  const stats = [];
  
  if (item.power_bonus > 0) stats.push(`⚡ +${item.power_bonus}`);
  if (item.hp_bonus > 0) stats.push(`❤️ +${item.hp_bonus}`);
  if (item.attack_bonus > 0) stats.push(`🗡️ +${item.attack_bonus}`);
  if (item.defense_bonus > 0) stats.push(`🛡️ +${item.defense_bonus}`);
  
  return stats.length > 0 ? `\n${stats.join(' | ')}` : '';
}

// Форматирование сообщения о кулдауне
function formatCooldownMessage(actionName, cooldown) {
  return `❌ ${actionName} недоступно!\n⏰ Можно использовать через ${cooldown.remaining}`;
}

// Отправка логов в канал
function sendLogMessage(message, type = 'INFO') {
  if (!config.LOG_CHANNEL_ID) {
    return; // Канал не установлен
  }
  
  const timestamp = new Date().toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  const typeEmojis = {
    'INFO': 'ℹ️',
    'ERROR': '❌',
    'WARNING': '⚠️',
    'SUCCESS': '✅',
    'SYSTEM': '🤖',
    'USER': '👤',
    'ADMIN': '👑',
    'DUEL': '⚔️',
    'QUEST': '📋',
    'CLAN': '🏰',
    'TEST': '🧪',
    'FOREST': '🌲',
    'RACE': '🧬',
    'ITEM': '🎒',
    'GOLD': '💰',
    'VIP': '💎',
    'WORK': '💼',
    'DAILY': '🎁'
  };
  
  const emoji = typeEmojis[type] || 'ℹ️';
  const logMessage = `${emoji} **[${type}]** ${timestamp}\n${message}`;
  
  bot.sendMessage(config.LOG_CHANNEL_ID, logMessage, { parse_mode: 'Markdown' }).catch((error) => {
    console.error('Ошибка отправки лога в канал:', error.message);
  });
}

// Начать пошаговый PvP бой
function startPvPBattle(player1Id, player2Id) {
  // Получаем статы обоих игроков
  duels.calculatePlayerPower(player1Id, (err, p1Stats) => {
    if (err) {
      console.error('Ошибка расчета силы игрока 1:', err);
      bot.sendMessage(player1Id, '❌ Ошибка начала дуэли');
      bot.sendMessage(player2Id, '❌ Ошибка начала дуэли');
      mmrSystem.clearActiveMatch(player1Id);
      mmrSystem.clearActiveMatch(player2Id);
      return;
    }
    
    duels.calculatePlayerPower(player2Id, (err, p2Stats) => {
      if (err) {
        console.error('Ошибка расчета силы игрока 2:', err);
        bot.sendMessage(player1Id, '❌ Ошибка начала дуэли');
        bot.sendMessage(player2Id, '❌ Ошибка начала дуэли');
        mmrSystem.clearActiveMatch(player1Id);
        mmrSystem.clearActiveMatch(player2Id);
        return;
      }
      
      // Создаем пошаговый бой
      const battle = battleSystem.createPvPBattle(player1Id, p1Stats, player2Id, p2Stats);
      
      // Уведомляем обоих игроков
      bot.sendMessage(player1Id, 
        `⚔️ Дуэль началась!\n\n` +
        `Противник: ${p2Stats.username}\n` +
        `Уровень: ${p2Stats.level}\n\n` +
        `Приготовьтесь к бою!`
      );
      
      bot.sendMessage(player2Id,
        `⚔️ Дуэль началась!\n\n` +
        `Противник: ${p1Stats.username}\n` +
        `Уровень: ${p1Stats.level}\n\n` +
        `Приготовьтесь к бою!`
      );
      
      // Показываем экраны боя обоим
      setTimeout(() => {
        showBattleScreen(player1Id, player1Id, null);
        showBattleScreen(player2Id, player2Id, null);
      }, 1500);
    });
  });
}

// Показать экран боя с кнопками действий
function showBattleScreen(userId, chatId, messageId) {
  const status = battleSystem.getBattleStatus(userId);
  if (!status) return;
  
  const playerHPBar = getHPBar(status.playerHPPercent);
  const enemyHPBar = getHPBar(status.enemyHPPercent);
  
  let battleText = 
    `⚔️ *БОЙ - Раунд ${status.round}*\n\n` +
    `${status.enemyEmoji} *${status.enemyName}*`;
  
  if (status.type === 'pvp') {
    battleText += ` (Ур. ${status.enemyLevel})\n`;
  } else {
    battleText += ` (Ур. ${status.enemyLevel})\n`;
  }
  
  battleText +=
    `${enemyHPBar} ${status.enemyHP}/${status.enemyMaxHP} HP\n\n` +
    `👤 *Вы*\n` +
    `${playerHPBar} ${status.playerHP}/${status.playerMaxHP} HP\n`;
  
  // Показываем энергию для спец атаки
  const safeEnergy = Math.max(0, Math.min(3, status.specialEnergy || 0));
  const energyBar = '⚡'.repeat(safeEnergy) + '⚪'.repeat(3 - safeEnergy);
  battleText += `${energyBar} Энергия: ${safeEnergy}/3\n\n`;
  
  if (status.waitingForOpponent) {
    battleText += `⏳ Ожидаем действия противника...`;
  } else {
    battleText += `💡 Выберите действие:`;
  }
  
  // Проверяем есть ли экипированное зелье
  db.get(`SELECT p.equipped_potion_id, pot.name, pp.quantity
          FROM players p
          LEFT JOIN potions pot ON p.equipped_potion_id = pot.id
          LEFT JOIN player_potions pp ON p.user_id = pp.player_id AND p.equipped_potion_id = pp.potion_id
          WHERE p.user_id = ?`, [userId], (err, potionData) => {
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '⚔️ Атака', callback_data: 'battle_attack' },
          { text: '🛡 Защита', callback_data: 'battle_defend' }
        ],
        [
          { text: status.specialReady ? '✨ Спец. атака (готова!)' : `✨ Спец. атака (${safeEnergy}/3)`, callback_data: 'battle_special' }
        ]
      ]
    };
    
    // Добавляем кнопку зелья если оно экипировано и есть в наличии
    if (potionData && potionData.equipped_potion_id && potionData.quantity > 0) {
      keyboard.inline_keyboard.push([
        { text: `🧪 ${potionData.name} (${potionData.quantity} шт)`, callback_data: 'battle_use_potion' }
      ]);
    }
    
    // Для PvE боя используем изображение локации или босса
    if (status.type === 'pve') {
      // Получаем уровень леса игрока
      db.get(`SELECT forest_level FROM players WHERE user_id = ?`, [userId], (err, player) => {
        if (err || !player) {
          // Fallback на обычное сообщение
          bot.sendMessage(chatId, battleText, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
          });
          return;
        }
        
        const forestLevel = player.forest_level || 1;
        const location = monsters.getLocationByLevel(forestLevel);
        
        // Проверяем это босс или обычный моб
        const battle = battleSystem.getBattle(userId);
        let imagePath = location.image;
        
        // Если это босс - используем изображение босса
        if (battle && battle.enemy && battle.enemy.isBoss) {
          const bossImages = {
            10: 'locations/boss_slime_king.jpg',
            20: 'locations/boss_alpha_wolf.jpg',
            30: 'locations/boss_orc_warchief.jpg',
            40: 'locations/boss_lich.jpg',
            50: 'locations/boss_fire_dragon.jpg',
            60: 'locations/boss_ice_colossus.jpg',
            70: 'locations/boss_ancient_dragon.jpg',
            80: 'locations/boss_shadow_lord.jpg',
            90: 'locations/boss_demon_lord.jpg',
            100: 'locations/boss_chaos_god.jpg',
            110: 'locations/boss_titan_destruction.jpg',
            120: 'locations/boss_abyss_lord.jpg'
          };
          
          if (bossImages[forestLevel]) {
            imagePath = bossImages[forestLevel];
          }
        }
        
        // Добавляем название локации в текст
        const locationText = `📍 *${location.name}*\n\n` + battleText;
        
        // Отправляем с изображением локации или босса
        if (messageId) {
          editImageWithText(chatId, messageId, imagePath, locationText, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
          });
        } else {
          // Если нет messageId, отправляем новое сообщение
          bot.sendPhoto(chatId, `./images/${imagePath}`, {
            caption: locationText,
            parse_mode: 'Markdown',
            reply_markup: keyboard
          }).catch(err => {
            // Если изображение не найдено, отправляем текстом
            bot.sendMessage(chatId, locationText, {
              parse_mode: 'Markdown',
              reply_markup: keyboard
            });
          });
        }
      });
    } else {
      // Для PvP боя отправляем обычное текстовое сообщение
      bot.sendMessage(chatId, battleText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
  });
}

// Обработать окончание PvP боя
function handlePvPBattleEnd(player1Id, player2Id, winnerId) {
  const loserId = winnerId === player1Id ? player2Id : player1Id;
  
  // Обновляем MMR
  mmrSystem.finishDuel(winnerId, loserId, (err, mmrResult) => {
    if (err) {
      console.error('Ошибка обновления MMR:', err);
      return;
    }
    
    const now = Math.floor(Date.now() / 1000);
    
    // Уведомляем обоих игроков
    [player1Id, player2Id].forEach(playerId => {
      const isWinner = winnerId === playerId;
      const mmrChange = isWinner ? mmrResult.winnerMMRChange : mmrResult.loserMMRChange;
      const newMMR = isWinner ? mmrResult.newWinnerMMR : mmrResult.newLoserMMR;
      const resultText = isWinner ? '🎉 ПОБЕДА!' : '😢 ПОРАЖЕНИЕ';
      const mmrText = mmrChange > 0 ? `+${mmrChange}` : `${mmrChange}`;
      const mmrColor = mmrChange > 0 ? '📈' : '📉';
      
      // Обновляем только время последней дуэли (убираем золото и опыт)
      db.run(`UPDATE players SET last_duel_time = ? WHERE user_id = ?`,
        [now, playerId], () => {
          
          // Обновляем прогресс квестов
          if (isWinner) {
            dailyQuests.updateQuestProgress(playerId, 'duel_win', 1, (err, completedQuests) => {
              if (completedQuests && completedQuests.length > 0) {
                completedQuests.forEach(quest => {
                  bot.sendMessage(playerId,
                    `✅ Квест выполнен!\n\n` +
                    `📋 ${quest.quest_name}\n` +
                    `🎁 +${quest.reward_gold}💰 +${quest.reward_exp}✨`
                  );
                });
              }
            });
          }
          
          dailyQuests.updateQuestProgress(playerId, 'duel_participate', 1, (err, completedQuests) => {
            if (completedQuests && completedQuests.length > 0) {
              completedQuests.forEach(quest => {
                bot.sendMessage(playerId,
                  `✅ Квест выполнен!\n\n` +
                  `📋 ${quest.quest_name}\n` +
                  `🎁 +${quest.reward_gold}💰 +${quest.reward_exp}✨`
                );
              });
            }
          });
          
          // Отправляем результат дуэли БЕЗ золота и опыта
          bot.sendMessage(playerId,
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `${resultText}\n\n` +
            `🏆 MMR: ${mmrColor} ${mmrText} (${newMMR})`,
            { parse_mode: 'Markdown', ...getMainMenu(true) }
          );
          
          // Логируем результат дуэли
          if (isWinner) {
            sendLogMessage(
              `⚔️ Дуэль завершена\n` +
              `🏆 Победитель: ${playerId}\n` +
              `� MMR: ${mmrText} (${newMMR})`,
              'DUEL'
            );
          }
          
          // Убираем checkLevelUp так как нет опыта
          
          if (isWinner) {
            achievements.checkAchievements(playerId, (err, newAchs) => {
              if (newAchs && newAchs.length > 0) {
                newAchs.forEach(ach => {
                  bot.sendMessage(playerId, 
                    `${ach.icon} Достижение: ${ach.name}\n💰 +${ach.reward_gold} золота`);
                });
              }
            });
          }
        });
    });
    
    // Очищаем активные матчи
    mmrSystem.clearActiveMatch(player1Id);
    mmrSystem.clearActiveMatch(player2Id);
    battleSystem.deleteBattle(player1Id);
  });
}

// Получить полоску HP
function getHPBar(percent) {
  const filled = Math.floor(percent / 10);
  const empty = 10 - filled;
  
  let bar = '';
  for (let i = 0; i < filled; i++) bar += '🟩';
  for (let i = 0; i < empty; i++) bar += '⬜';
  
  return bar;
}

// Получить прогресс-бар для квестов
function getProgressBar(current, total) {
  const percent = Math.min(100, (current / total) * 100);
  const filled = Math.floor(percent / 10);
  const empty = 10 - filled;
  
  let bar = '';
  for (let i = 0; i < filled; i++) bar += '🟦';
  for (let i = 0; i < empty; i++) bar += '⬜';
  
  return bar;
}

// Вспомогательная функция для логирования с информацией об игроке
function logWithPlayer(message, userId, callback) {
  if (!userId) {
    console.log(message);
    if (callback) callback();
    return;
  }
  
  db.get(`SELECT username, display_name FROM players WHERE user_id = ?`, [userId], (err, player) => {
    if (err || !player) {
      console.log(`${message} [ID: ${userId}]`);
    } else {
      const displayName = player.display_name || player.username || `User${userId}`;
      console.log(`${message} [${displayName} (${userId})]`);
    }
    if (callback) callback();
  });
}

// Обработать окончание боя
function handleBattleEnd(userId, victory) {
  logWithPlayer(`🏁 handleBattleEnd вызван: victory=${victory}`, userId);
  
  getOrCreatePlayer(userId, null, (err, player) => {
    if (err) {
      console.error('❌ Ошибка получения игрока:', err);
      return;
    }
    
    logWithPlayer(`👤 Игрок получен`, userId);
    
    const battle = battleSystem.getBattle(userId);
    if (!battle) {
      console.error('❌ Бой не найден!');
      return;
    }
    
    console.log(`⚔️ Бой найден, враг: ${battle.enemy.name}`);
    
    const enemy = battle.enemy;
    const goldReward = victory ? enemy.goldReward : Math.floor(enemy.goldReward * 0.2);
    let expReward = victory ? enemy.expReward : Math.floor(enemy.expReward * 0.2);
    
    // Применяем бонус к опыту от способности расы (Адаптация человека)
    expReward = raceAbilities.applyExpBonus(
      { specialAbility: battle.playerStats.specialAbility },
      expReward
    );
    
    const crystalReward = victory && enemy.isBoss ? enemy.crystalReward : 0;
    
    const now = Math.floor(Date.now() / 1000);
    
    console.log(`💰 Награды: gold=${goldReward}, exp=${expReward}, crystals=${crystalReward}`);
    
    // Повышаем уровень леса и очищаем врага ТОЛЬКО при победе
    const forestLevelUp = victory ? 1 : 0;
    const clearEnemy = victory ? null : player.current_forest_enemy;
    
    // Функция для отправки результата
    const sendBattleResult = (droppedItem) => {
      // Обновляем игрока
      db.run(`UPDATE players SET 
              last_forest_time = ?,
              gold = gold + ?,
              exp = exp + ?,
              awakening_xp = awakening_xp + ?,
              crystals = crystals + ?,
              forest_level = forest_level + ?,
              current_forest_enemy = ?
              WHERE user_id = ?`,
        [now, goldReward, expReward, expReward, crystalReward, forestLevelUp, clearEnemy, userId],
        (err) => {
          if (err) {
            console.error('❌ Ошибка обновления после боя:', err);
            return;
          }
          
          console.log(`✅ Игрок обновлен, отправляем сообщение`);
          
          // Получаем обновленные данные игрока
          db.get(`SELECT gold, exp FROM players WHERE user_id = ?`, [userId], (err, updatedPlayer) => {
            const currentGold = updatedPlayer ? updatedPlayer.gold : (player.gold + goldReward);
            const currentExp = updatedPlayer ? updatedPlayer.exp : (player.exp + expReward);
            
            const newForestLevel = (player.forest_level || 1) + (victory ? 1 : 0);
            const resultEmoji = victory ? '🎉' : '💀';
            const resultText = victory ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ';
            
            let message = 
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `${resultEmoji} *${resultText}*\n\n` +
              `${enemy.emoji} ${enemy.name}`;
            
            if (victory) {
              message += ` повержен!\n🌲 Уровень леса: ${newForestLevel}\n\n`;
            } else {
              message += ` победил!\n🌲 Уровень леса: ${player.forest_level || 1} (не изменился)\n\n`;
              message += `💡 Возвращайтесь через 30 секунд чтобы попробовать снова!\n\n`;
            }
            
            message += 
              `💰 Золото: +${goldReward} (${currentGold}💰)\n` +
              `✨ Опыт: +${expReward} (${currentExp}✨)\n` +
              `🔮 XP пробуждения: +${expReward}\n`;
            
            if (crystalReward > 0) {
              message += `💎 Кристаллы: +${crystalReward}\n`;
            }
            
            if (droppedItem) {
              const rarityIcon = config.RARITY[droppedItem.rarity].color;
              const itemStats = formatItemStats(droppedItem);
              message += `\n🎁 *Выпал предмет!*\n${rarityIcon} ${droppedItem.name}${itemStats}`;
            }
            
            bot.sendMessage(userId, message,
              { parse_mode: 'Markdown', ...getMainMenu(true) }
            ).then(() => {
              console.log(`✅ Сообщение отправлено`);
            }).catch(err => {
              console.error(`❌ Ошибка отправки сообщения:`, err);
            });
            
            checkLevelUp(userId);
            
            // Обновляем прогресс квестов
            if (victory) {
              dailyQuests.updateQuestProgress(userId, 'forest_win', 1, (err, completedQuests) => {
                if (completedQuests && completedQuests.length > 0) {
                  completedQuests.forEach(quest => {
                    bot.sendMessage(userId,
                      `✅ Квест выполнен!\n\n` +
                      `📋 ${quest.quest_name}\n` +
                      `🎁 +${quest.reward_gold}💰 +${quest.reward_exp}✨`
                    );
                  });
                }
              });
            }
            
            // Проверяем квесты на накопление золота
            db.get(`SELECT gold FROM players WHERE user_id = ?`, [userId], (err, player) => {
              if (player) {
                dailyQuests.updateQuestProgress(userId, 'gold_total', player.gold, (err, completedQuests) => {
                  if (completedQuests && completedQuests.length > 0) {
                    completedQuests.forEach(quest => {
                      bot.sendMessage(userId, 
                        `✅ Квест выполнен!\n\n` +
                        `📋 ${quest.quest_name}\n` +
                        `🎁 +${quest.reward_gold}💰 +${quest.reward_exp}✨`
                      );
                    });
                  }
                });
              }
            });
            
            if (victory) {
              achievements.checkAchievements(userId, (err, newAchs) => {
                if (newAchs && newAchs.length > 0) {
                  newAchs.forEach(ach => {
                    bot.sendMessage(userId, 
                      `${ach.icon} Достижение: ${ach.name}\n💰 +${ach.reward_gold} золота`);
                  });
                }
              });
            }
            
            // Удаляем бой
            battleSystem.deleteBattle(userId);
            console.log(`🗑️ Бой удален`);
          });
        });
    };
    
    // Проверяем дроп предмета (с боссов и обычных мобов)
    if (victory && enemy.itemDropChance && Math.random() < enemy.itemDropChance) {
      // Моб дропнул предмет!
      const items = require('./items');
      items.getRandomItem((err, item) => {
        if (!err && item) {
          items.addItemToInventory(userId, item.id, (err) => {
            if (err) console.error('Ошибка добавления предмета:', err);
            sendBattleResult(item);
            
            // Логируем дроп предмета
            sendLogMessage(
              `🎁 Предмет выпал в лесу\n` +
              `👤 Игрок: ${userId}\n` +
              `${enemy.isBoss ? '👑' : '👹'} Моб: ${enemy.name} (Ур.${enemy.level})\n` +
              `🎒 Предмет: ${item.name}\n` +
              `🎲 Шанс: ${Math.round(enemy.itemDropChance * 100)}%`,
              'SUCCESS'
            );
          });
        } else {
          sendBattleResult(null);
        }
      });
    } else {
      sendBattleResult(null);
    }
  });
}

// Провести дуэль и уведомить обоих игроков
function conductDuelAndNotify(player1Id, player2Id) {
  duels.conductDuel(player1Id, player2Id, (err, duelResult) => {
    if (err) {
      console.error('Ошибка дуэли:', err);
      bot.sendMessage(player1Id, '❌ Ошибка дуэли');
      bot.sendMessage(player2Id, '❌ Ошибка дуэли');
      mmrSystem.clearActiveMatch(player1Id);
      mmrSystem.clearActiveMatch(player2Id);
      return;
    }
    
    // Обновляем MMR
    mmrSystem.finishDuel(duelResult.winnerId, duelResult.loserId, (err, mmrResult) => {
      if (err) {
        console.error('Ошибка обновления MMR:', err);
        return;
      }
      
      // Полный лог боя (первые 10 строк для краткости)
      const battleText = duelResult.battleLog.slice(0, 10).join('\n');
      const now = Math.floor(Date.now() / 1000);
      
      // Уведомляем ОБОИХ игроков
      [player1Id, player2Id].forEach(playerId => {
        const isWinner = duelResult.winnerId === playerId;
        const mmrChange = isWinner ? mmrResult.winnerMMRChange : mmrResult.loserMMRChange;
        const newMMR = isWinner ? mmrResult.newWinnerMMR : mmrResult.newLoserMMR;
        const resultText = isWinner ? '🎉 ПОБЕДА!' : '😢 ПОРАЖЕНИЕ';
        const goldReward = isWinner ? 50 : 10;
        const expReward = isWinner ? 50 : 10;
        const awakeningXP = isWinner ? 100 : 20;
        const mmrText = mmrChange > 0 ? `+${mmrChange}` : `${mmrChange}`;
        const mmrColor = mmrChange > 0 ? '📈' : '📉';
        
        db.run(`UPDATE players SET last_duel_time = ?, gold = gold + ?, exp = exp + ?, awakening_xp = awakening_xp + ? WHERE user_id = ?`,
          [now, goldReward, expReward, awakeningXP, playerId], () => {
            
            bot.sendMessage(playerId,
              `${battleText}\n\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `${resultText}\n\n` +
              `💰 Золото: +${goldReward}\n` +
              `✨ Опыт: +${expReward}\n` +
              `🔮 XP пробуждения: +${awakeningXP}\n` +
              `🏆 MMR: ${mmrColor} ${mmrText} (${newMMR})\n\n` +
              `⚔️ Раундов: ${duelResult.rounds}`,
              { parse_mode: 'Markdown', ...getMainMenu(true) }
            );
            
            checkLevelUp(playerId);
            
            if (isWinner) {
              achievements.checkAchievements(playerId, (err, newAchs) => {
                if (newAchs && newAchs.length > 0) {
                  newAchs.forEach(ach => {
                    bot.sendMessage(playerId, 
                      `${ach.icon} Достижение: ${ach.name}\n💰 +${ach.reward_gold} золота`);
                  });
                }
              });
            }
          });
      });
      
      // Очищаем активные матчи
      mmrSystem.clearActiveMatch(player1Id);
      mmrSystem.clearActiveMatch(player2Id);
    });
  });
}

function checkLevelUp(playerId) {
  db.get(`SELECT * FROM players WHERE user_id = ?`, [playerId], (err, player) => {
    if (err || !player) return;
    
    const expNeeded = config.EXP_PER_LEVEL * Math.pow(config.EXP_MULTIPLIER, player.level - 1);
    
    if (player.exp >= expNeeded) {
      const newLevel = player.level + 1;
      db.run(`UPDATE players SET level = ?, exp = exp - ?, power = power + 10 WHERE user_id = ?`,
        [newLevel, expNeeded, playerId], () => {
          bot.sendMessage(playerId, `🎉 Поздравляем! Вы достигли ${newLevel} уровня!\n+10 к силе`);
          
          // Проверяем достижения
          achievements.checkAchievements(playerId, (err, newAchs) => {
            if (newAchs && newAchs.length > 0) {
              newAchs.forEach(ach => {
                bot.sendMessage(playerId, 
                  `${ach.icon} Достижение разблокировано: ${ach.name}\n${ach.description}\n💰 +${ach.reward_gold} золота`);
              });
            }
          });
        });
    }
  });
}

// Главное меню
function getMainMenu(hasRace = true) {
  const buttons = [];
  
  if (!hasRace) {
    buttons.push([
      { text: '🎰 КРУТИТЬ РАСУ', callback_data: 'roll_race' }
    ]);
  } else {
    buttons.push([
      { text: '👤 Профиль', callback_data: 'profile' },
      { text: '⚔️ Битвы', callback_data: 'battle_menu' }
    ]);
    buttons.push([
      { text: '🎒 Инвентарь', callback_data: 'inventory' },
      { text: '🔮 Развитие', callback_data: 'upgrade_menu' }
    ]);
    buttons.push([
      { text: '🏆 Рейтинг', callback_data: 'rating_menu' },
      { text: '🎁 Награды', callback_data: 'rewards_menu' }
    ]);
    buttons.push([
      { text: '🐉 Рейды', callback_data: 'raids_menu' },
      { text: '🛒 Магазин', callback_data: 'shop' }
    ]);
  }
  
  return {
    reply_markup: {
      inline_keyboard: buttons
    }
  };
}

// Меню битв
function getBattleMenu() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '⚔️ Дуэль', callback_data: 'duel' },
          { text: '🌲 Темный лес', callback_data: 'dark_forest' }
        ],
        [
          { text: '🎁 Найти предмет', callback_data: 'loot' }
        ],
        [
          { text: '🔙 Назад', callback_data: 'main_menu' }
        ]
      ]
    }
  };
}

// Меню рейтинга
function getRatingMenu() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🏆 Топ игроков', callback_data: 'top' }
        ],
        [
          { text: '🏰 Мой клан', callback_data: 'clan' },
          { text: '📊 Топ кланов', callback_data: 'clantop' }
        ],
        [
          { text: '🧬 Расы', callback_data: 'race_browser' },
          { text: '🏅 Достижения', callback_data: 'achievements' }
        ],
        [
          { text: '🔙 Назад', callback_data: 'main_menu' }
        ]
      ]
    }
  };
}

// Меню наград
function getRewardsMenu() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🎁 Ежедневная награда', callback_data: 'daily_reward' }
        ],
        [
          { text: '💼 Работа', callback_data: 'work' }
        ],
        [
          { text: '🎯 Квесты', callback_data: 'quests' }
        ],
        [
          { text: '👥 Пригласить друга', callback_data: 'referral' }
        ],
        [
          { text: '🔙 Назад', callback_data: 'main_menu' }
        ]
      ]
    }
  };
}

// Меню развития
function getUpgradeMenu() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🧬 Моя раса', callback_data: 'race' }
        ],
        [
          { text: '🎰 Крутить расу', callback_data: 'roll_race' }
        ],
        [
          { text: '📊 Характеристики', callback_data: 'characteristics' }
        ],
        [
          { text: '⬆️ Прокачать расу', callback_data: 'upgrade_race' }
        ],
        [
          { text: '🌟 Пробудить расу', callback_data: 'awaken' }
        ],
        [
          { text: '🔙 Назад', callback_data: 'main_menu' }
        ]
      ]
    }
  };
}

// Меню клана
function getClanMenu(isInClan, isLeader) {
  const buttons = [];
  
  if (isInClan) {
    buttons.push([{ text: '👥 Члены клана', callback_data: 'clan_members' }]);
    
    if (isLeader) {
      buttons.push([{ text: '⚙️ Настройки клана', callback_data: 'clan_settings' }]);
    } else {
      buttons.push([{ text: '🚪 Покинуть', callback_data: 'leave_clan' }]);
    }
  } else {
    buttons.push([{ text: '➕ Создать клан', callback_data: 'create_clan' }]);
  }
  
  buttons.push([{ text: '🔙 Назад', callback_data: 'rating_menu' }]);
  
  return {
    reply_markup: {
      inline_keyboard: buttons
    }
  };
}

// Показать карточку клана с навигацией
function showClanCard(chatId, messageId, clans, currentIndex, userId) {
  if (!clans || clans.length === 0) {
    return safeEditMessageText(chatId, messageId, '🏰 Нет кланов', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Назад', callback_data: 'rating_menu' }]
        ]
      }
    });
  }
  
  const clan = clans[currentIndex];
  const joinTypeIcon = clan.join_type === 'open' ? '🔓' : '🔒';
  const joinTypeText = clan.join_type === 'open' ? 'Открытый' : 'По заявкам';
  
  let message = `🏰 Топ кланов (${currentIndex + 1}/${clans.length})\n\n`;
  message += `📛 ${clan.name}\n`;
  
  if (clan.description) {
    message += `📝 ${clan.description}\n\n`;
  }
  
  message += `📊 Уровень: ${clan.level || 1}\n`;
  message += `👥 Участников: ${clan.current_members}/${clan.max_members || 20}\n`;
  message += `⚡ Общая сила: ${clan.total_power || 0}\n`;
  message += `${joinTypeIcon} ${joinTypeText}\n`;
  
  const buttons = [];
  
  // Навигация
  const navButtons = [];
  if (currentIndex > 0) {
    navButtons.push({ text: '◀️', callback_data: `clan_page_${currentIndex - 1}` });
  }
  if (currentIndex < clans.length - 1) {
    navButtons.push({ text: '▶️', callback_data: `clan_page_${currentIndex + 1}` });
  }
  if (navButtons.length > 0) {
    buttons.push(navButtons);
  }
  
  // Кнопка вступления/заявки
  db.get(`SELECT clan_id FROM players WHERE user_id = ?`, [userId], (err, player) => {
    if (!err && !player.clan_id) {
      const joinText = clan.join_type === 'open' ? '✅ Вступить' : '📝 Подать заявку';
      buttons.push([{ text: joinText, callback_data: `clan_join_${clan.id}` }]);
    }
    
    buttons.push([{ text: '🔙 Назад', callback_data: 'rating_menu' }]);
    
    // Если есть аватар, отправляем с фото
    if (clan.avatar_file_id) {
      bot.deleteMessage(chatId, messageId).catch(() => {});
      bot.sendPhoto(chatId, clan.avatar_file_id, {
        caption: message,
        reply_markup: { inline_keyboard: buttons }
      }).catch(() => {
        // Если ошибка с фото, отправляем текст
        bot.sendMessage(chatId, message, {
          reply_markup: { inline_keyboard: buttons }
        });
      });
    } else {
      safeEditMessageText(chatId, messageId, message, {
        reply_markup: { inline_keyboard: buttons }
      });
    }
  });
}

// Показать карточку расы с навигацией
function showRaceCard(chatId, messageId, races, currentIndex, userId) {
  if (!races || races.length === 0) {
    return safeEditMessageText(chatId, messageId, '🧬 Нет рас', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Назад', callback_data: 'rating_menu' }]
        ]
      }
    });
  }
  
  const race = races[currentIndex];
  const rarityIcon = config.RARITY[race.rarity] ? config.RARITY[race.rarity].color : '⚪';
  const rarityName = config.RARITY[race.rarity] ? config.RARITY[race.rarity].name : 'Обычная';
  
  let message = `🧬 Расы (${currentIndex + 1}/${races.length})\n\n`;
  message += `${rarityIcon} **${race.name}**\n`;
  message += `🎭 ${rarityName}\n\n`;
  
  if (race.description) {
    message += `📝 ${race.description}\n\n`;
  }
  
  message += `⚡ Базовая сила: ${race.base_power || 100}\n`;
  message += `❤️ Базовое HP: ${race.base_hp || 100}\n`;
  message += `⚔️ Базовая атака: ${race.base_attack || 50}\n`;
  message += `🛡️ Базовая защита: ${race.base_defense || 30}\n`;
  
  if (race.special_ability) {
    message += `\n✨ Способность: ${race.special_ability}`;
  }
  
  const buttons = [];
  
  // Навигация
  const navButtons = [];
  if (currentIndex > 0) {
    navButtons.push({ text: '◀️', callback_data: `race_page_${currentIndex - 1}` });
  }
  if (currentIndex < races.length - 1) {
    navButtons.push({ text: '▶️', callback_data: `race_page_${currentIndex + 1}` });
  }
  if (navButtons.length > 0) {
    buttons.push(navButtons);
  }
  
  buttons.push([{ text: '🔙 Назад', callback_data: 'rating_menu' }]);
  
  // Получаем правильное имя файла изображения расы
  const raceImage = getRaceImageName(race.name);
  
  // Отправляем с изображением расы
  editImageWithText(chatId, messageId, `races/${raceImage}`, message, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  });
}

// Функция показа выбора рейд-боссов с навигацией
function showRaidBossSelection(chatId, messageId, currentIndex = 0, userId, adminUsername) {
  console.log(`🎯 showRaidBossSelection вызвана: currentIndex=${currentIndex} [${adminUsername} (${userId})]`);
  
  // Получаем список всех боссов
  console.log('🔍 Получение списка боссов...');
  raids.getBossList((err, bosses) => {
    if (err || !bosses || bosses.length === 0) {
      console.log('❌ Боссы не найдены или ошибка:', err);
      return safeEditMessageText(chatId, messageId, '🐉 Нет доступных боссов', {
        reply_markup: {
          inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'raids_menu' }]]
        }
      });
    }
    
    // Сортируем боссов по уровню
    bosses.sort((a, b) => a.level - b.level);
    
    console.log(`📋 Найдено боссов в БД: ${bosses.length}`);
    bosses.forEach((boss, index) => {
      console.log(`${index + 1}. ${boss.name} (Уровень ${boss.level}, ID: ${boss.id})`);
    });
    
    // Проверяем индекс
    if (currentIndex >= bosses.length) currentIndex = 0;
    if (currentIndex < 0) currentIndex = bosses.length - 1;
    
    const boss = bosses[currentIndex];
    console.log(`🎯 Текущий босс: ${boss.name} (индекс ${currentIndex})`);
    
    // Проверяем есть ли активный рейд для ЭТОГО босса
    raids.getActiveRaidForBoss(boss.name, (err, activeRaid) => {
      if (err) {
        console.error('Ошибка получения активного рейда:', err);
        return safeEditMessageText(chatId, messageId, '❌ Ошибка загрузки рейда', {
          reply_markup: {
            inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'raids_menu' }]]
          }
        });
      }
      
      // Проверяем кулдаун босса
      raids.getNextRaidTimeForBoss(boss.name, (err, bossRaidTime) => {
        if (err) {
          console.error('Ошибка получения времени рейда для босса:', err);
          return safeEditMessageText(chatId, messageId, '❌ Ошибка', {
            reply_markup: {
              inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'raids_menu' }]]
            }
          });
        }
        
        // Формируем базовую информацию о боссе
        const hpBonus = boss.times_defeated * 5000;
        const totalHP = boss.base_hp + hpBonus;
        
        let requirementsText = '';
        if (boss.requirements) {
          try {
            const reqs = JSON.parse(boss.requirements);
            requirementsText = '\n📋 *Условия участия:*\n';
            if (reqs.min_race_level) {
              requirementsText += `• Уровень расы ${reqs.min_race_level}+\n`;
            }
            if (reqs.required_raid_participation) {
              requirementsText += `• Участие в рейде "${reqs.required_raid_participation}"\n`;
            }
          } catch (e) {
            console.error('Ошибка парсинга требований босса:', e);
          }
        }
        
        let specialRewardsText = '';
        if (boss.special_rewards) {
          try {
            const specialRewards = JSON.parse(boss.special_rewards);
            if (specialRewards.top_1_guaranteed_item) {
              specialRewardsText = '\n🎁 *Специальная награда:*\n' +
                `• Топ-1 по урону получает ${specialRewards.top_1_guaranteed_item}\n`;
            }
          } catch (e) {
            console.error('Ошибка парсинга специальных наград:', e);
          }
        }
        
        // Определяем статус босса и формируем сообщение
        let message, buttons = [];
        
        // Навигация (всегда показываем если боссов больше 1)
        if (bosses.length > 1) {
          const navButtons = [];
          if (currentIndex > 0) {
            navButtons.push({ text: '◀️', callback_data: `raid_boss_page_${currentIndex - 1}` });
          }
          if (currentIndex < bosses.length - 1) {
            navButtons.push({ text: '▶️', callback_data: `raid_boss_page_${currentIndex + 1}` });
          }
          if (navButtons.length > 0) {
            buttons.push(navButtons);
          }
        }
        
        // Проверяем статус босса
        if (activeRaid && activeRaid.boss_name === boss.name) {
          // АКТИВНЫЙ РЕЙД с этим боссом - проверяем участие игрока
          db.get(`SELECT * FROM raid_participants WHERE raid_id = ? AND user_id = ?`, [activeRaid.id, userId], (err, participant) => {
            const hasJoined = !!participant;
            const timeLeft = Math.floor((new Date(activeRaid.ends_at) - new Date()) / 1000 / 60);
            
            message = `🐉 *АКТИВНЫЙ РЕЙД* (${currentIndex + 1}/${bosses.length})\n\n` +
              `🌪️ ${boss.name}\n` +
              `⭐ Уровень: ${boss.level}\n` +
              `📝 ${boss.description}\n${requirementsText}${specialRewardsText}\n` +
              `❤️ HP: ${activeRaid.current_hp.toLocaleString()}/${activeRaid.boss_hp.toLocaleString()}\n` +
              `🏆 Побед: ${boss.times_defeated}\n` +
              `⏰ Осталось: ${timeLeft} мин\n\n` +
              `💰 Награды (делятся по урону):\n`;
            
            try {
              const rewards = JSON.parse(boss.rewards);
              message += `• ${rewards.total_gold} золота\n` +
                `• ${rewards.total_crystals} алмазов\n` +
                `• ${rewards.total_exp} опыта\n\n`;
            } catch (e) {
              console.error('Ошибка парсинга наград:', e);
            }
            
            if (hasJoined) {
              message += `✅ *Вы участвуете в рейде!*`;
              buttons.push([{ text: '⚔️ В бой!', callback_data: `raid_battle_${activeRaid.id}` }]);
            } else {
              // Проверяем условия участия
              raids.checkRaidRequirements(userId, boss.name, (err, requirements) => {
                const canJoin = requirements ? requirements.canJoin : true;
                const requirementReason = requirements ? requirements.reason : '';
                
                if (canJoin) {
                  message += `⚠️ *Присоединитесь к рейду чтобы атаковать!*`;
                  buttons.push([{ text: '⚔️ Присоединиться к рейду', callback_data: `join_raid_${activeRaid.id}` }]);
                } else {
                  message += `❌ *${requirementReason}*`;
                  buttons.push([{ text: `❌ ${requirementReason}`, callback_data: 'raid_not_ready' }]);
                }
                
                // Общие кнопки
                buttons.push([{ text: '👥 Участники', callback_data: `raid_participants_${activeRaid.id}` }]);
                buttons.push([{ text: '🔄 Обновить', callback_data: 'select_raid_boss' }]);
                buttons.push([{ text: '🔙 Назад', callback_data: 'raids_menu' }]);
                
                console.log(`🎮 Отправляем клавиатуру с ${buttons.length} рядами кнопок`);
                buttons.forEach((row, index) => {
                  console.log(`Ряд ${index + 1}: ${row.map(btn => btn.text).join(', ')}`);
                });
                
                // Отправляем сообщение с изображением босса
                editImageWithText(chatId, messageId, `raids/${boss.image}`, message, {
                  parse_mode: 'Markdown',
                  reply_markup: { inline_keyboard: buttons }
                });
              });
              return;
            }
            
            // Общие кнопки для участника
            buttons.push([{ text: '👥 Участники', callback_data: `raid_participants_${activeRaid.id}` }]);
            buttons.push([{ text: '🔄 Обновить', callback_data: 'select_raid_boss' }]);
            buttons.push([{ text: '🔙 Назад', callback_data: 'raids_menu' }]);
            
            console.log(`🎮 Отправляем клавиатуру с ${buttons.length} рядами кнопок`);
            buttons.forEach((row, index) => {
              console.log(`Ряд ${index + 1}: ${row.map(btn => btn.text).join(', ')}`);
            });
            
            // Отправляем сообщение с изображением босса
            editImageWithText(chatId, messageId, `raids/${boss.image}`, message, {
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: buttons }
            });
          });
          return;
          
        } else if (!bossRaidTime.ready) {
          // БОСС НА КУЛДАУНЕ
          const minutes = Math.floor(bossRaidTime.timeLeft / 60);
          const seconds = bossRaidTime.timeLeft % 60;
          
          message = `🐉 *РЕЙД-БОСС* (${currentIndex + 1}/${bosses.length})\n\n` +
            `🌪️ ${boss.name}\n` +
            `⭐ Уровень: ${boss.level}\n` +
            `📝 ${boss.description}\n${requirementsText}${specialRewardsText}\n` +
            `❤️ HP: ${totalHP.toLocaleString()}\n` +
            `🏆 Побед: ${boss.times_defeated} (+${hpBonus.toLocaleString()} HP)\n` +
            `⏰ Кулдаун: ${boss.cooldown_hours || 2} часов\n\n` +
            `💰 Награды (делятся по урону):\n`;
          
          try {
            const rewards = JSON.parse(boss.rewards);
            message += `• ${rewards.total_gold} золота\n` +
              `• ${rewards.total_crystals} алмазов\n` +
              `• ${rewards.total_exp} опыта\n\n`;
          } catch (e) {
            console.error('Ошибка парсинга наград:', e);
          }
          
          message += `⏰ *Рейд появится через:*\n${minutes} мин ${seconds} сек`;
          
          buttons.push([{ text: '⏰ Рейд пока недоступен', callback_data: 'raid_not_ready' }]);
          
          // Админские кнопки
          if (adminUsername === config.ADMIN_USERNAME) {
            buttons.push([
              { text: '⏱️ Ускорить (1 мин)', callback_data: `admin_speedup_raid_${boss.id}` },
              { text: '⚡ Начать сейчас', callback_data: `admin_force_start_raid_${boss.id}` }
            ]);
          }
          
        } else {
          // БОСС ГОТОВ К ЗАПУСКУ - создаем рейд автоматически
          console.log(`✅ Босс "${boss.name}" готов! Создаем рейд...`);
          
          // Создаем новый рейд с этим боссом (независимо от других активных рейдов)
          raids.createRaidFromBoss(boss, (err, newRaid) => {
            if (err) {
              console.error('Ошибка создания рейда:', err);
              
              message = `🐉 *РЕЙД-БОСС* (${currentIndex + 1}/${bosses.length})\n\n` +
                `🌪️ ${boss.name}\n` +
                `⭐ Уровень: ${boss.level}\n` +
                `📝 ${boss.description}\n${requirementsText}${specialRewardsText}\n` +
                `❤️ HP: ${totalHP.toLocaleString()}\n` +
                `🏆 Побед: ${boss.times_defeated} (+${hpBonus.toLocaleString()} HP)\n\n` +
                `❌ *Ошибка создания рейда*\n` +
                `Попробуйте обновить через несколько секунд`;
              
              buttons.push([{ text: '🔄 Обновить', callback_data: 'select_raid_boss' }]);
              buttons.push([{ text: '🔙 Назад', callback_data: 'raids_menu' }]);
              
              editImageWithText(chatId, messageId, `raids/${boss.image}`, message, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: buttons }
              });
              return;
            }
            
            console.log(`✅ Рейд создан! Обновляем интерфейс...`);
            // Рейд создан - обновляем интерфейс (рекурсивно вызываем функцию)
            showRaidBossSelection(chatId, messageId, currentIndex, userId, adminUsername);
          });
          return; // Выходим, ждем создания рейда
        }
        
        // Общие кнопки
        buttons.push([{ text: '🔄 Обновить', callback_data: 'select_raid_boss' }]);
        buttons.push([{ text: '🔙 Назад', callback_data: 'raids_menu' }]);
        
        console.log(`🎮 Отправляем клавиатуру с ${buttons.length} рядами кнопок`);
        buttons.forEach((row, index) => {
          console.log(`Ряд ${index + 1}: ${row.map(btn => btn.text).join(', ')}`);
        });
        
        // Отправляем сообщение с изображением босса
        editImageWithText(chatId, messageId, `raids/${boss.image}`, message, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        });
      });
    });
  });
}

// Функция показа меню битвы с боссом
function showRaidBattleMenu(chatId, messageId, raidId, userId) {
  console.log(`⚔️ Открываем меню битвы: raidId=${raidId}, userId=${userId}`);
  
  // Получаем информацию о рейде
  db.get(`SELECT ar.*, rb.image as boss_image 
          FROM active_raids ar
          LEFT JOIN raid_bosses rb ON ar.boss_id = rb.id
          WHERE ar.id = ?`, [raidId], (err, raid) => {
    if (err || !raid) {
      console.error('Ошибка получения рейда:', err);
      return safeEditMessageText(chatId, messageId, '❌ Рейд не найден', {
        reply_markup: {
          inline_keyboard: [[{ text: '🔙 К выбору боссов', callback_data: 'select_raid_boss' }]]
        }
      });
    }
    
    // Получаем топ участников по урону
    db.all(`SELECT rp.*, p.display_name, p.username 
            FROM raid_participants rp
            LEFT JOIN players p ON rp.user_id = p.user_id
            WHERE rp.raid_id = ?
            ORDER BY rp.damage_dealt DESC
            LIMIT 10`, [raidId], (err, participants) => {
      if (err) {
        console.error('Ошибка получения участников:', err);
        participants = [];
      }
      
      const totalDamage = participants.reduce((sum, p) => sum + p.damage_dealt, 0);
      const hpPercent = Math.floor((raid.current_hp / raid.boss_hp) * 100);
      const timeLeft = Math.floor((new Date(raid.ends_at) - new Date()) / 1000 / 60);
      
      // Формируем полоску HP
      const barLength = 20;
      const filledBars = Math.floor((raid.current_hp / raid.boss_hp) * barLength);
      const emptyBars = barLength - filledBars;
      const hpBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
      
      let message = `⚔️ *БИТВА С БОССОМ*\n\n` +
        `🐉 ${raid.boss_name} (Ур.${raid.boss_level})\n` +
        `⏰ Осталось: ${timeLeft} мин\n\n` +
        `❤️ HP: ${raid.current_hp.toLocaleString()}/${raid.boss_hp.toLocaleString()} (${hpPercent}%)\n` +
        `${hpBar}\n\n`;
      
      if (participants.length > 0) {
        message += `📊 *ТОП ПО УРОНУ:*\n\n`;
        
        participants.forEach((p, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
          const damagePercent = totalDamage > 0 ? Math.floor((p.damage_dealt / totalDamage) * 100) : 0;
          const playerName = p.display_name || p.username || `Игрок ${p.user_id}`;
          
          message += `${medal} ${playerName}\n`;
          message += `   ⚔️ ${p.damage_dealt.toLocaleString()} урона (${damagePercent}%)\n`;
        });
      } else {
        message += `⚠️ *Пока нет участников*\n`;
      }
      
      const buttons = [
        [{ text: '⚔️ АТАКОВАТЬ', callback_data: `attack_raid_${raidId}` }],
        [{ text: '🔄 Обновить', callback_data: `raid_battle_${raidId}` }],
        [{ text: '🔙 К выбору боссов', callback_data: 'select_raid_boss' }]
      ];
      
      // Отправляем сообщение с изображением босса
      editImageWithText(chatId, messageId, `raids/${raid.boss_image}`, message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });
    });
  });
}

// Команды бота
bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
  const userId = msg.from.id;
  const username = msg.from.username || msg.from.first_name;
  const referralCode = match[1]; // Реферальный код (ID пригласившего)
  
  console.log(`🚀 /start вызван: userId=${userId}, username=${username}, referralCode=${referralCode}`);
  
  // Проверяем подписку
  const isSubscribed = await requireSubscription(userId, msg.chat.id);
  if (!isSubscribed) return;
  
  getOrCreatePlayer(userId, username, (err, player) => {
    if (err) {
      console.error('❌ Ошибка создания игрока:', err);
      return bot.sendMessage(userId, '❌ Ошибка');
    }
    
    console.log(`👤 Игрок получен: race_id=${player.race_id}, referrer_id=${player.referrer_id}`);
    
    // Если есть реферальный код и у игрока еще нет реферера
    if (referralCode && !player.referrer_id) {
      const referrerId = parseInt(referralCode);
      
      console.log(`🔗 Обработка реферального кода: referrerId=${referrerId}, userId=${userId}`);
      
      // Проверяем что это не сам себя
      if (referrerId !== userId && !isNaN(referrerId)) {
        // Проверяем что реферер существует
        db.get(`SELECT * FROM players WHERE user_id = ?`, [referrerId], (err, referrer) => {
          if (!err && referrer) {
            console.log(`✅ Реферер найден: ${referrer.username} (ID: ${referrerId})`);
            
            // Сохраняем реферера и сразу выдаем награду
            db.run(`UPDATE players SET referrer_id = ?, referral_rewarded = 1 WHERE user_id = ?`, [referrerId, userId], (err) => {
              if (err) console.error('Ошибка сохранения реферера:', err);
              else console.log(`✅ Реферер сохранен для userId=${userId}`);
            });
            
            // Выдаем награду рефереру сразу
            db.run(`UPDATE players SET crystals = crystals + 1, referral_count = referral_count + 1 WHERE user_id = ?`,
              [referrerId], (err) => {
                if (!err) {
                  console.log(`✅ Награда выдана рефереру ${referrerId}`);
                  
                  // Уведомляем реферера
                  bot.sendMessage(referrerId, 
                    `🎉 По вашей ссылке зарегистрировался новый игрок!\n💎 +1 кристалл за приглашение!`
                  ).catch(() => {});
                  
                  // Уведомляем нового игрока
                  bot.sendMessage(userId, 
                    `✅ Вы перешли по реферальной ссылке!\n💎 Ваш друг получил 1 кристалл за приглашение!`
                  );
                } else {
                  console.error('❌ Ошибка выдачи награды:', err);
                }
              });
          } else {
            console.log(`❌ Реферер не найден или ошибка: ${err?.message}`);
          }
        });
      } else {
        console.log(`❌ Некорректный реферальный код: referrerId=${referrerId}, userId=${userId}`);
      }
    } else {
      console.log(`ℹ️ Реферальный код не обрабатывается: referralCode=${referralCode}, referrer_id=${player.referrer_id}`);
    }
    
    if (!player.race_id) {
      sendImageWithText(userId, 'main_menu.jpg',
        `🎮 Добро пожаловать!\n\n` +
        `💎 Кристаллы: ${player.crystals}\n\n` +
        `🎰 Получите свою первую расу!`,
        getMainMenu(false)
      );
    } else {
      db.get(`SELECT * FROM races WHERE id = ?`, [player.race_id], (err, race) => {
        const rarityIcon = config.RARITY[race.rarity].color;
        const vipIcon = player.is_vip ? '💎 ' : '';
        const raceImage = getRaceImageName(race.name);
        
        sendImageWithText(userId, `races/${raceImage}`,
          `${vipIcon}${player.display_name || username}\n\n` +
          `${rarityIcon} ${race.name} • Ур.${player.level}\n` +
          `⚡ ${player.power} | 💰 ${player.gold} | 💎 ${player.crystals}`,
          getMainMenu(true)
        );
      });
    }
  });
});

bot.onText(/\/menu/, async (msg) => {
  const userId = msg.from.id;
  
  // Проверяем подписку
  const isSubscribed = await requireSubscription(userId, msg.chat.id);
  if (!isSubscribed) return;
  
  getOrCreatePlayer(userId, msg.from.username, (err, player) => {
    sendImageWithText(msg.chat.id, 'main_menu.jpg', '🎮 Главное меню:', getMainMenu(!!player.race_id));
  });
});

bot.onText(/\/help/, async (msg) => {
  const userId = msg.from.id;
  
  // Проверяем подписку
  const isSubscribed = await requireSubscription(userId, msg.chat.id);
  if (!isSubscribed) return;
  
  const helpText = `
📋 Как играть:

🎮 Используйте /menu для открытия главного меню с кнопками

📝 Основные команды:
/start - Начать игру
/menu - Главное меню
/profile - Ваш профиль
/help - Эта справка

💡 Все остальные действия доступны через кнопки в меню!

🎯 Советы:
• Выполняйте ежедневные квесты
• Собирайте предметы и экипируйте их
• Участвуйте в дуэлях
• Вступайте в кланы
• Прокачивайте и пробуждайте расу
`;
  
  bot.sendMessage(msg.chat.id, helpText, getMainMenu(true));
});

// Команда для создания рекламы (только для админа)
bot.onText(/\/makead/, async (msg) => {
  const userId = msg.from.id;
  const username = msg.from.username;
  
  if (username !== config.ADMIN_USERNAME.replace('@', '')) {
    return bot.sendMessage(userId, '❌ Эта команда доступна только администратору');
  }
  
  adminState.set(userId, { action: 'makead_photo' });
  
  bot.sendMessage(userId, 
    '📸 <b>Создание рекламы</b>\n\n' +
    'Шаг 1/2: Отправьте фото для рекламы\n\n' +
    '💡 <b>Подсказка:</b>\n' +
    '• Используйте качественное изображение\n' +
    '• Рекомендуемый размер: 1280x720 или больше\n' +
    '• Формат: JPG, PNG',
    { parse_mode: 'HTML' }
  );
});

// Админ-панель
bot.onText(/\/admin/, async (msg) => {
  const userId = msg.from.id;
  const username = msg.from.username;
  
  // Проверка прав администратора
  if (username !== config.ADMIN_USERNAME) {
    return bot.sendMessage(userId, '❌ У вас нет прав администратора');
  }
  
  bot.sendMessage(userId, 
    `👑 *АДМИН-ПАНЕЛЬ*\n\n` +
    `Выберите действие:`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '💎 Выдать VIP', callback_data: 'admin_give_vip' }
          ],
          [
            { text: '💰 Выдать золото', callback_data: 'admin_give_gold' },
            { text: '💎 Выдать кристаллы', callback_data: 'admin_give_crystals' }
          ],
          [
            { text: '⏰ Сбросить кулдауны', callback_data: 'admin_reset_cooldowns' }
          ],
          [
            { text: '🗑️ Удалить игрока', callback_data: 'admin_delete_player' }
          ],
          [
            { text: '📢 Глобальное сообщение', callback_data: 'admin_broadcast' },
            { text: '💬 Личное сообщение', callback_data: 'admin_private_message' }
          ],
          [
            { text: '🧬 Управление расами', callback_data: 'admin_races' },
            { text: '🎒 Управление предметами', callback_data: 'admin_items' }
          ],
          [
            { text: '🐉 Управление рейдами', callback_data: 'admin_raids' }
          ],
          [
            { text: '📊 Статистика сервера', callback_data: 'admin_stats' },
            { text: '📝 Канал логов', callback_data: 'admin_log_channel' }
          ]
        ]
      }
    }
  );
});

// Команда для обнуления кристаллов у конкретного игрока
bot.onText(/\/resetcrystals(?:\s+(.+))?/, async (msg, match) => {
  const userId = msg.from.id;
  const username = msg.from.username;
  
  // Проверка прав администратора
  if (username !== config.ADMIN_USERNAME) {
    return bot.sendMessage(userId, '❌ У вас нет прав администратора');
  }
  
  const targetUserId = match[1];
  
  if (!targetUserId) {
    return bot.sendMessage(userId, 
      `📝 *Использование:*\n\n` +
      `/resetcrystals <ID игрока>\n\n` +
      `Пример: /resetcrystals 123456789`,
      { parse_mode: 'Markdown' }
    );
  }
  
  // Проверяем существование игрока
  db.get(`SELECT * FROM players WHERE user_id = ?`, [targetUserId], (err, player) => {
    if (err) {
      console.error('Ошибка поиска игрока:', err);
      return bot.sendMessage(userId, '❌ Ошибка базы данных');
    }
    
    if (!player) {
      return bot.sendMessage(userId, `❌ Игрок с ID ${targetUserId} не найден`);
    }
    
    const oldCrystals = player.crystals;
    
    // Обнуляем кристаллы
    db.run(`UPDATE players SET crystals = 0 WHERE user_id = ?`, [targetUserId], (err) => {
      if (err) {
        console.error('Ошибка обнуления кристаллов:', err);
        return bot.sendMessage(userId, '❌ Ошибка обнуления кристаллов');
      }
      
      bot.sendMessage(userId, 
        `✅ *Кристаллы обнулены*\n\n` +
        `👤 Игрок: ${player.display_name || player.username || targetUserId}\n` +
        `🆔 ID: ${targetUserId}\n` +
        `💎 Было: ${oldCrystals}\n` +
        `💎 Стало: 0`,
        { parse_mode: 'Markdown' }
      );
      
      // Уведомляем игрока
      bot.sendMessage(targetUserId, 
        `⚠️ Ваши кристаллы были обнулены администратором`
      ).catch(() => {
        console.log(`Не удалось уведомить игрока ${targetUserId}`);
      });
      
      sendLogMessage(
        `🔄 Обнуление кристаллов игрока\n` +
        `👤 Админ: @${username}\n` +
        `🎯 Игрок: ${player.display_name || player.username} (${targetUserId})\n` +
        `💎 Было: ${oldCrystals} → Стало: 0`,
        'WARNING'
      );
    });
  });
});

// Команда для выдачи кристаллов
bot.onText(/\/givecrystals(?:\s+(\d+)\s+(\d+))?/, async (msg, match) => {
  const userId = msg.from.id;
  const username = msg.from.username;
  
  // Проверка прав администратора
  if (username !== config.ADMIN_USERNAME) {
    return bot.sendMessage(userId, '❌ У вас нет прав администратора');
  }
  
  const targetUserId = match[1];
  const amount = match[2];
  
  if (!targetUserId || !amount) {
    return bot.sendMessage(userId, 
      `📝 *Использование:*\n\n` +
      `/givecrystals <ID игрока> <количество>\n\n` +
      `Пример: /givecrystals 123456789 100`,
      { parse_mode: 'Markdown' }
    );
  }
  
  const crystalsAmount = parseInt(amount);
  
  if (isNaN(crystalsAmount) || crystalsAmount <= 0) {
    return bot.sendMessage(userId, '❌ Неверное количество кристаллов');
  }
  
  // Проверяем существование игрока
  db.get(`SELECT * FROM players WHERE user_id = ?`, [targetUserId], (err, player) => {
    if (err) {
      console.error('Ошибка поиска игрока:', err);
      return bot.sendMessage(userId, '❌ Ошибка базы данных');
    }
    
    if (!player) {
      return bot.sendMessage(userId, `❌ Игрок с ID ${targetUserId} не найден`);
    }
    
    // Выдаем кристаллы
    db.run(`UPDATE players SET crystals = crystals + ? WHERE user_id = ?`, 
      [crystalsAmount, targetUserId], (err) => {
        if (err) {
          console.error('Ошибка выдачи кристаллов:', err);
          return bot.sendMessage(userId, '❌ Ошибка выдачи кристаллов');
        }
        
        bot.sendMessage(userId, 
          `✅ *Кристаллы выданы*\n\n` +
          `👤 Игрок: ${player.display_name || player.username || targetUserId}\n` +
          `🆔 ID: ${targetUserId}\n` +
          `💎 Выдано: ${crystalsAmount}\n` +
          `💎 Было: ${player.crystals}\n` +
          `💎 Стало: ${player.crystals + crystalsAmount}`,
          { parse_mode: 'Markdown' }
        );
        
        // Уведомляем игрока
        bot.sendMessage(targetUserId, 
          `🎁 Вам выдано ${crystalsAmount} 💎 кристаллов от администратора!`
        ).catch(() => {
          console.log(`Не удалось уведомить игрока ${targetUserId}`);
        });
        
        sendLogMessage(
          `💎 Выдача кристаллов\n` +
          `👤 Админ: @${username}\n` +
          `🎯 Игрок: ${player.display_name || player.username} (${targetUserId})\n` +
          `💎 Количество: ${crystalsAmount}`,
          'SUCCESS'
        );
      });
  });
});

// Команда для выдачи золота
bot.onText(/\/givegold(?:\s+(\d+)\s+(\d+))?/, async (msg, match) => {
  const userId = msg.from.id;
  const username = msg.from.username;
  
  // Проверка прав администратора
  if (username !== config.ADMIN_USERNAME) {
    return bot.sendMessage(userId, '❌ У вас нет прав администратора');
  }
  
  const targetUserId = match[1];
  const amount = match[2];
  
  if (!targetUserId || !amount) {
    return bot.sendMessage(userId, 
      `📝 *Использование:*\n\n` +
      `/givegold <ID игрока> <количество>\n\n` +
      `Пример: /givegold 123456789 5000`,
      { parse_mode: 'Markdown' }
    );
  }
  
  const goldAmount = parseInt(amount);
  
  if (isNaN(goldAmount) || goldAmount <= 0) {
    return bot.sendMessage(userId, '❌ Неверное количество золота');
  }
  
  // Проверяем существование игрока
  db.get(`SELECT * FROM players WHERE user_id = ?`, [targetUserId], (err, player) => {
    if (err) {
      console.error('Ошибка поиска игрока:', err);
      return bot.sendMessage(userId, '❌ Ошибка базы данных');
    }
    
    if (!player) {
      return bot.sendMessage(userId, `❌ Игрок с ID ${targetUserId} не найден`);
    }
    
    // Выдаем золото
    db.run(`UPDATE players SET gold = gold + ? WHERE user_id = ?`, 
      [goldAmount, targetUserId], (err) => {
        if (err) {
          console.error('Ошибка выдачи золота:', err);
          return bot.sendMessage(userId, '❌ Ошибка выдачи золота');
        }
        
        bot.sendMessage(userId, 
          `✅ *Золото выдано*\n\n` +
          `👤 Игрок: ${player.display_name || player.username || targetUserId}\n` +
          `🆔 ID: ${targetUserId}\n` +
          `💰 Выдано: ${goldAmount}\n` +
          `💰 Было: ${player.gold}\n` +
          `💰 Стало: ${player.gold + goldAmount}`,
          { parse_mode: 'Markdown' }
        );
        
        // Уведомляем игрока
        bot.sendMessage(targetUserId, 
          `🎁 Вам выдано ${goldAmount} 💰 золота от администратора!`
        ).catch(() => {
          console.log(`Не удалось уведомить игрока ${targetUserId}`);
        });
        
        sendLogMessage(
          `💰 Выдача золота\n` +
          `👤 Админ: @${username}\n` +
          `🎯 Игрок: ${player.display_name || player.username} (${targetUserId})\n` +
          `💰 Количество: ${goldAmount}`,
          'SUCCESS'
        );
      });
  });
});

// Админская команда для ускорения кулдауна рейда
bot.onText(/\/speedupraid(?:\s+(.+))?/, async (msg, match) => {
  const userId = msg.from.id;
  const username = msg.from.username;
  
  // Проверка прав администратора
  if (username !== config.ADMIN_USERNAME) {
    return bot.sendMessage(userId, '❌ У вас нет прав для использования этой команды');
  }
  
  const bossName = match[1];
  
  if (!bossName) {
    return bot.sendMessage(userId, 
      '📝 Использование: /speedupraid <имя_босса>\n\n' +
      'Примеры:\n' +
      '/speedupraid Повелитель ветра\n' +
      '/speedupraid Владыка тьмы\n\n' +
      'Эта команда установит кулдаун босса на 1 минуту.'
    );
  }
  
  raids.speedupBossCooldown(bossName, (err, result) => {
    if (err) {
      console.error('Ошибка ускорения кулдауна:', err);
      return bot.sendMessage(userId, `❌ Ошибка: ${err.message}`);
    }
    
    bot.sendMessage(userId, 
      `⏱️ *Кулдаун ускорен!*\n\n` +
      `🐉 Босс: ${result.boss_name}\n` +
      `⏰ Кулдаун: ${result.cooldown_hours} часов\n` +
      `✅ Рейд будет доступен через 1 минуту\n\n` +
      `Откройте меню рейдов через минуту чтобы начать рейд.`,
      { parse_mode: 'Markdown' }
    );
  });
});

// Команда для получения информации об игроке
bot.onText(/\/playerinfo(?:\s+(.+))?/, async (msg, match) => {
  const userId = msg.from.id;
  const username = msg.from.username;
  
  // Проверка прав администратора
  if (username !== config.ADMIN_USERNAME) {
    return bot.sendMessage(userId, '❌ У вас нет прав администратора');
  }
  
  const targetUserId = match[1];
  
  if (!targetUserId) {
    return bot.sendMessage(userId, 
      `📝 *Использование:*\n\n` +
      `/playerinfo <ID игрока>\n\n` +
      `Пример: /playerinfo 123456789`,
      { parse_mode: 'Markdown' }
    );
  }
  
  // Получаем информацию об игроке
  db.get(`SELECT * FROM players WHERE user_id = ?`, [targetUserId], (err, player) => {
    if (err) {
      console.error('Ошибка поиска игрока:', err);
      return bot.sendMessage(userId, '❌ Ошибка базы данных');
    }
    
    if (!player) {
      return bot.sendMessage(userId, `❌ Игрок с ID ${targetUserId} не найден`);
    }
    
    // Получаем расу игрока
    db.get(`SELECT * FROM races WHERE id = ?`, [player.race_id], (err, race) => {
      const raceName = race ? race.name : 'Нет расы';
      const raceRarity = race ? config.RARITY[race.rarity].name : '-';
      
      bot.sendMessage(userId, 
        `👤 *Информация об игроке*\n\n` +
        `🆔 ID: ${player.user_id}\n` +
        `📝 Имя: ${player.display_name || player.username || 'Неизвестно'}\n` +
        `💎 VIP: ${player.is_vip ? 'Да' : 'Нет'}\n\n` +
        `🧬 Раса: ${raceName} (${raceRarity})\n` +
        `⭐ Уровень: ${player.level}\n` +
        `✨ Опыт: ${player.exp}\n\n` +
        `💰 Золото: ${player.gold}\n` +
        `💎 Кристаллы: ${player.crystals}\n\n` +
        `🏆 Побед: ${player.wins}\n` +
        `💀 Поражений: ${player.losses}\n` +
        `🎯 MMR: ${player.mmr || 0}\n\n` +
        `🌟 Пробуждение: ${player.awakening_level}\n` +
        `🔮 XP пробуждения: ${player.awakening_xp}`,
        { parse_mode: 'Markdown' }
      );
    });
  });
});

// Состояние админа для ввода данных
const adminState = new Map(); // userId -> { action, targetUserId }

// Обработка текстовых сообщений для админ-панели
bot.on('message', (msg) => {
  const userId = msg.from.id;
  const username = msg.from.username;
  const text = msg.text;
  
  // Обработка пересланных сообщений для установки канала логов
  if (msg.forward_from_chat && adminState.has(userId)) {
    const state = adminState.get(userId);
    
    if (state.action === 'set_log_channel' && username === config.ADMIN_USERNAME) {
      const channelId = msg.forward_from_chat.id;
      const channelTitle = msg.forward_from_chat.title;
      const channelUsername = msg.forward_from_chat.username;
      
      // Проверяем, что бот может отправлять сообщения в канал
      bot.sendMessage(channelId, '🤖 Тест подключения канала логов...').then(() => {
        // Успешно отправили сообщение
        config.LOG_CHANNEL_ID = channelId;
        adminState.delete(userId);
        
        bot.sendMessage(userId,
          `✅ *Канал логов установлен!*\n\n` +
          `📍 Канал: ${channelTitle}\n` +
          `🔗 ${channelUsername ? `@${channelUsername}` : `ID: ${channelId}`}\n\n` +
          `Теперь все логи будут отправляться в этот канал.`,
          { parse_mode: 'Markdown' }
        );
        
        // Отправляем первое сообщение в канал
        sendLogMessage('🟢 Канал логов успешно подключен!', 'SYSTEM');
        
      }).catch((error) => {
        bot.sendMessage(userId,
          `❌ *Ошибка подключения канала*\n\n` +
          `Не удалось отправить сообщение в канал.\n\n` +
          `Убедитесь что:\n` +
          `• Бот добавлен в канал как администратор\n` +
          `• У бота есть права на отправку сообщений\n\n` +
          `Ошибка: ${error.message}`,
          { parse_mode: 'Markdown' }
        );
      });
      
      return;
    }
  }
  
  // Логируем все сообщения для отладки
  if (text && !text.startsWith('/')) {
    const hasState = adminState.has(userId);
    const stateAction = hasState ? adminState.get(userId).action : 'none';
    logWithPlayer(`📨 [MESSAGE] text="${text.substring(0, 50)}...", hasState=${hasState}, action=${stateAction}`, userId);
  }
  
  // Обработка фото для рекламы и рас
  if (msg.photo && adminState.has(userId)) {
    const state = adminState.get(userId);
    
    if (state.action === 'makead_photo') {
      if (username !== config.ADMIN_USERNAME.replace('@', '')) return;
      
      // Берем фото наибольшего размера
      const photo = msg.photo[msg.photo.length - 1];
      
      state.photoFileId = photo.file_id;
      state.action = 'makead_text';
      adminState.set(userId, state);
      
      bot.sendMessage(userId, 
        '✅ Фото получено!\n\n' +
        'Шаг 2/2: Отправьте текст для рекламы\n\n' +
        '🎨 <b>Форматирование HTML:</b>\n' +
        '<b>Жирный</b> - &lt;b&gt;текст&lt;/b&gt;\n' +
        '<i>Курсив</i> - &lt;i&gt;текст&lt;/i&gt;\n' +
        '<u>Подчеркнутый</u> - &lt;u&gt;текст&lt;/u&gt;\n' +
        '<s>Зачеркнутый</s> - &lt;s&gt;текст&lt;/s&gt;\n' +
        '<code>Код</code> - &lt;code&gt;текст&lt;/code&gt;\n' +
        '<a href="url">Ссылка</a> - &lt;a href="url"&gt;текст&lt;/a&gt;\n\n' +
        '🌟 <b>Премиум эмодзи:</b>\n' +
        'Просто вставьте любые эмодзи, включая премиум!\n\n' +
        '💡 <b>Пример:</b>\n' +
        '&lt;b&gt;🎮 Играй в лучшую RPG!&lt;/b&gt;\n' +
        '&lt;i&gt;Начни свое приключение прямо сейчас!&lt;/i&gt;',
        { parse_mode: 'HTML' }
      );
      return;
    }
    
    if (state.action === 'add_race_photo') {
      if (username !== config.ADMIN_USERNAME.replace('@', '')) return;
      
      // Берем фото наибольшего размера
      const photo = msg.photo[msg.photo.length - 1];
      
      // Сохраняем file_id фото (в реальном проекте лучше скачать и сохранить файл)
      state.photoFileId = photo.file_id;
      state.action = 'add_race_name';
      adminState.set(userId, state);
      
      bot.sendMessage(userId, 
        '✅ Фото расы получено!\n\n' +
        'Шаг 2/7: Введите название расы:'
      );
      return;
    }
  }
  
  // Проверяем есть ли активное состояние
  if (!adminState.has(userId)) return;
  if (!text || text.startsWith('/')) return;
  
  const state = adminState.get(userId);
  logWithPlayer(`📝 Обработка текста: action=${state.action}, text="${text}"`, userId);
  
  // Для создания клана не нужны права админа
  if (state.action === 'awaiting_clan_name') {
    // Обработка создания клана (доступно всем VIP)
    const clanName = text.trim();
    
    if (clanName.length < 3 || clanName.length > 20) {
      return bot.sendMessage(userId, '❌ Название должно быть от 3 до 20 символов. Попробуйте еще раз:');
    }
    
    // Проверяем уникальность названия
    db.get(`SELECT * FROM clans WHERE name = ?`, [clanName], (err, existingClan) => {
      if (existingClan) {
        return bot.sendMessage(userId, '❌ Клан с таким названием уже существует. Введите другое название:');
      }
      
      // Создаем клан
      db.run(`INSERT INTO clans (name, leader_id) VALUES (?, ?)`,
        [clanName, userId], function(err) {
          if (err) {
            console.error('Ошибка создания клана:', err);
            adminState.delete(userId);
            return bot.sendMessage(userId, '❌ Ошибка создания клана');
          }
          
          const clanId = this.lastID;
          
          // Добавляем игрока в клан
          db.run(`UPDATE players SET clan_id = ? WHERE user_id = ?`, [clanId, userId], (err) => {
            adminState.delete(userId);
            
            if (err) {
              console.error('Ошибка добавления в клан:', err);
              return bot.sendMessage(userId, '❌ Ошибка');
            }
            
            bot.sendMessage(userId,
              `🏰 *Клан создан!*\n\n` +
              `Название: ${clanName}\n` +
              `Вы - лидер клана 👑\n\n` +
              `Приглашайте друзей и развивайте клан!`,
              { parse_mode: 'Markdown', ...getMainMenu(true) }
            );
            
            // Логируем создание клана
            sendLogMessage(
              `🏰 Клан создан\n` +
              `👤 Лидер: ${userId} (@${username})\n` +
              `📛 Название: ${clanName}\n` +
              `👑 Статус: Лидер клана`,
              'CLAN'
            );
          });
        });
    });
    return;
  }
  
  // Обработка текста для рекламы
  if (state.action === 'makead_text') {
    if (username !== config.ADMIN_USERNAME.replace('@', '')) return;
    
    const adText = text.trim();
    const photoFileId = state.photoFileId;
    
    adminState.delete(userId);
    
    // Отправляем рекламу админу для проверки
    // Используем HTML для лучшей поддержки форматирования
    bot.sendPhoto(userId, photoFileId, {
      caption: adText,
      parse_mode: 'HTML', // HTML поддерживает больше форматирования
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎮 Играть', url: 'https://t.me/zilsor_bot?start=ad' }]
        ]
      }
    }).then(() => {
      bot.sendMessage(userId, 
        '✅ Реклама готова!\n\n' +
        'Вы можете переслать это сообщение в каналы/группы или отправить игрокам.\n\n' +
        '💡 <b>Поддерживаемое форматирование:</b>\n' +
        '<b>Жирный текст</b> - &lt;b&gt;текст&lt;/b&gt;\n' +
        '<i>Курсив</i> - &lt;i&gt;текст&lt;/i&gt;\n' +
        '<u>Подчеркнутый</u> - &lt;u&gt;текст&lt;/u&gt;\n' +
        '<s>Зачеркнутый</s> - &lt;s&gt;текст&lt;/s&gt;\n' +
        '<code>Моноширинный</code> - &lt;code&gt;текст&lt;/code&gt;\n' +
        '<a href="url">Ссылка</a> - &lt;a href="url"&gt;текст&lt;/a&gt;\n\n' +
        '🌟 Премиум эмодзи поддерживаются автоматически!',
        { parse_mode: 'HTML' }
      );
    }).catch(err => {
      console.error('Ошибка отправки рекламы:', err);
      bot.sendMessage(userId, 
        '❌ Ошибка создания рекламы\n\n' +
        'Возможные причины:\n' +
        '• Неправильный HTML синтаксис\n' +
        '• Незакрытые теги\n' +
        '• Слишком длинный текст\n\n' +
        `Ошибка: ${err.message}`
      );
    });
    
    return;
  }
  
  // Для остальных действий нужны права админа
  if (username !== config.ADMIN_USERNAME) return;
  
  // Обрабатываем ввод в зависимости от действия
  if (state.action === 'awaiting_user_id') {
    const targetUserId = parseInt(text);
    if (isNaN(targetUserId)) {
      return bot.sendMessage(userId, '❌ Неверный ID. Введите числовой ID игрока:');
    }
    
    // Проверяем существует ли игрок
    db.get(`SELECT * FROM players WHERE user_id = ?`, [targetUserId], (err, player) => {
      if (err || !player) {
        adminState.delete(userId);
        return bot.sendMessage(userId, '❌ Игрок не найден');
      }
      
      state.targetUserId = targetUserId;
      state.targetUsername = player.username;
      
      // Переходим к следующему шагу в зависимости от типа действия
      if (state.type === 'vip') {
        state.action = 'awaiting_vip_days';
        adminState.set(userId, state);
        bot.sendMessage(userId, 
          `✅ Игрок найден: ${player.username} (ID: ${targetUserId})\n\n` +
          `Введите количество дней VIP (или 0 для снятия):`
        );
      } else if (state.type === 'gold') {
        state.action = 'awaiting_gold_amount';
        adminState.set(userId, state);
        bot.sendMessage(userId, 
          `✅ Игрок найден: ${player.username} (ID: ${targetUserId})\n\n` +
          `Введите количество золота:`
        );
      } else if (state.type === 'crystals') {
        state.action = 'awaiting_crystals_amount';
        adminState.set(userId, state);
        bot.sendMessage(userId, 
          `✅ Игрок найден: ${player.username} (ID: ${targetUserId})\n\n` +
          `Введите количество кристаллов:`
        );
      } else if (state.type === 'cooldowns') {
        // Сбрасываем кулдауны сразу
        db.run(`UPDATE players SET 
                last_duel_time = 0,
                last_forest_time = 0,
                last_loot_time = 0,
                last_work_time = 0,
                last_daily_reward = 0
                WHERE user_id = ?`, [targetUserId], (err) => {
          adminState.delete(userId);
          if (err) {
            return bot.sendMessage(userId, '❌ Ошибка сброса кулдаунов');
          }
          bot.sendMessage(userId, `✅ Кулдауны сброшены для ${player.username}`);
        });
      } else if (state.type === 'delete') {
        // Удаляем игрока из базы данных
        adminState.delete(userId);
        
        bot.sendMessage(userId, 
          `⚠️ *ВНИМАНИЕ!*\n\n` +
          `Вы уверены что хотите удалить игрока?\n\n` +
          `Игрок: ${player.username} (ID: ${targetUserId})\n` +
          `Уровень: ${player.level}\n` +
          `Золото: ${player.gold}\n` +
          `Кристаллы: ${player.crystals}\n\n` +
          `Это действие необратимо!`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '✅ Да, удалить', callback_data: `confirm_delete_player_${targetUserId}` },
                  { text: '❌ Отмена', callback_data: 'cancel_delete' }
                ]
              ]
            }
          }
        );
      }
    });
  } else if (state.action === 'awaiting_vip_days') {
    const days = parseInt(text);
    if (isNaN(days) || days < 0) {
      return bot.sendMessage(userId, '❌ Неверное количество дней. Введите число >= 0:');
    }
    
    const vipUntil = days > 0 ? Math.floor(Date.now() / 1000) + (days * 86400) : 0;
    const isVip = days > 0 ? 1 : 0;
    
    db.run(`UPDATE players SET is_vip = ?, vip_until = ? WHERE user_id = ?`,
      [isVip, vipUntil, state.targetUserId], (err) => {
        adminState.delete(userId);
        if (err) {
          return bot.sendMessage(userId, '❌ Ошибка выдачи VIP');
        }
        
        if (days > 0) {
          bot.sendMessage(userId, `✅ VIP выдан игроку ${state.targetUsername} на ${days} дней`);
          bot.sendMessage(state.targetUserId, 
            `💎 Вам выдан VIP статус на ${days} дней!\n\n` +
            `Наслаждайтесь привилегиями!`
          );
        } else {
          bot.sendMessage(userId, `✅ VIP снят с игрока ${state.targetUsername}`);
        }
      });
  } else if (state.action === 'awaiting_gold_amount') {
    const amount = parseInt(text);
    if (isNaN(amount)) {
      return bot.sendMessage(userId, '❌ Неверное количество. Введите число:');
    }
    
    db.run(`UPDATE players SET gold = gold + ? WHERE user_id = ?`,
      [amount, state.targetUserId], (err) => {
        adminState.delete(userId);
        if (err) {
          return bot.sendMessage(userId, '❌ Ошибка выдачи золота');
        }
        
        bot.sendMessage(userId, `✅ Выдано ${amount} золота игроку ${state.targetUsername}`);
        bot.sendMessage(state.targetUserId, `💰 Вам выдано ${amount} золота!`);
        
        // Логируем админское действие
        sendLogMessage(
          `👑 Админ выдал золото\n` +
          `👤 Админ: ${userId} (@${username})\n` +
          `🎯 Получатель: ${state.targetUserId} (@${state.targetUsername})\n` +
          `💰 Количество: ${amount} золота`,
          'ADMIN'
        );
      });
  } else if (state.action === 'awaiting_crystals_amount') {
    const amount = parseInt(text);
    if (isNaN(amount)) {
      return bot.sendMessage(userId, '❌ Неверное количество. Введите число:');
    }
    
    db.run(`UPDATE players SET crystals = crystals + ? WHERE user_id = ?`,
      [amount, state.targetUserId], (err) => {
        adminState.delete(userId);
        if (err) {
          return bot.sendMessage(userId, '❌ Ошибка выдачи кристаллов');
        }
        
        bot.sendMessage(userId, `✅ Выдано ${amount} кристаллов игроку ${state.targetUsername}`);
        bot.sendMessage(state.targetUserId, `💎 Вам выдано ${amount} кристаллов!`);
        
        // Логируем админское действие
        sendLogMessage(
          `👑 Админ выдал кристаллы\n` +
          `👤 Админ: ${userId} (@${username})\n` +
          `🎯 Получатель: ${state.targetUserId} (@${state.targetUsername})\n` +
          `💎 Количество: ${amount} кристаллов`,
          'ADMIN'
        );
      });
  } else if (state.action === 'awaiting_user_id_for_race') {
    const targetUserId = parseInt(text);
    if (isNaN(targetUserId)) {
      return bot.sendMessage(userId, '❌ Неверный ID. Введите числовой ID игрока:');
    }
    
    // Проверяем существует ли игрок
    db.get(`SELECT * FROM players WHERE user_id = ?`, [targetUserId], (err, player) => {
      if (err || !player) {
        adminState.delete(userId);
        return bot.sendMessage(userId, '❌ Игрок не найден');
      }
      
      state.targetUserId = targetUserId;
      state.targetUsername = player.username;
      state.action = 'awaiting_race_selection';
      adminState.set(userId, state);
      
      // Показываем список рас с пагинацией
      db.all(`SELECT * FROM races ORDER BY rarity DESC, name ASC`, (err, races) => {
        if (err || races.length === 0) {
          adminState.delete(userId);
          return bot.sendMessage(userId, '❌ Расы не найдены');
        }
        
        state.races = races;
        state.racePage = 0;
        adminState.set(userId, state);
        
        const page = 0;
        const perPage = 5;
        const totalPages = Math.ceil(races.length / perPage);
        const start = page * perPage;
        const end = start + perPage;
        const pageRaces = races.slice(start, end);
        
        let message = `✅ Игрок найден: ${player.username} (ID: ${targetUserId})\n\n`;
        message += `🧬 *Выберите расу для выдачи:*\n\n`;
        message += `Страница ${page + 1} из ${totalPages}\n\n`;
        
        const buttons = [];
        
        pageRaces.forEach((race) => {
          const rarityIcon = config.RARITY[race.rarity]?.color || '⚪️';
          buttons.push([{ 
            text: `${rarityIcon} ${race.name}`, 
            callback_data: `admin_select_race_${race.id}` 
          }]);
        });
        
        // Навигация
        const navButtons = [];
        if (page > 0) {
          navButtons.push({ text: '◀️ Назад', callback_data: `admin_race_page_${page - 1}` });
        }
        if (page < totalPages - 1) {
          navButtons.push({ text: 'Вперёд ▶️', callback_data: `admin_race_page_${page + 1}` });
        }
        if (navButtons.length > 0) {
          buttons.push(navButtons);
        }
        
        buttons.push([{ text: '❌ Отмена', callback_data: 'admin_back' }]);
        
        bot.sendMessage(userId, message, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        });
      });
    });
  }
  
  // Новые обработчики для управления расами и предметами
  else if (state.action === 'add_race_photo') {
    // Ожидаем фото расы - обрабатывается в обработчике фото выше
    return bot.sendMessage(userId, '📸 Пожалуйста, отправьте фото расы');
  } else if (state.action === 'add_race_name') {
    const raceName = text.trim();
    if (raceName.length < 2 || raceName.length > 30) {
      return bot.sendMessage(userId, '❌ Название должно быть от 2 до 30 символов. Попробуйте еще раз:');
    }
    
    // Проверяем уникальность
    db.get(`SELECT * FROM races WHERE name = ?`, [raceName], (err, existing) => {
      if (existing) {
        return bot.sendMessage(userId, '❌ Раса с таким названием уже существует. Введите другое название:');
      }
      
      state.raceName = raceName;
      state.action = 'add_race_rarity';
      adminState.set(userId, state);
      
      bot.sendMessage(userId, 
        `✅ Название: ${raceName}\n\n` +
        `Шаг 3/7: Выберите редкость расы:\n\n` +
        `1 - ⚪️ Обычная (COMMON)\n` +
        `2 - 🔵 Редкая (RARE)\n` +
        `3 - 🟣 Эпическая (EPIC)\n` +
        `4 - 🔴 Мистическая (MYTHIC)\n` +
        `5 - 🟡 Легендарная (LEGENDARY)\n` +
        `6 - ⚫️ Секретная (SECRET)\n\n` +
        `Введите номер (1-6):`
      );
    });
  } else if (state.action === 'add_race_rarity') {
    const rarityNum = parseInt(text);
    const rarities = ['COMMON', 'RARE', 'EPIC', 'MYTHIC', 'LEGENDARY', 'SECRET'];
    
    if (rarityNum < 1 || rarityNum > 6) {
      return bot.sendMessage(userId, '❌ Введите число от 1 до 6:');
    }
    
    state.rarity = rarities[rarityNum - 1];
    state.action = 'add_race_power';
    adminState.set(userId, state);
    
    const rarityIcon = config.RARITY[state.rarity].color;
    bot.sendMessage(userId, 
      `✅ Редкость: ${rarityIcon} ${config.RARITY[state.rarity].name}\n\n` +
      `Шаг 4/7: Введите базовую силу расы (рекомендуется 80-200):`
    );
  } else if (state.action === 'add_race_power') {
    const power = parseInt(text);
    if (isNaN(power) || power < 1 || power > 1000) {
      return bot.sendMessage(userId, '❌ Введите число от 1 до 1000:');
    }
    
    state.basePower = power;
    state.action = 'add_race_hp';
    adminState.set(userId, state);
    
    bot.sendMessage(userId, 
      `✅ Базовая сила: ${power}\n\n` +
      `Шаг 5/7: Введите базовое здоровье расы (рекомендуется 80-200):`
    );
  } else if (state.action === 'add_race_hp') {
    const hp = parseInt(text);
    if (isNaN(hp) || hp < 1 || hp > 1000) {
      return bot.sendMessage(userId, '❌ Введите число от 1 до 1000:');
    }
    
    state.baseHp = hp;
    state.action = 'add_race_attack';
    adminState.set(userId, state);
    
    bot.sendMessage(userId, 
      `✅ Базовое здоровье: ${hp}\n\n` +
      `Шаг 6/7: Введите базовую атаку расы (рекомендуется 15-50):`
    );
  } else if (state.action === 'add_race_attack') {
    const attack = parseInt(text);
    if (isNaN(attack) || attack < 1 || attack > 500) {
      return bot.sendMessage(userId, '❌ Введите число от 1 до 500:');
    }
    
    state.baseAttack = attack;
    state.action = 'add_race_defense';
    adminState.set(userId, state);
    
    bot.sendMessage(userId, 
      `✅ Базовая атака: ${attack}\n\n` +
      `Шаг 7/7: Введите базовую защиту расы (рекомендуется 10-40):`
    );
  } else if (state.action === 'add_race_defense') {
    const defense = parseInt(text);
    if (isNaN(defense) || defense < 1 || defense > 500) {
      return bot.sendMessage(userId, '❌ Введите число от 1 до 500:');
    }
    
    // Создаем расу
    db.run(`INSERT INTO races (name, description, rarity, base_power, base_hp, base_attack, base_defense, special_ability) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [state.raceName, `Новая раса: ${state.raceName}`, state.rarity, state.basePower, state.baseHp, state.baseAttack, defense, 'Нет особой способности'],
      function(err) {
        adminState.delete(userId);
        
        if (err) {
          console.error('Ошибка создания расы:', err);
          return bot.sendMessage(userId, '❌ Ошибка создания расы');
        }
        
        const rarityIcon = config.RARITY[state.rarity].color;
        bot.sendMessage(userId, 
          `✅ *Раса создана!*\n\n` +
          `${rarityIcon} *${state.raceName}*\n` +
          `${config.RARITY[state.rarity].name}\n\n` +
          `📊 Характеристики:\n` +
          `⚡ Сила: ${state.basePower}\n` +
          `❤️ Здоровье: ${state.baseHp}\n` +
          `🗡️ Атака: ${state.baseAttack}\n` +
          `🛡️ Защита: ${defense}\n\n` +
          `💡 Не забудьте добавить изображение расы в папку images/races/`,
          { parse_mode: 'Markdown' }
        );
      });
  }
  
  // Обработчики для предметов
  else if (state.action === 'add_item_name') {
    const itemName = text.trim();
    if (itemName.length < 2 || itemName.length > 50) {
      return bot.sendMessage(userId, '❌ Название должно быть от 2 до 50 символов. Попробуйте еще раз:');
    }
    
    // Проверяем уникальность
    db.get(`SELECT * FROM items WHERE name = ?`, [itemName], (err, existing) => {
      if (existing) {
        return bot.sendMessage(userId, '❌ Предмет с таким названием уже существует. Введите другое название:');
      }
      
      state.itemName = itemName;
      state.action = 'add_item_slot';
      adminState.set(userId, state);
      
      bot.sendMessage(userId, 
        `✅ Название: ${itemName}\n\n` +
        `Шаг 2/8: Выберите слот предмета:\n\n` +
        `1 - 🪖 Шлем (helmet)\n` +
        `2 - 🛡️ Нагрудник (chest)\n` +
        `3 - 👖 Поножи (legs)\n` +
        `4 - 👢 Сапоги (boots)\n` +
        `5 - ⚔️ Оружие (weapon)\n` +
        `6 - 🛡️ Щит (shield)\n` +
        `7 - 💎 Артефакт 1 (artifact_1)\n` +
        `8 - 💎 Артефакт 2 (artifact_2)\n` +
        `9 - 🎒 Аксессуар (accessory)\n\n` +
        `Введите номер (1-9):`
      );
    });
  } else if (state.action === 'add_item_slot') {
    const slotNum = parseInt(text);
    const slots = ['helmet', 'chest', 'legs', 'boots', 'weapon', 'shield', 'artifact_1', 'artifact_2', 'accessory'];
    
    if (slotNum < 1 || slotNum > 9) {
      return bot.sendMessage(userId, '❌ Введите число от 1 до 9:');
    }
    
    state.slot = slots[slotNum - 1];
    state.action = 'add_item_rarity';
    adminState.set(userId, state);
    
    const slotNames = {
      helmet: '🪖 Шлем', chest: '🛡️ Нагрудник', legs: '👖 Поножи', boots: '👢 Сапоги',
      weapon: '⚔️ Оружие', shield: '🛡️ Щит', artifact_1: '💎 Артефакт 1', 
      artifact_2: '💎 Артефакт 2', accessory: '🎒 Аксессуар'
    };
    
    bot.sendMessage(userId, 
      `✅ Слот: ${slotNames[state.slot]}\n\n` +
      `Шаг 3/8: Выберите редкость предмета:\n\n` +
      `1 - ⚪️ Обычный (COMMON)\n` +
      `2 - 🔵 Редкий (RARE)\n` +
      `3 - 🟣 Эпический (EPIC)\n` +
      `4 - 🔴 Мистический (MYTHIC)\n` +
      `5 - 🟡 Легендарный (LEGENDARY)\n` +
      `6 - ⚫️ Секретный (SECRET)\n\n` +
      `Введите номер (1-6):`
    );
  } else if (state.action === 'add_item_rarity') {
    const rarityNum = parseInt(text);
    const rarities = ['COMMON', 'RARE', 'EPIC', 'MYTHIC', 'LEGENDARY', 'SECRET'];
    
    if (rarityNum < 1 || rarityNum > 6) {
      return bot.sendMessage(userId, '❌ Введите число от 1 до 6:');
    }
    
    state.rarity = rarities[rarityNum - 1];
    state.action = 'add_item_power';
    adminState.set(userId, state);
    
    const rarityIcon = config.RARITY[state.rarity].color;
    bot.sendMessage(userId, 
      `✅ Редкость: ${rarityIcon} ${config.RARITY[state.rarity].name}\n\n` +
      `Шаг 4/8: Введите бонус к силе (0-500):`
    );
  } else if (state.action === 'add_item_power') {
    const power = parseInt(text);
    if (isNaN(power) || power < 0 || power > 500) {
      return bot.sendMessage(userId, '❌ Введите число от 0 до 500:');
    }
    
    state.powerBonus = power;
    state.action = 'add_item_hp';
    adminState.set(userId, state);
    
    bot.sendMessage(userId, 
      `✅ Бонус к силе: +${power}\n\n` +
      `Шаг 5/8: Введите бонус к здоровью (0-500):`
    );
  } else if (state.action === 'add_item_hp') {
    const hp = parseInt(text);
    if (isNaN(hp) || hp < 0 || hp > 500) {
      return bot.sendMessage(userId, '❌ Введите число от 0 до 500:');
    }
    
    state.hpBonus = hp;
    state.action = 'add_item_attack';
    adminState.set(userId, state);
    
    bot.sendMessage(userId, 
      `✅ Бонус к здоровью: +${hp}\n\n` +
      `Шаг 6/8: Введите бонус к атаке (0-200):`
    );
  } else if (state.action === 'add_item_attack') {
    const attack = parseInt(text);
    if (isNaN(attack) || attack < 0 || attack > 200) {
      return bot.sendMessage(userId, '❌ Введите число от 0 до 200:');
    }
    
    state.attackBonus = attack;
    state.action = 'add_item_defense';
    adminState.set(userId, state);
    
    bot.sendMessage(userId, 
      `✅ Бонус к атаке: +${attack}\n\n` +
      `Шаг 7/8: Введите бонус к защите (0-200):`
    );
  } else if (state.action === 'add_item_defense') {
    const defense = parseInt(text);
    if (isNaN(defense) || defense < 0 || defense > 200) {
      return bot.sendMessage(userId, '❌ Введите число от 0 до 200:');
    }
    
    state.defenseBonus = defense;
    state.action = 'add_item_description';
    adminState.set(userId, state);
    
    bot.sendMessage(userId, 
      `✅ Бонус к защите: +${defense}\n\n` +
      `Шаг 8/8: Введите описание предмета (или "нет" для пропуска):`
    );
  } else if (state.action === 'add_item_description') {
    const description = text.trim() === 'нет' ? null : text.trim();
    
    // Создаем предмет
    db.run(`INSERT INTO items (name, description, rarity, slot, power_bonus, hp_bonus, attack_bonus, defense_bonus, special_effect) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [state.itemName, description, state.rarity, state.slot, state.powerBonus, state.hpBonus, state.attackBonus, state.defenseBonus, null],
      function(err) {
        adminState.delete(userId);
        
        if (err) {
          console.error('Ошибка создания предмета:', err);
          return bot.sendMessage(userId, '❌ Ошибка создания предмета');
        }
        
        const rarityIcon = config.RARITY[state.rarity].color;
        const slotNames = {
          helmet: '🪖 Шлем', chest: '🛡️ Нагрудник', legs: '👖 Поножи', boots: '👢 Сапоги',
          weapon: '⚔️ Оружие', shield: '🛡️ Щит', artifact_1: '💎 Артефакт 1', 
          artifact_2: '💎 Артефакт 2', accessory: '🎒 Аксессуар'
        };
        
        bot.sendMessage(userId, 
          `✅ *Предмет создан!*\n\n` +
          `${rarityIcon} *${state.itemName}*\n` +
          `${config.RARITY[state.rarity].name} ${slotNames[state.slot]}\n\n` +
          `📊 Характеристики:\n` +
          `⚡ Сила: +${state.powerBonus}\n` +
          `❤️ Здоровье: +${state.hpBonus}\n` +
          `🗡️ Атака: +${state.attackBonus}\n` +
          `🛡️ Защита: +${state.defenseBonus}\n\n` +
          `📝 Описание: ${description || 'Нет'}`,
          { parse_mode: 'Markdown' }
        );
      });
  }
  
  // Обработчики редактирования рас
  else if (state.action === 'edit_race_name') {
    const newName = text.trim();
    if (newName.length < 2 || newName.length > 30) {
      return bot.sendMessage(userId, '❌ Название должно быть от 2 до 30 символов. Попробуйте еще раз:');
    }
    
    db.run(`UPDATE races SET name = ? WHERE id = ?`, [newName, state.raceId], (err) => {
      adminState.delete(userId);
      if (err) {
        return bot.sendMessage(userId, '❌ Ошибка обновления названия расы');
      }
      bot.sendMessage(userId, `✅ Название расы изменено на: ${newName}`);
    });
  } else if (state.action === 'edit_race_rarity') {
    const rarityNum = parseInt(text);
    const rarities = ['COMMON', 'RARE', 'EPIC', 'MYTHIC', 'LEGENDARY', 'SECRET'];
    
    if (rarityNum < 1 || rarityNum > 6) {
      return bot.sendMessage(userId, '❌ Введите число от 1 до 6:');
    }
    
    const newRarity = rarities[rarityNum - 1];
    
    db.run(`UPDATE races SET rarity = ? WHERE id = ?`, [newRarity, state.raceId], (err) => {
      adminState.delete(userId);
      if (err) {
        return bot.sendMessage(userId, '❌ Ошибка обновления редкости расы');
      }
      const rarityIcon = config.RARITY[newRarity].color;
      bot.sendMessage(userId, `✅ Редкость расы изменена на: ${rarityIcon} ${config.RARITY[newRarity].name}`);
    });
  } else if (state.action === 'edit_race_power') {
    const newPower = parseInt(text);
    if (isNaN(newPower) || newPower < 1 || newPower > 1000) {
      return bot.sendMessage(userId, '❌ Введите число от 1 до 1000:');
    }
    
    db.run(`UPDATE races SET base_power = ? WHERE id = ?`, [newPower, state.raceId], (err) => {
      adminState.delete(userId);
      if (err) {
        return bot.sendMessage(userId, '❌ Ошибка обновления силы расы');
      }
      bot.sendMessage(userId, `✅ Сила расы изменена на: ${newPower}`);
    });
  } else if (state.action === 'edit_race_hp') {
    const newHp = parseInt(text);
    if (isNaN(newHp) || newHp < 1 || newHp > 1000) {
      return bot.sendMessage(userId, '❌ Введите число от 1 до 1000:');
    }
    
    db.run(`UPDATE races SET base_hp = ? WHERE id = ?`, [newHp, state.raceId], (err) => {
      adminState.delete(userId);
      if (err) {
        return bot.sendMessage(userId, '❌ Ошибка обновления здоровья расы');
      }
      bot.sendMessage(userId, `✅ Здоровье расы изменено на: ${newHp}`);
    });
  } else if (state.action === 'edit_race_attack') {
    const newAttack = parseInt(text);
    if (isNaN(newAttack) || newAttack < 1 || newAttack > 500) {
      return bot.sendMessage(userId, '❌ Введите число от 1 до 500:');
    }
    
    db.run(`UPDATE races SET base_attack = ? WHERE id = ?`, [newAttack, state.raceId], (err) => {
      adminState.delete(userId);
      if (err) {
        return bot.sendMessage(userId, '❌ Ошибка обновления атаки расы');
      }
      bot.sendMessage(userId, `✅ Атака расы изменена на: ${newAttack}`);
    });
  } else if (state.action === 'edit_race_defense') {
    const newDefense = parseInt(text);
    if (isNaN(newDefense) || newDefense < 1 || newDefense > 500) {
      return bot.sendMessage(userId, '❌ Введите число от 1 до 500:');
    }
    
    db.run(`UPDATE races SET base_defense = ? WHERE id = ?`, [newDefense, state.raceId], (err) => {
      adminState.delete(userId);
      if (err) {
        return bot.sendMessage(userId, '❌ Ошибка обновления защиты расы');
      }
      bot.sendMessage(userId, `✅ Защита расы изменена на: ${newDefense}`);
    });
  } else if (state.action === 'edit_race_ability') {
    const newAbility = text.trim();
    
    db.run(`UPDATE races SET special_ability = ? WHERE id = ?`, [newAbility, state.raceId], (err) => {
      adminState.delete(userId);
      if (err) {
        return bot.sendMessage(userId, '❌ Ошибка обновления способности расы');
      }
      bot.sendMessage(userId, `✅ Способность расы изменена на: ${newAbility}`);
    });
  } else if (state.action === 'edit_race_desc') {
    const newDesc = text.trim();
    
    db.run(`UPDATE races SET description = ? WHERE id = ?`, [newDesc, state.raceId], (err) => {
      adminState.delete(userId);
      if (err) {
        return bot.sendMessage(userId, '❌ Ошибка обновления описания расы');
      }
      bot.sendMessage(userId, `✅ Описание расы изменено на: ${newDesc}`);
    });
  }
  
  // Обработчики редактирования предметов
  else if (state.action === 'edit_item_name') {
    const newName = text.trim();
    if (newName.length < 2 || newName.length > 50) {
      return bot.sendMessage(userId, '❌ Название должно быть от 2 до 50 символов. Попробуйте еще раз:');
    }
    
    db.run(`UPDATE items SET name = ? WHERE id = ?`, [newName, state.itemId], (err) => {
      adminState.delete(userId);
      if (err) {
        return bot.sendMessage(userId, '❌ Ошибка обновления названия предмета');
      }
      bot.sendMessage(userId, `✅ Название предмета изменено на: ${newName}`);
    });
  } else if (state.action === 'edit_item_rarity') {
    const rarityNum = parseInt(text);
    const rarities = ['COMMON', 'RARE', 'EPIC', 'MYTHIC', 'LEGENDARY', 'SECRET'];
    
    if (rarityNum < 1 || rarityNum > 6) {
      return bot.sendMessage(userId, '❌ Введите число от 1 до 6:');
    }
    
    const newRarity = rarities[rarityNum - 1];
    
    db.run(`UPDATE items SET rarity = ? WHERE id = ?`, [newRarity, state.itemId], (err) => {
      adminState.delete(userId);
      if (err) {
        return bot.sendMessage(userId, '❌ Ошибка обновления редкости предмета');
      }
      const rarityIcon = config.RARITY[newRarity].color;
      bot.sendMessage(userId, `✅ Редкость предмета изменена на: ${rarityIcon} ${config.RARITY[newRarity].name}`);
    });
  }
  
  // Обработчики глобальных и локальных сообщений
  else if (state.action === 'awaiting_broadcast_message') {
    const message = text.trim();
    
    if (message.length === 0) {
      return bot.sendMessage(userId, '❌ Сообщение не может быть пустым. Попробуйте еще раз:');
    }
    
    // Получаем всех игроков
    db.all(`SELECT user_id FROM players`, (err, players) => {
      if (err || !players || players.length === 0) {
        adminState.delete(userId);
        return bot.sendMessage(userId, '❌ Ошибка получения списка игроков');
      }
      
      let successCount = 0;
      let failCount = 0;
      
      // Отправляем сообщение всем игрокам
      players.forEach((player, index) => {
        setTimeout(() => {
          bot.sendMessage(player.user_id, 
            `📢 *ОБЪЯВЛЕНИЕ ОТ АДМИНИСТРАЦИИ*\n\n${message}`,
            { parse_mode: 'Markdown' }
          ).then(() => {
            successCount++;
          }).catch(() => {
            failCount++;
          }).finally(() => {
            // Когда все сообщения отправлены
            if (index === players.length - 1) {
              setTimeout(() => {
                adminState.delete(userId);
                bot.sendMessage(userId, 
                  `✅ *Рассылка завершена!*\n\n` +
                  `📤 Отправлено: ${successCount}\n` +
                  `❌ Ошибок: ${failCount}\n` +
                  `👥 Всего игроков: ${players.length}`,
                  { parse_mode: 'Markdown' }
                );
              }, 1000);
            }
          });
        }, index * 100); // Задержка 100мс между сообщениями
      });
    });
  } else if (state.action === 'awaiting_private_message_user_id') {
    const targetUserId = parseInt(text);
    
    if (isNaN(targetUserId)) {
      return bot.sendMessage(userId, '❌ Неверный ID. Введите числовой ID игрока:');
    }
    
    // Проверяем существует ли игрок
    db.get(`SELECT user_id, username FROM players WHERE user_id = ?`, [targetUserId], (err, player) => {
      if (err || !player) {
        adminState.delete(userId);
        return bot.sendMessage(userId, '❌ Игрок не найден');
      }
      
      state.targetUserId = targetUserId;
      state.targetUsername = player.username;
      state.action = 'awaiting_private_message_text';
      adminState.set(userId, state);
      
      bot.sendMessage(userId, 
        `💬 *Личное сообщение для ${player.username}*\n\n` +
        `Введите текст сообщения:\n\n` +
        `💡 Поддерживается Markdown форматирование`,
        { parse_mode: 'Markdown' }
      );
    });
  } else if (state.action === 'awaiting_private_message_text') {
    const message = text.trim();
    
    if (message.length === 0) {
      return bot.sendMessage(userId, '❌ Сообщение не может быть пустым. Попробуйте еще раз:');
    }
    
    // Отправляем сообщение игроку
    bot.sendMessage(state.targetUserId, 
      `💬 *СООБЩЕНИЕ ОТ АДМИНИСТРАЦИИ*\n\n${message}`,
      { parse_mode: 'Markdown' }
    ).then(() => {
      adminState.delete(userId);
      bot.sendMessage(userId, 
        `✅ *Сообщение отправлено!*\n\n` +
        `👤 Получатель: ${state.targetUsername} (ID: ${state.targetUserId})`,
        { parse_mode: 'Markdown' }
      );
    }).catch((err) => {
      adminState.delete(userId);
      bot.sendMessage(userId, 
        `❌ Ошибка отправки сообщения: ${err.message}`
      );
    });
  }
  
  // Обработчики создания босса
  else if (state.action === 'create_boss_name') {
    const name = text.trim();
    
    if (name.length === 0 || name.length > 50) {
      return bot.sendMessage(userId, '❌ Название должно быть от 1 до 50 символов. Попробуйте еще раз:');
    }
    
    state.bossData.name = name;
    state.action = 'create_boss_level';
    adminState.set(userId, state);
    
    bot.sendMessage(userId,
      `✅ Название: ${name}\n\n` +
      `Шаг 2/7: Введите уровень босса (1-120):`
    );
  }
  else if (state.action === 'create_boss_level') {
    const level = parseInt(text);
    
    if (isNaN(level) || level < 1 || level > 120) {
      return bot.sendMessage(userId, '❌ Уровень должен быть от 1 до 120. Попробуйте еще раз:');
    }
    
    state.bossData.level = level;
    state.action = 'create_boss_hp';
    adminState.set(userId, state);
    
    bot.sendMessage(userId,
      `✅ Уровень: ${level}\n\n` +
      `Шаг 3/7: Введите базовое HP босса (10000-1000000):`
    );
  }
  else if (state.action === 'create_boss_hp') {
    const hp = parseInt(text);
    
    if (isNaN(hp) || hp < 10000 || hp > 1000000) {
      return bot.sendMessage(userId, '❌ HP должно быть от 10000 до 1000000. Попробуйте еще раз:');
    }
    
    state.bossData.base_hp = hp;
    state.action = 'create_boss_description';
    adminState.set(userId, state);
    
    bot.sendMessage(userId,
      `✅ HP: ${hp}\n\n` +
      `Шаг 4/7: Введите описание босса (до 200 символов):`
    );
  }
  else if (state.action === 'create_boss_description') {
    const description = text.trim();
    
    if (description.length === 0 || description.length > 200) {
      return bot.sendMessage(userId, '❌ Описание должно быть от 1 до 200 символов. Попробуйте еще раз:');
    }
    
    state.bossData.description = description;
    state.action = 'create_boss_gold';
    adminState.set(userId, state);
    
    bot.sendMessage(userId,
      `✅ Описание: ${description}\n\n` +
      `Шаг 5/7: Введите награду золота (100-10000):`
    );
  }
  else if (state.action === 'create_boss_gold') {
    const gold = parseInt(text);
    
    if (isNaN(gold) || gold < 100 || gold > 10000) {
      return bot.sendMessage(userId, '❌ Золото должно быть от 100 до 10000. Попробуйте еще раз:');
    }
    
    state.bossData.gold = gold;
    state.action = 'create_boss_crystals';
    adminState.set(userId, state);
    
    bot.sendMessage(userId,
      `✅ Золото: ${gold}\n\n` +
      `Шаг 6/7: Введите награду кристаллов (5-100):`
    );
  }
  else if (state.action === 'create_boss_crystals') {
    const crystals = parseInt(text);
    
    if (isNaN(crystals) || crystals < 5 || crystals > 100) {
      return bot.sendMessage(userId, '❌ Кристаллы должны быть от 5 до 100. Попробуйте еще раз:');
    }
    
    state.bossData.crystals = crystals;
    state.action = 'create_boss_exp';
    adminState.set(userId, state);
    
    bot.sendMessage(userId,
      `✅ Кристаллы: ${crystals}\n\n` +
      `Шаг 7/7: Введите награду опыта (100-10000):`
    );
  }
  else if (state.action === 'create_boss_exp') {
    const exp = parseInt(text);
    
    if (isNaN(exp) || exp < 100 || exp > 10000) {
      return bot.sendMessage(userId, '❌ Опыт должен быть от 100 до 10000. Попробуйте еще раз:');
    }
    
    state.bossData.exp = exp;
    
    // Создаем босса в базе данных
    const rewards = JSON.stringify({
      total_gold: state.bossData.gold,
      total_crystals: state.bossData.crystals,
      total_exp: state.bossData.exp
    });
    
    const imageName = `raid_${state.bossData.name.toLowerCase().replace(/\s+/g, '_')}.jpg`;
    
    db.run(`INSERT INTO raid_bosses (name, level, base_hp, image, description, rewards)
            VALUES (?, ?, ?, ?, ?, ?)`,
      [state.bossData.name, state.bossData.level, state.bossData.base_hp, 
       imageName, state.bossData.description, rewards],
      function(err) {
        adminState.delete(userId);
        
        if (err) {
          console.error('Ошибка создания босса:', err);
          return bot.sendMessage(userId, `❌ Ошибка создания босса: ${err.message}`);
        }
        
        bot.sendMessage(userId,
          `✅ *Босс создан!*\n\n` +
          `🐉 Название: ${state.bossData.name}\n` +
          `⭐ Уровень: ${state.bossData.level}\n` +
          `❤️ HP: ${state.bossData.base_hp}\n` +
          `📝 Описание: ${state.bossData.description}\n` +
          `🖼️ Изображение: ${imageName}\n\n` +
          `💰 Награды:\n` +
          `   Золото: ${state.bossData.gold}\n` +
          `   Кристаллы: ${state.bossData.crystals}\n` +
          `   Опыт: ${state.bossData.exp}\n\n` +
          `💡 Не забудьте добавить изображение:\n` +
          `images/raids/${imageName}`,
          { parse_mode: 'Markdown' }
        );
        
        sendLogMessage(
          `➕ Создан новый босс рейда\n` +
          `👤 Админ: @${msg.from.username}\n` +
          `🐉 Босс: ${state.bossData.name} (Ур.${state.bossData.level})\n` +
          `❤️ HP: ${state.bossData.base_hp}`,
          'ADMIN'
        );
      });
  }
  
  // Обработчики редактирования босса
  else if (state.action === 'edit_boss_name') {
    const name = text.trim();
    
    if (name.length === 0 || name.length > 50) {
      return bot.sendMessage(userId, '❌ Название должно быть от 1 до 50 символов. Попробуйте еще раз:');
    }
    
    db.run(`UPDATE raid_bosses SET name = ? WHERE id = ?`, [name, state.bossId], (err) => {
      adminState.delete(userId);
      
      if (err) {
        return bot.sendMessage(userId, '❌ Ошибка обновления названия');
      }
      
      bot.sendMessage(userId, `✅ Название изменено на: ${name}`);
    });
  }
  else if (state.action === 'edit_boss_level') {
    const level = parseInt(text);
    
    if (isNaN(level) || level < 1 || level > 120) {
      return bot.sendMessage(userId, '❌ Уровень должен быть от 1 до 120. Попробуйте еще раз:');
    }
    
    db.run(`UPDATE raid_bosses SET level = ? WHERE id = ?`, [level, state.bossId], (err) => {
      adminState.delete(userId);
      
      if (err) {
        return bot.sendMessage(userId, '❌ Ошибка обновления уровня');
      }
      
      bot.sendMessage(userId, `✅ Уровень изменен на: ${level}`);
    });
  }
  else if (state.action === 'edit_boss_hp') {
    const hp = parseInt(text);
    
    if (isNaN(hp) || hp < 10000 || hp > 1000000) {
      return bot.sendMessage(userId, '❌ HP должно быть от 10000 до 1000000. Попробуйте еще раз:');
    }
    
    db.run(`UPDATE raid_bosses SET base_hp = ? WHERE id = ?`, [hp, state.bossId], (err) => {
      adminState.delete(userId);
      
      if (err) {
        return bot.sendMessage(userId, '❌ Ошибка обновления HP');
      }
      
      bot.sendMessage(userId, `✅ Базовое HP изменено на: ${hp}`);
    });
  }
  else if (state.action === 'edit_boss_desc') {
    const description = text.trim();
    
    if (description.length === 0 || description.length > 200) {
      return bot.sendMessage(userId, '❌ Описание должно быть от 1 до 200 символов. Попробуйте еще раз:');
    }
    
    db.run(`UPDATE raid_bosses SET description = ? WHERE id = ?`, [description, state.bossId], (err) => {
      adminState.delete(userId);
      
      if (err) {
        return bot.sendMessage(userId, '❌ Ошибка обновления описания');
      }
      
      bot.sendMessage(userId, `✅ Описание изменено на: ${description}`);
    });
  }
  else if (state.action === 'edit_boss_image') {
    const image = text.trim();
    
    if (image.length === 0 || !image.endsWith('.jpg')) {
      return bot.sendMessage(userId, '❌ Имя файла должно заканчиваться на .jpg. Попробуйте еще раз:');
    }
    
    db.run(`UPDATE raid_bosses SET image = ? WHERE id = ?`, [image, state.bossId], (err) => {
      adminState.delete(userId);
      
      if (err) {
        return bot.sendMessage(userId, '❌ Ошибка обновления изображения');
      }
      
      bot.sendMessage(userId, `✅ Изображение изменено на: ${image}`);
    });
  }
  else if (state.action === 'edit_boss_gold') {
    const gold = parseInt(text);
    
    if (isNaN(gold) || gold < 100 || gold > 10000) {
      return bot.sendMessage(userId, '❌ Золото должно быть от 100 до 10000. Попробуйте еще раз:');
    }
    
    db.get(`SELECT rewards FROM raid_bosses WHERE id = ?`, [state.bossId], (err, boss) => {
      if (err || !boss) {
        adminState.delete(userId);
        return bot.sendMessage(userId, '❌ Босс не найден');
      }
      
      const rewards = JSON.parse(boss.rewards);
      rewards.total_gold = gold;
      
      db.run(`UPDATE raid_bosses SET rewards = ? WHERE id = ?`, 
        [JSON.stringify(rewards), state.bossId], (err) => {
          adminState.delete(userId);
          
          if (err) {
            return bot.sendMessage(userId, '❌ Ошибка обновления награды');
          }
          
          bot.sendMessage(userId, `✅ Награда золота изменена на: ${gold}`);
        });
    });
  }
  else if (state.action === 'edit_boss_crystals') {
    const crystals = parseInt(text);
    
    if (isNaN(crystals) || crystals < 5 || crystals > 100) {
      return bot.sendMessage(userId, '❌ Кристаллы должны быть от 5 до 100. Попробуйте еще раз:');
    }
    
    db.get(`SELECT rewards FROM raid_bosses WHERE id = ?`, [state.bossId], (err, boss) => {
      if (err || !boss) {
        adminState.delete(userId);
        return bot.sendMessage(userId, '❌ Босс не найден');
      }
      
      const rewards = JSON.parse(boss.rewards);
      rewards.total_crystals = crystals;
      
      db.run(`UPDATE raid_bosses SET rewards = ? WHERE id = ?`, 
        [JSON.stringify(rewards), state.bossId], (err) => {
          adminState.delete(userId);
          
          if (err) {
            return bot.sendMessage(userId, '❌ Ошибка обновления награды');
          }
          
          bot.sendMessage(userId, `✅ Награда кристаллов изменена на: ${crystals}`);
        });
    });
  }
  else if (state.action === 'edit_boss_exp') {
    const exp = parseInt(text);
    
    if (isNaN(exp) || exp < 100 || exp > 10000) {
      return bot.sendMessage(userId, '❌ Опыт должен быть от 100 до 10000. Попробуйте еще раз:');
    }
    
    db.get(`SELECT rewards FROM raid_bosses WHERE id = ?`, [state.bossId], (err, boss) => {
      if (err || !boss) {
        adminState.delete(userId);
        return bot.sendMessage(userId, '❌ Босс не найден');
      }
      
      const rewards = JSON.parse(boss.rewards);
      rewards.total_exp = exp;
      
      db.run(`UPDATE raid_bosses SET rewards = ? WHERE id = ?`, 
        [JSON.stringify(rewards), state.bossId], (err) => {
          adminState.delete(userId);
          
          if (err) {
            return bot.sendMessage(userId, '❌ Ошибка обновления награды');
          }
          
          bot.sendMessage(userId, `✅ Награда опыта изменена на: ${exp}`);
        });
    });
  }
  
  // Обработчики настроек клана
  else if (state.action === 'clan_change_max_members') {
    const newMax = parseInt(text);
    
    if (isNaN(newMax) || newMax < 5 || newMax > 100) {
      return bot.sendMessage(userId, '❌ Введите число от 5 до 100:');
    }
    
    clanManagement.changeMaxMembers(state.clanId, newMax, (err) => {
      adminState.delete(userId);
      
      if (err) {
        return bot.sendMessage(userId, `❌ ${err.message}`);
      }
      
      bot.sendMessage(userId, 
        `✅ Лимит участников изменен на: ${newMax}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '⚙️ Настройки клана', callback_data: 'clan_settings' }],
              [{ text: '🔙 Назад', callback_data: 'clan' }]
            ]
          }
        }
      );
    });
  }
  else if (state.action === 'clan_set_description') {
    const description = text.trim();
    console.log(`📝 Обработка clan_set_description: userId=${userId}, clanId=${state.clanId}, description="${description}"`);
    
    if (description.length > 200) {
      return bot.sendMessage(userId, '❌ Описание не должно превышать 200 символов. Попробуйте еще раз:');
    }
    
    clanManagement.setClanDescription(state.clanId, description, (err) => {
      adminState.delete(userId);
      
      if (err) {
        console.error(`❌ Ошибка setClanDescription:`, err);
        return bot.sendMessage(userId, `❌ ${err.message}`);
      }
      
      console.log(`✅ Описание клана успешно установлено для clanId=${state.clanId}`);
      
      bot.sendMessage(userId, 
        `✅ Описание клана установлено:\n\n"${description}"`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '⚙️ Настройки клана', callback_data: 'clan_settings' }],
              [{ text: '🔙 Назад', callback_data: 'clan' }]
            ]
          }
        }
      );
    });
  }
});

// Обработка фото для аватара клана
bot.on('photo', (msg) => {
  const userId = msg.from.id;
  
  if (!adminState.has(userId)) return;
  
  const state = adminState.get(userId);
  
  if (state.action === 'clan_set_avatar') {
    // Берем фото наибольшего размера
    const photo = msg.photo[msg.photo.length - 1];
    const fileId = photo.file_id;
    
    clanManagement.setClanAvatar(state.clanId, fileId, (err) => {
      adminState.delete(userId);
      
      if (err) {
        return bot.sendMessage(userId, '❌ Ошибка установки аватара');
      }
      
      bot.sendMessage(userId, 
        '✅ Аватар клана установлен!',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '⚙️ Настройки клана', callback_data: 'clan_settings' }],
              [{ text: '🔙 Назад', callback_data: 'clan' }]
            ]
          }
        }
      );
    });
  }
});

bot.onText(/\/profile/, async (msg) => {
  const userId = msg.from.id;
  
  // Проверяем подписку
  const isSubscribed = await requireSubscription(userId, msg.chat.id);
  if (!isSubscribed) return;
  
  getOrCreatePlayer(userId, msg.from.username, (err, player) => {
    if (err) return bot.sendMessage(userId, '❌ Ошибка');
    
    db.get(`SELECT * FROM races WHERE id = ?`, [player.race_id], (err, race) => {
      const rarityIcon = config.RARITY[race.rarity].color;
      const expNeeded = config.EXP_PER_LEVEL * Math.pow(config.EXP_MULTIPLIER, player.level - 1);
      const winRate = player.wins + player.losses > 0 
        ? ((player.wins / (player.wins + player.losses)) * 100).toFixed(1) 
        : 0;
      
      duels.calculatePlayerPower(userId, (err, stats) => {
        bot.sendMessage(userId,
          `👤 Профиль игрока\n\n` +
          `🆔 ID: ${player.user_id}\n` +
          `👤 Имя: ${player.username}\n` +
          `📊 Уровень: ${player.level}\n` +
          `✨ Опыт: ${player.exp}/${Math.floor(expNeeded)}\n` +
          `💰 Золото: ${player.gold}\n\n` +
          `${rarityIcon} Раса: ${race.name} (${config.RARITY[race.rarity].name})\n` +
          `🌟 Пробуждение: ${player.awakening_level}\n\n` +
          `⚔️ Боевые характеристики:\n` +
          `⚡ Сила: ${stats.power}\n` +
          `❤️ HP: ${stats.hp}\n` +
          `🗡️ Атака: ${stats.attack}\n` +
          `🛡️ Защита: ${stats.defense}\n\n` +
          `🏆 Статистика:\n` +
          `✅ Побед: ${player.wins}\n` +
          `❌ Поражений: ${player.losses}\n` +
          `📈 Винрейт: ${winRate}%`,
          getMainMenu(true)
        );
      });
    });
  });
});

bot.onText(/\/race/, (msg) => {
  const userId = msg.from.id;
  
  getOrCreatePlayer(userId, msg.from.username, (err, player) => {
    if (err) return bot.sendMessage(userId, '❌ Ошибка');
    
    db.get(`SELECT * FROM races WHERE id = ?`, [player.race_id], (err, race) => {
      const rarityIcon = config.RARITY[race.rarity].color;
      
      let parentInfo = '';
      if (race.parent_race_1 && race.parent_race_2) {
        db.all(`SELECT name FROM races WHERE id IN (?, ?)`, 
          [race.parent_race_1, race.parent_race_2], (err, parents) => {
            if (parents && parents.length === 2) {
              parentInfo = `\n🧬 Родители: ${parents[0].name} + ${parents[1].name}`;
            }
            
            sendRaceInfo();
          });
      } else {
        sendRaceInfo();
      }
      
      function sendRaceInfo() {
        bot.sendMessage(userId,
          `${rarityIcon} ${race.name}\n\n` +
          `📝 Описание: ${race.description}\n` +
          `⭐ Редкость: ${config.RARITY[race.rarity].name}\n` +
          `${race.is_legendary ? '👑 ЛЕГЕНДАРНАЯ РАСА\n' : ''}\n` +
          `⚡ Базовая сила: ${race.base_power}\n` +
          `❤️ Базовое HP: ${race.base_hp}\n` +
          `🗡️ Базовая атака: ${race.base_attack}\n` +
          `🛡️ Базовая защита: ${race.base_defense}\n\n` +
          `🎯 Особенность: ${race.special_ability}` +
          parentInfo
        );
      }
    });
  });
});

bot.onText(/\/loot/, (msg) => {
  const userId = msg.from.id;
  
  getOrCreatePlayer(userId, msg.from.username, (err, player) => {
    if (err) return bot.sendMessage(userId, '❌ Ошибка');
    
    items.getRandomItem((err, item) => {
      if (err) return bot.sendMessage(userId, '❌ Ошибка при получении предмета');
      
      items.addItemToInventory(userId, item.id, (err) => {
        if (err) return bot.sendMessage(userId, '❌ Ошибка при добавлении в инвентарь');
        
        const rarityIcon = config.RARITY[item.rarity].color;
        
        bot.sendMessage(userId,
          `🎁 Вы нашли предмет!\n\n` +
          `${rarityIcon} ${item.name}\n` +
          `📝 ${item.description}\n` +
          `⭐ Редкость: ${config.RARITY[item.rarity].name}\n` +
          `🎒 Тип: ${item.type}\n\n` +
          `Бонусы:\n` +
          `⚡ Сила: +${item.power_bonus}\n` +
          `❤️ HP: +${item.hp_bonus}\n` +
          `🗡️ Атака: +${item.attack_bonus}\n` +
          `🛡️ Защита: +${item.defense_bonus}`
        );
        
        // Добавляем опыт
        db.run(`UPDATE players SET exp = exp + 10 WHERE user_id = ?`, [userId], () => {
          checkLevelUp(userId);
        });
      });
    });
  });
});

bot.onText(/\/inventory/, (msg) => {
  const userId = msg.from.id;
  
  db.all(`SELECT inv.id as inv_id, inv.equipped, i.* FROM inventory inv
          JOIN items i ON inv.item_id = i.id
          WHERE inv.player_id = ?
          ORDER BY i.rarity DESC, i.name`, [userId], (err, items) => {
    if (err || items.length === 0) {
      return bot.sendMessage(userId, '🎒 Ваш инвентарь пуст');
    }
    
    let message = '🎒 Ваш инвентарь:\n\n';
    
    items.forEach(item => {
      const rarityIcon = config.RARITY[item.rarity].color;
      const equipped = item.equipped ? '✅' : '';
      message += `${equipped}${rarityIcon} [${item.inv_id}] ${item.name} (${item.type})\n`;
    });
    
    message += '\n💡 Используйте /equip [id] для экипировки';
    
    bot.sendMessage(userId, message);
  });
});

bot.onText(/\/equip (.+)/, (msg, match) => {
  const userId = msg.from.id;
  const inventoryId = parseInt(match[1]);
  
  items.equipItem(userId, inventoryId, (err) => {
    if (err) {
      return bot.sendMessage(userId, `❌ ${err.message}`);
    }
    
    bot.sendMessage(userId, '✅ Предмет экипирован!');
  });
});

bot.onText(/\/duel(?:\s+@?(\w+))?/, (msg, match) => {
  const userId = msg.from.id;
  const targetUsername = match[1];
  
  if (!targetUsername) {
    // Случайный противник
    db.get(`SELECT user_id FROM players WHERE user_id != ? ORDER BY RANDOM() LIMIT 1`,
      [userId], (err, opponent) => {
        if (!opponent) {
          return bot.sendMessage(userId, '❌ Не найдено противников');
        }
        
        startDuel(userId, opponent.user_id);
      });
  } else {
    // Конкретный противник
    db.get(`SELECT user_id FROM players WHERE username = ?`, [targetUsername], (err, opponent) => {
      if (!opponent) {
        return bot.sendMessage(userId, '❌ Игрок не найден');
      }
      
      startDuel(userId, opponent.user_id);
    });
  }
  
  function startDuel(p1Id, p2Id) {
    duels.conductDuel(p1Id, p2Id, (err, result) => {
      if (err) return bot.sendMessage(userId, '❌ Ошибка дуэли');
      
      const battleText = result.battleLog.join('\n');
      const winnerText = result.winnerId === p1Id ? '🎉 Вы победили!' : '😢 Вы проиграли';
      
      bot.sendMessage(p1Id,
        `⚔️ Дуэль началась!\n\n` +
        `${battleText}\n\n` +
        `${winnerText}\n` +
        `+${result.winnerId === p1Id ? 50 : 10} опыта`
      );
      
      if (p2Id !== p1Id) {
        const winnerText2 = result.winnerId === p2Id ? '🎉 Вы победили!' : '😢 Вы проиграли';
        bot.sendMessage(p2Id,
          `⚔️ Вас вызвали на дуэль!\n\n` +
          `${battleText}\n\n` +
          `${winnerText2}\n` +
          `+${result.winnerId === p2Id ? 50 : 10} опыта`
        );
      }
      
      checkLevelUp(p1Id);
      checkLevelUp(p2Id);
      
      achievements.checkAchievements(result.winnerId, (err, newAchs) => {
        if (newAchs && newAchs.length > 0) {
          newAchs.forEach(ach => {
            bot.sendMessage(result.winnerId, 
              `${ach.icon} Достижение: ${ach.name}\n💰 +${ach.reward_gold} золота`);
          });
        }
      });
    });
  }
});

bot.onText(/\/top/, (msg) => {
  duels.getTopPlayers(10, (err, players) => {
    if (err || players.length === 0) {
      return bot.sendMessage(msg.chat.id, '❌ Топ игроков пуст');
    }
    
    let message = '🏆 Топ-10 игроков:\n\n';
    
    players.forEach((player, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const rarityIcon = player.race_rarity ? config.RARITY[player.race_rarity].color : '⚪️';
      const vipIcon = player.is_vip ? '💎 ' : '';
      const displayName = player.display_name || player.username;
      const raceName = player.race_name || 'Без расы';
      
      message += `${medal} ${vipIcon}${displayName} ${rarityIcon}${raceName}\n`;
      message += `   🌲 Лес: ${player.forest_level || 1} | ⚡ ${player.power} | 💰 ${player.gold}\n\n`;
    });
    
    bot.sendMessage(msg.chat.id, message);
  });
});

bot.onText(/\/quests/, (msg) => {
  const userId = msg.from.id;
  
  quests.getAvailableQuests(userId, (err, availableQuests) => {
    if (err || availableQuests.length === 0) {
      return bot.sendMessage(userId, '📋 Нет доступных квестов');
    }
    
    let message = '📋 Доступные квесты:\n\n';
    
    availableQuests.forEach(quest => {
      const daily = quest.is_daily ? '⏰ ' : '';
      message += `${daily}${quest.name}\n`;
      message += `📝 ${quest.description}\n`;
      message += `🎁 Награда: ${quest.reward_gold}💰 ${quest.reward_exp}✨\n\n`;
    });
    
    bot.sendMessage(userId, message);
  });
});

bot.onText(/\/achievements/, (msg) => {
  const userId = msg.from.id;
  
  achievements.getPlayerAchievements(userId, (err, playerAchs) => {
    if (err || playerAchs.length === 0) {
      return bot.sendMessage(userId, '🏅 У вас пока нет достижений');
    }
    
    let message = '🏅 Ваши достижения:\n\n';
    
    playerAchs.forEach(ach => {
      message += `${ach.icon} ${ach.name}\n`;
      message += `   ${ach.description}\n\n`;
    });
    
    bot.sendMessage(userId, message);
  });
});

bot.onText(/\/createclan (.+)/, (msg, match) => {
  const userId = msg.from.id;
  const clanName = match[1];
  
  clans.createClan(userId, clanName, (err, clan) => {
    if (err) {
      return bot.sendMessage(userId, `❌ ${err.message}`, getMainMenu());
    }
    
    bot.sendMessage(userId,
      `🏰 Клан "${clan.name}" создан!\n\n` +
      `👑 Вы стали лидером клана`,
      getMainMenu()
    );
  });
});

bot.onText(/\/clan/, (msg) => {
  const userId = msg.from.id;
  
  getOrCreatePlayer(userId, msg.from.username, (err, player) => {
    if (!player.clan_id) {
      return bot.sendMessage(userId, '❌ Вы не состоите в клане\n💡 Используйте /createclan или /joinclan');
    }
    
    clans.getClanInfo(player.clan_id, (err, clan) => {
      if (err) return bot.sendMessage(userId, '❌ Ошибка');
      
      clans.getClanMembers(player.clan_id, (err, members) => {
        let message = `🏰 Клан: ${clan.name}\n\n`;
        message += `📊 Уровень: ${clan.level}\n`;
        message += `👥 Участников: ${clan.member_count}/${config.CLAN_MAX_MEMBERS}\n`;
        message += `⚡ Общая сила: ${clan.total_power}\n\n`;
        message += `👥 Члены клана:\n`;
        
        members.forEach((member, index) => {
          const leader = member.user_id === clan.leader_id ? '👑' : '';
          message += `${leader}${index + 1}. ${member.username} (Ур.${member.level}, ⚡${member.power})\n`;
        });
        
        bot.sendMessage(userId, message);
      });
    });
  });
});

bot.onText(/\/clantop/, (msg) => {
  clans.getTopClans(10, (err, topClans) => {
    if (err || topClans.length === 0) {
      return bot.sendMessage(msg.chat.id, '🏰 Нет кланов');
    }
    
    let message = '🏆 Топ-10 кланов:\n\n';
    
    topClans.forEach((clan, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      message += `${medal} ${clan.name}\n`;
      message += `   👥 ${clan.member_count} | ⚡ ${clan.total_power || 0}\n\n`;
    });
    
    bot.sendMessage(msg.chat.id, message);
  });
});

bot.onText(/\/crossbreed (\d+) (\d+)/, (msg, match) => {
  const userId = msg.from.id;
  const race1Id = parseInt(match[1]);
  const race2Id = parseInt(match[2]);
  
  races.crossbreedRaces(race1Id, race2Id, (err, hybridRace) => {
    if (err) {
      return bot.sendMessage(userId, `❌ Ошибка скрещивания: ${err.message}`);
    }
    
    const rarityIcon = config.RARITY[hybridRace.rarity].color;
    
    bot.sendMessage(userId,
      `🧬 Скрещивание успешно!\n\n` +
      `${rarityIcon} Новая раса: ${hybridRace.name}\n` +
      `⭐ Редкость: ${config.RARITY[hybridRace.rarity].name}\n` +
      `⚡ Сила: ${hybridRace.base_power}\n` +
      `🎯 Особенность: ${hybridRace.special_ability}`
    );
  });
});

console.log('🤖 Бот запущен!');

// Логируем запуск бота
sendLogMessage(
  `🤖 Бот успешно запущен\n` +
  `⏰ Время запуска: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}\n` +
  `🔧 Режим: ${process.env.NODE_ENV || 'development'}`,
  'SYSTEM'
);


// Обработка callback кнопок
bot.on('callback_query', async (query) => {
  const userId = query.from.id;
  const data = query.data;
  const messageId = query.message.message_id;
  const chatId = query.message.chat.id;
  
  logWithPlayer(`📥 Получен callback: data="${data}"`, userId);
  
  // Специальная обработка для проверки подписки
  if (data === 'check_subscription') {
    const isSubscribed = await checkSubscription(userId);
    
    if (isSubscribed) {
      // Перенаправляем на /start
      const username = query.from.username || query.from.first_name;
      getOrCreatePlayer(userId, username, (err, player) => {
        if (err) {
          return bot.sendMessage(userId, '❌ Ошибка');
        }
        
        if (!player.race_id) {
          editImageWithText(chatId, messageId, 'main_menu.jpg',
            `🎮 Добро пожаловать!\n\n` +
            `💎 Кристаллы: ${player.crystals}\n\n` +
            `🎰 Получите свою первую расу!`,
            getMainMenu(false)
          );
        } else {
          db.get(`SELECT * FROM races WHERE id = ?`, [player.race_id], (err, race) => {
            const rarityIcon = config.RARITY[race.rarity].color;
            const vipIcon = player.is_vip ? '💎 ' : '';
            const raceImage = getRaceImageName(race.name);
            
            editImageWithText(chatId, messageId, `races/${raceImage}`,
              `${vipIcon}${player.display_name || username}\n\n` +
              `${rarityIcon} ${race.name} • Ур.${player.level}\n` +
              `⚡ ${player.power} | 💰 ${player.gold} | 💎 ${player.crystals}`,
              getMainMenu(true)
            );
          });
        }
      });
    } else {
      bot.answerCallbackQuery(query.id, { text: '❌ Подпишитесь на канал!', show_alert: true });
      bot.sendMessage(chatId, '❌ Вы не подписаны на канал!');
    }
    return;
  }
  
  // Проверяем подписку для всех остальных действий
  const isSubscribed = await requireSubscription(userId, chatId);
  if (!isSubscribed) return;
  
  // Проверяем, не находится ли игрок в бою (кроме боевых действий)
  const battleActions = ['battle_attack', 'battle_defend', 'battle_special', 'battle_use_potion'];
  if (!battleActions.includes(data)) {
    const battle = battleSystem.getBattle(userId);
    if (battle) {
      bot.answerCallbackQuery(query.id, { 
        text: '⚔️ Завершите текущий бой!', 
        show_alert: true 
      });
      return;
    }
  }
  
  // Специальная обработка для кнопок с динамическими данными
  // ВАЖНО: проверяем confirm_delete_player_ перед общим confirm_delete_
  if (data.startsWith('confirm_delete_player_')) {
    if (query.from.username !== config.ADMIN_USERNAME) {
      return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
    }
    
    const targetUserId = parseInt(data.replace('confirm_delete_player_', ''));
    
    // Удаляем игрока из всех таблиц
    db.run(`DELETE FROM players WHERE user_id = ?`, [targetUserId], (err) => {
      if (err) {
        console.error('Ошибка удаления игрока:', err);
        return bot.sendMessage(userId, '❌ Ошибка удаления игрока');
      }
      
      // Удаляем из инвентаря
      db.run(`DELETE FROM inventory WHERE player_id = ?`, [targetUserId]);
      
      // Удаляем из кланов (если лидер - удаляем клан)
      db.get(`SELECT * FROM clans WHERE leader_id = ?`, [targetUserId], (err, clan) => {
        if (clan) {
          db.run(`DELETE FROM clans WHERE id = ?`, [clan.id]);
          db.run(`UPDATE players SET clan_id = NULL WHERE clan_id = ?`, [clan.id]);
        }
      });
      
      // Обнуляем реферера у тех кто был приглашен этим игроком
      db.run(`UPDATE players SET referrer_id = NULL WHERE referrer_id = ?`, [targetUserId]);
      
      bot.sendMessage(userId, `✅ Игрок (ID: ${targetUserId}) успешно удален из базы данных`);
    });
    return;
  }
  
  // Обработка динамических callback_data для редактирования рас и предметов
  if (data.startsWith('admin_edit_race_')) {
    if (query.from.username !== config.ADMIN_USERNAME) {
      return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
    }
    
    const raceId = parseInt(data.replace('admin_edit_race_', ''));
    
    db.get(`SELECT * FROM races WHERE id = ?`, [raceId], (err, race) => {
      if (err || !race) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Раса не найдена', show_alert: true });
      }
      
      const rarityIcon = config.RARITY[race.rarity]?.color || '⚪️';
      const rarityName = config.RARITY[race.rarity]?.name || 'Неизвестно';
      
      safeEditMessageText(chatId, messageId,
        `📝 *Редактирование расы*\n\n` +
        `${rarityIcon} *${race.name}*\n` +
        `${rarityName}\n\n` +
        `📊 *Характеристики:*\n` +
        `⚡ Сила: ${race.base_power}\n` +
        `❤️ Здоровье: ${race.base_hp}\n` +
        `🗡️ Атака: ${race.base_attack}\n` +
        `🛡️ Защита: ${race.base_defense}\n\n` +
        `🎯 *Способность:* ${race.special_ability || 'Нет'}\n` +
        `📝 *Описание:* ${race.description || 'Нет'}`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📝 Изменить название', callback_data: `edit_race_name_${raceId}` },
                { text: '🎨 Изменить редкость', callback_data: `edit_race_rarity_${raceId}` }
              ],
              [
                { text: '⚡ Изменить силу', callback_data: `edit_race_power_${raceId}` },
                { text: '❤️ Изменить HP', callback_data: `edit_race_hp_${raceId}` }
              ],
              [
                { text: '🗡️ Изменить атаку', callback_data: `edit_race_attack_${raceId}` },
                { text: '🛡️ Изменить защиту', callback_data: `edit_race_defense_${raceId}` }
              ],
              [
                { text: '🎯 Изменить способность', callback_data: `edit_race_ability_${raceId}` }
              ],
              [
                { text: '📝 Изменить описание', callback_data: `edit_race_desc_${raceId}` }
              ],
              [
                { text: '🗑️ Удалить расу', callback_data: `delete_race_${raceId}` }
              ],
              [
                { text: '🔙 К списку рас', callback_data: 'admin_list_races' }
              ]
            ]
          }
        }
      );
    });
    return;
  }
  
  if (data.startsWith('admin_edit_item_')) {
    if (query.from.username !== config.ADMIN_USERNAME) {
      return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
    }
    
    const itemId = parseInt(data.replace('admin_edit_item_', ''));
    
    db.get(`SELECT * FROM items WHERE id = ?`, [itemId], (err, item) => {
      if (err || !item) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Предмет не найден', show_alert: true });
      }
      
      const rarityIcon = config.RARITY[item.rarity]?.color || '⚪️';
      const rarityName = config.RARITY[item.rarity]?.name || 'Неизвестно';
      const slotIcons = {
        helmet: '🪖', chest: '🛡️', legs: '👖', boots: '👢',
        weapon: '⚔️', shield: '🛡️', artifact_1: '💎', artifact_2: '💎', accessory: '🎒'
      };
      const slotIcon = slotIcons[item.slot] || '❓';
      
      safeEditMessageText(chatId, messageId,
        `📝 *Редактирование предмета*\n\n` +
        `${rarityIcon}${slotIcon} *${item.name}*\n` +
        `${rarityName} ${item.slot}\n\n` +
        `📊 *Характеристики:*\n` +
        `⚡ Сила: +${item.power_bonus}\n` +
        `❤️ Здоровье: +${item.hp_bonus}\n` +
        `🗡️ Атака: +${item.attack_bonus}\n` +
        `🛡️ Защита: +${item.defense_bonus}\n\n` +
        `✨ *Эффект:* ${item.special_effect || 'Нет'}\n` +
        `📝 *Описание:* ${item.description || 'Нет'}`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📝 Изменить название', callback_data: `edit_item_name_${itemId}` },
                { text: '🎨 Изменить редкость', callback_data: `edit_item_rarity_${itemId}` }
              ],
              [
                { text: '🎒 Изменить слот', callback_data: `edit_item_slot_${itemId}` }
              ],
              [
                { text: '⚡ Изменить силу', callback_data: `edit_item_power_${itemId}` },
                { text: '❤️ Изменить HP', callback_data: `edit_item_hp_${itemId}` }
              ],
              [
                { text: '🗡️ Изменить атаку', callback_data: `edit_item_attack_${itemId}` },
                { text: '🛡️ Изменить защиту', callback_data: `edit_item_defense_${itemId}` }
              ],
              [
                { text: '✨ Изменить эффект', callback_data: `edit_item_effect_${itemId}` }
              ],
              [
                { text: '📝 Изменить описание', callback_data: `edit_item_desc_${itemId}` }
              ],
              [
                { text: '🗑️ Удалить предмет', callback_data: `delete_item_${itemId}` }
              ],
              [
                { text: '🔙 К списку предметов', callback_data: 'admin_list_items' }
              ]
            ]
          }
        }
      );
    });
    return;
  }
  
  console.log(`🔀 Обработка switch для data="${data}"`);
  
  switch(data) {
    case 'main_menu':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        editImageWithText(chatId, messageId, 'main_menu.jpg', '🎮 Главное меню:', {
          ...getMainMenu(!!player.race_id)
        });
      });
      break;
      
    case 'roll_race':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err) return bot.sendMessage(userId, '❌ Ошибка');
        
        const canRollCrystal = player.crystals >= config.RACE_ROLL_CRYSTAL_COST;
        
        const buttons = [];
        
        if (canRollCrystal) {
          buttons.push([{
            text: `💎 ${config.RACE_ROLL_CRYSTAL_COST} кристаллов`,
            callback_data: 'roll_crystal'
          }]);
        }
        
        if (!canRollCrystal) {
          buttons.push([{
            text: '❌ Нужно 10 кристаллов!',
            callback_data: 'crystal_info'
          }]);
        }
        
        buttons.push([{ text: '🔙 Назад', callback_data: 'main_menu' }]);
        
        let messageText = `🎰 Крутка рас\n\n` +
          `💎 ${player.crystals}\n\n` +
          `⚪️ 60% | 🔵 25% | 🟣 10%\n` +
          `🔴 4% | 🟡 0.5% | ⚫️ 0.001%`;
        
        // Если не хватает кристаллов, показываем способы получения
        if (!canRollCrystal) {
          messageText += `\n\n💡 Как получить кристаллы:\n` +
            `🌲 Побеждайте боссов в лесу (каждые 10 ур.)\n` +
            `👥 Приглашайте друзей (1💎 за друга)\n` +
            `🐉 Участвуйте в рейдах`;
        }
        
        editImageWithText(chatId, messageId, 'race_gacha.jpg',
          messageText,
          {
            reply_markup: { inline_keyboard: buttons }
          }
        );
      });
      break;
      
    case 'crystal_info':
      bot.answerCallbackQuery(query.id, {
        text: '💎 Получайте кристаллы: побеждайте боссов в лесу, приглашайте друзей!',
        show_alert: true
      });
      break;
      
    case 'roll_crystal':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err) return bot.sendMessage(userId, '❌ Ошибка');
        
        const cost = config.RACE_ROLL_CRYSTAL_COST;
        
        if (player.crystals < cost) {
          return bot.sendMessage(userId, `❌ Недостаточно кристаллов! Нужно: ${cost}💎`);
        }
        
        races.getRandomRace((err, race) => {
          if (err) return bot.sendMessage(userId, '❌ Ошибка');
          
          const rarityIcon = config.RARITY[race.rarity].color;
          
          // Сохраняем флаг - была ли это первая раса
          const isFirstRace = !player.race_id;
          
          // Списываем кристаллы и обновляем расу
          db.run(`UPDATE players SET crystals = crystals - ?, race_id = ? WHERE user_id = ?`,
            [cost, race.id, userId], () => {
              
              const raceImage = getRaceImageName(race.name);
              
              sendImageWithText(userId, `races/${raceImage}`,
                `✨ НОВАЯ РАСА ✨\n\n` +
                `${rarityIcon} *${race.name}*\n` +
                `${config.RARITY[race.rarity].name}\n\n` +
                `⚡ ${race.base_power} | ❤️ ${race.base_hp}\n` +
                `🗡️ ${race.base_attack} | 🛡️ ${race.base_defense}\n\n` +
                `🎯 ${race.special_ability}`,
                { parse_mode: 'Markdown', ...getMainMenu(true) }
              );
              
              // Логируем получение расы
              sendLogMessage(
                `🧬 Получена новая раса\n` +
                `👤 Игрок: ${userId} (@${query.from.username || 'без username'})\n` +
                `${rarityIcon} Раса: ${race.name} (${config.RARITY[race.rarity].name})\n` +
                `💎 Потрачено: ${cost} кристаллов\n` +
                `${isFirstRace ? '🎉 Первая раса!' : '🔄 Смена расы'}`,
                'RACE'
              );
              
              // Проверяем достижения только если это первая раса
              if (isFirstRace) {
                achievements.checkAchievements(userId, (err, newAchs) => {
                  if (newAchs && newAchs.length > 0) {
                    newAchs.forEach(ach => {
                      bot.sendMessage(userId, 
                        `${ach.icon} Достижение: ${ach.name}\n💰 +${ach.reward_gold} золота`);
                      
                      // Логируем достижение
                      sendLogMessage(
                        `🏅 Достижение получено\n` +
                        `👤 Игрок: ${userId}\n` +
                        `${ach.icon} Достижение: ${ach.name}\n` +
                        `💰 Награда: ${ach.reward_gold} золота`,
                        'SUCCESS'
                      );
                    });
                  }
                });
              }
            });
        });
      });
      break;
      
    case 'roll_gold':
      // Крутка за золото больше недоступна
      bot.answerCallbackQuery(query.id, {
        text: '❌ Крутка за золото недоступна! Используйте кристаллы.',
        show_alert: true
      });
      break;
      
    case 'battle_menu':
      editImageWithText(chatId, messageId, 'battle_menu.jpg',
        '⚔️ *Битвы*\n\n' +
        'Выберите действие:',
        {
          parse_mode: 'Markdown',
          ...getBattleMenu()
        }
      );
      break;
      
    case 'rating_menu':
      editImageWithText(chatId, messageId, 'rating_menu.jpg',
        '🏆 *Рейтинг*\n\n' +
        'Выберите категорию:',
        {
          parse_mode: 'Markdown',
          ...getRatingMenu()
        }
      );
      break;
      
    case 'rewards_menu':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        editImageWithText(chatId, messageId, 'rewards_menu.jpg',
          '🎁 *Награды*\n\n' +
          `💰 ${player.gold} | 💎 ${player.crystals}\n\n` +
          'Выберите действие:',
          {
            parse_mode: 'Markdown',
            ...getRewardsMenu()
          }
        );
      });
      break;
      
    case 'referral':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err) return bot.sendMessage(userId, '❌ Ошибка');
        
        // Получаем имя бота динамически
        bot.getMe().then(botInfo => {
          const botUsername = botInfo.username;
          const referralLink = `https://t.me/${botUsername}?start=${userId}`;
          
          bot.sendMessage(userId,
            `👥 *Реферальная система*\n\n` +
            `Приглашайте друзей и получайте награды!\n\n` +
            `🎁 *Награда:* 1 💎 кристалл за каждого друга\n` +
            `📊 *Приглашено друзей:* ${player.referral_count || 0}\n\n` +
            `🔗 *Ваша реферальная ссылка:*\n` +
            `\`${referralLink}\`\n\n` +
            `💡 Награда выдается сразу, когда друг нажмет /start по вашей ссылке!`,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 Назад', callback_data: 'rewards_menu' }]
                ]
              }
            }
          );
        }).catch(err => {
          console.error('Ошибка получения информации о боте:', err);
          // Fallback на старое имя
          const referralLink = `https://t.me/zilsor_bot?start=${userId}`;
          
          bot.sendMessage(userId,
            `👥 *Реферальная система*\n\n` +
            `Приглашайте друзей и получайте награды!\n\n` +
            `🎁 *Награда:* 1 💎 кристалл за каждого друга\n` +
            `📊 *Приглашено друзей:* ${player.referral_count || 0}\n\n` +
            `🔗 *Ваша реферальная ссылка:*\n` +
            `\`${referralLink}\`\n\n` +
            `💡 Награда выдается сразу, когда друг нажмет /start по вашей ссылке!`,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 Назад', callback_data: 'rewards_menu' }]
                ]
              }
            }
          );
        });
      });
      break;
      
    case 'shop':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err) return bot.sendMessage(userId, '❌ Ошибка');
        
        editImageWithText(chatId, messageId, 'shop_menu.jpg',
          `🛒 *Магазин*\n\n` +
          `💰 Ваше золото: ${player.gold}\n\n` +
          `Выберите категорию:`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🧪 Зелья', callback_data: 'shop_potions' }],
                [{ text: '💎 Донат', callback_data: 'shop_donate' }],
                [{ text: '🔙 Назад', callback_data: 'main_menu' }]
              ]
            }
          }
        );
      });
      break;
      
    case 'shop_potions':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err) return bot.sendMessage(userId, '❌ Ошибка');
        
        potions.getAllPotions((err, allPotions) => {
          if (err || !allPotions) {
            return bot.sendMessage(userId, '❌ Ошибка загрузки зелий');
          }
          
          let message = `🧪 *Магазин зелий*\n\n💰 Ваше золото: ${player.gold}\n\n`;
          const buttons = [];
          
          allPotions.forEach(potion => {
            message += `${potion.name}\n`;
            message += `📝 ${potion.description}\n`;
            message += `💰 Цена: ${potion.price} золота\n\n`;
            
            buttons.push([{
              text: `${potion.name} - ${potion.price}💰`,
              callback_data: `buy_potion_${potion.id}`
            }]);
          });
          
          buttons.push([{ text: '🔙 Назад', callback_data: 'shop' }]);
          
          safeEditMessageText(chatId, messageId, message, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: buttons }
          });
        });
      });
      break;
      
    case 'shop_donate':
      bot.sendMessage(userId,
        `💎 *Донат магазин*\n\n` +
        `💎 *Кристаллы:*\n` +
        `• 100 кристаллов - 119₽\n` +
        `• 200 кристаллов - 219₽\n` +
        `• 500 кристаллов - 420₽\n\n` +
        `⭐ *VIP статус:*\n` +
        `• VIP подписка - 300₽\n\n` +
        `⏰ *Другое:*\n` +
        `• Сброс всех КД - 79₽\n\n` +
        `📞 Для покупки пишите: @trimetillllll`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '💬 Написать @trimetillllll', url: 'https://t.me/trimetillllll' }],
              [{ text: '🔙 Назад', callback_data: 'shop' }]
            ]
          }
        }
      );
      break;
      
    case 'raids_menu':
      // Главное меню рейдов
      editImageWithText(chatId, messageId, 'raids/raid_main.jpg',
        `🐉 *РЕЙДЫ*\n\n` +
        `Сражайтесь с могущественными боссами вместе с другими игроками!\n\n` +
        `💰 Награды делятся пропорционально нанесенному урону\n` +
        `⚠️ Минимум 2% урона для получения награды`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '👹 Выбрать босса', callback_data: 'select_raid_boss' }],
              [{ text: '🔙 Назад', callback_data: 'main_menu' }]
            ]
          }
        }
      );
      break;
      
    case 'select_raid_boss':
      // Меню выбора босса со скроллом
      showRaidBossSelection(chatId, messageId, 0, userId, query.from.username);
      break;
      
    case 'profile':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err) return bot.sendMessage(userId, '❌ Ошибка');
        
        if (!player.race_id) {
          return safeEditMessageText(chatId, messageId, '❌ Сначала получите расу!', {
            ...getMainMenu(false)
          });
        }
        
        db.get(`SELECT * FROM races WHERE id = ?`, [player.race_id], (err, race) => {
          if (err || !race) {
            return bot.sendMessage(userId, '❌ Раса не найдена');
          }
          
          const rarityIcon = config.RARITY[race.rarity].color;
          const vipIcon = player.is_vip ? '💎 ' : '';
          const expNeeded = config.EXP_PER_LEVEL * Math.pow(config.EXP_MULTIPLIER, player.level - 1);
          const winRate = player.wins + player.losses > 0 
            ? ((player.wins / (player.wins + player.losses)) * 100).toFixed(1) 
            : 0;
          const playerMMR = player.mmr || 0;
          
          duels.calculatePlayerPower(userId, (err, stats) => {
            if (err || !stats) {
              console.error('Ошибка расчета силы игрока:', err);
              stats = { power: 100, hp: 100, attack: 50, defense: 50, elements: [] };
            }
            
            const elementsText = stats.elements && stats.elements.length > 0 ? `\n🌟 Элементы: ${stats.elements.join(' ')}` : '';
            const raceImage = getRaceImageName(race.name);
            
            // Отправляем профиль с изображением расы
            editImageWithText(chatId, messageId, `races/${raceImage}`,
              `${vipIcon}${player.display_name || player.username}\n\n` +
              `${rarityIcon} ${race.name} • Ур.${player.level}\n` +
              `✨ ${player.exp}/${Math.floor(expNeeded)} XP\n` +
              `💰 ${player.gold} | 💎 ${player.crystals}\n\n` +
              `⚔️ Характеристики\n` +
              `⚡ ${stats.power} | ❤️ ${stats.hp}\n` +
              `🗡️ ${stats.attack} | 🛡️ ${stats.defense}${elementsText}\n\n` +
              `🏆 Статистика\n` +
              `🎯 MMR: ${playerMMR}\n` +
              `${player.wins}W / ${player.losses}L (${winRate}%)\n` +
              `🌟 Пробуждение: ${player.awakening_level}\n` +
              `🔮 XP пробуждения: ${player.awakening_xp}/${config.AWAKENING_XP_REQUIRED}`,
              getMainMenu(true)
            );
          });
        });
      });
      break;
      
    case 'race':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err) return bot.sendMessage(userId, '❌ Ошибка');
        
        if (!player.race_id) {
          return safeEditMessageText(chatId, messageId, '❌ Сначала получите расу!', {
            ...getMainMenu(false)
          });
        }
        
        db.get(`SELECT * FROM races WHERE id = ?`, [player.race_id], (err, race) => {
          if (err || !race) {
            return bot.sendMessage(userId, '❌ Раса не найдена');
          }
          
          const rarityIcon = config.RARITY[race.rarity].color;
          const raceImage = getRaceImageName(race.name);
          
          editImageWithText(chatId, messageId, `races/${raceImage}`,
            `${rarityIcon} *${race.name}*\n` +
            `${config.RARITY[race.rarity].name}\n\n` +
            `⚡ ${race.base_power} | ❤️ ${race.base_hp}\n` +
            `🗡️ ${race.base_attack} | 🛡️ ${race.base_defense}\n\n` +
            `🎯 ${race.special_ability}`,
            {
              parse_mode: 'Markdown',
              ...getUpgradeMenu()
            }
          );
        });
      });
      break;
      
    case 'dark_forest':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err) return bot.sendMessage(userId, '❌ Ошибка');
        
        if (!player.race_id) {
          return bot.sendMessage(userId, '❌ Сначала получите расу!', getMainMenu(false));
        }
        
        const cooldown = checkCooldown(player.last_forest_time, 30); // 30 секунд
        
        if (!cooldown.ready) {
          return safeEditMessageText(chatId, messageId, 
            formatCooldownMessage('Темный лес', cooldown), {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Назад', callback_data: 'battle_menu' }]
              ]
            }
          });
        }
        
        let enemy;
        
        // Проверяем есть ли сохраненный враг
        if (player.current_forest_enemy) {
          try {
            enemy = JSON.parse(player.current_forest_enemy);
            console.log(`♻️ Загружен сохраненный враг: ${enemy.name}`);
          } catch (e) {
            console.error('Ошибка парсинга врага:', e);
            enemy = null;
          }
        }
        
        // Если нет сохраненного врага - генерируем нового
        if (!enemy) {
          const forestLevel = player.forest_level || 1;
          
          // Проверяем доступен ли босс
          const bossCheck = monsters.checkBossAvailable(forestLevel);
          
          if (bossCheck.available) {
            enemy = monsters.createBossInstance(bossCheck.boss, bossCheck.level);
          } else {
            const monsterTemplate = monsters.getRandomMonster(forestLevel);
            enemy = monsters.createMonsterInstance(monsterTemplate, forestLevel);
          }
          
          // Сохраняем врага в базу
          db.run(`UPDATE players SET current_forest_enemy = ? WHERE user_id = ?`,
            [JSON.stringify(enemy), userId], (err) => {
              if (err) console.error('Ошибка сохранения врага:', err);
            });
          
          console.log(`🆕 Создан новый враг: ${enemy.name}`);
        }
        
        // Получаем статы игрока
        duels.calculatePlayerPower(userId, (err, playerStats) => {
          if (err) {
            console.error('Ошибка расчета силы игрока:', err);
            return bot.sendMessage(userId, '❌ Ошибка расчета силы');
          }
          
          // Создаем пошаговый бой
          const battle = battleSystem.createBattle(userId, playerStats, enemy);
          
          // Показываем начало боя
          showBattleScreen(userId, chatId, messageId);
        });
      });
      break;
      
    // Действия в бою
    case 'battle_attack':
    case 'battle_defend':
    case 'battle_special':
    case 'battle_use_potion':
      const action = data.replace('battle_', '').replace('use_potion', 'potion');
      const battleRef = battleSystem.getBattle(userId);
      
      logWithPlayer(`🎮 Действие в бою: ${action}`, userId);
      console.log(`📊 battleRef:`, battleRef ? `type=${battleRef.type}` : 'null');
      
      if (!battleRef) {
        return bot.sendMessage(userId, '❌ Бой не найден', getMainMenu(true));
      }
      
      // Если используется зелье
      if (action === 'potion') {
        potions.usePotion(userId, (err, potion) => {
          if (err) {
            return bot.answerCallbackQuery(query.id, { 
              text: `❌ ${err.message}`,
              show_alert: true
            });
          }
          
          // Восстанавливаем HP
          const battle = battleSystem.getBattle(userId);
          
          if (!battle) {
            return bot.answerCallbackQuery(query.id, { 
              text: `❌ Бой не найден`,
              show_alert: true
            });
          }
          
          // Для PvE боя
          if (battleRef.type === 'pve') {
            const healAmount = Math.floor(battle.playerMaxHP * (potion.heal_amount / 100));
            battle.playerHP = Math.min(battle.playerHP + healAmount, battle.playerMaxHP);
            
            bot.sendMessage(userId, 
              `🧪 Использовано: ${potion.name}\n` +
              `💚 Восстановлено ${healAmount} HP`
            );
            
            bot.answerCallbackQuery(query.id, { text: '✅ Зелье использовано!' });
            
            // Продолжаем бой (враг атакует)
            const turnResult = battleSystem.playerTurn(userId, 'defend'); // Используем защиту как базовое действие
            
            if (turnResult && turnResult.enemyAction) {
              bot.sendMessage(userId, `🔸 Раунд ${battle.round}\n\n${turnResult.enemyAction.text}`);
            }
            
            if (turnResult && turnResult.battleOver) {
              handleBattleEnd(userId, turnResult.victory);
            } else {
              setTimeout(() => {
                showBattleScreen(userId, chatId, messageId);
              }, 1500);
            }
          } else {
            // Для PvP боя
            const player = battle.player1.id === userId ? battle.player1 : battle.player2;
            const healAmount = Math.floor(player.maxHP * (potion.heal_amount / 100));
            player.hp = Math.min(player.hp + healAmount, player.maxHP);
            
            bot.sendMessage(userId, 
              `🧪 Использовано: ${potion.name}\n` +
              `💚 Восстановлено ${healAmount} HP`
            );
            
            bot.answerCallbackQuery(query.id, { text: '✅ Зелье использовано!' });
            
            // В PvP зелье считается как действие
            setTimeout(() => {
              showBattleScreen(userId, chatId, messageId);
            }, 1500);
          }
        });
        return;
      }
      
      // PvP бой
      if (battleRef.type === 'pvp') {
        console.log(`⚔️ Обрабатываем PvP бой`);
        const pvpResult = battleSystem.setPvPAction(userId, action);
        
        if (!pvpResult) {
          return bot.sendMessage(userId, '❌ Ошибка обработки действия');
        }
        
        if (pvpResult.alreadyProcessed) {
          // Раунд уже обработан другим игроком, игнорируем
          return;
        }
        
        if (pvpResult.waiting) {
          // Ждем действия противника
          bot.sendMessage(userId, '⏳ Ожидаем действия противника...');
          return;
        }
        
        // Оба игрока выбрали действия - показываем результат
        const battle = battleSystem.getPvPBattle(battleRef.battleId);
        const player1Id = battle.player1.id;
        const player2Id = battle.player2.id;
        
        let turnText = `🔸 Раунд ${battle.round - 1}\n\n`;
        if (pvpResult.player1Action) turnText += pvpResult.player1Action.text + '\n';
        if (pvpResult.player2Action) turnText += pvpResult.player2Action.text + '\n';
        
        // Отправляем обоим игрокам
        bot.sendMessage(player1Id, turnText);
        bot.sendMessage(player2Id, turnText);
        
        // Проверяем окончание боя
        if (pvpResult.battleOver) {
          handlePvPBattleEnd(player1Id, player2Id, pvpResult.winnerId);
        } else {
          // Показываем экраны боя для следующего хода
          setTimeout(() => {
            showBattleScreen(player1Id, player1Id, null);
            showBattleScreen(player2Id, player2Id, null);
          }, 2000);
        }
      } else {
        // PvE бой
        console.log(`🌲 Обрабатываем PvE бой`);
        const turnResult = battleSystem.playerTurn(userId, action);
        
        console.log(`📊 Результат хода:`, turnResult ? `battleOver=${turnResult.battleOver}, victory=${turnResult.victory}` : 'null');
        
        if (!turnResult) {
          return bot.sendMessage(userId, '❌ Бой не найден', getMainMenu(true));
        }
        
        // Показываем результат хода
        let turnText = `🔸 Раунд ${battleSystem.getBattle(userId)?.round || '?'}\n\n`;
        turnText += turnResult.playerAction.text + '\n';
        if (turnResult.enemyAction) {
          turnText += turnResult.enemyAction.text + '\n';
        }
        
        bot.sendMessage(userId, turnText);
        
        // Проверяем окончание боя
        if (turnResult.battleOver) {
          console.log(`🏁 Бой закончен! Вызываем handleBattleEnd`);
          handleBattleEnd(userId, turnResult.victory);
        } else {
          console.log(`➡️ Бой продолжается, показываем следующий экран`);
          // Показываем экран боя для следующего хода
          setTimeout(() => {
            showBattleScreen(userId, chatId, messageId);
          }, 1500);
        }
      }
      break;
      
    // Админ-панель
    case 'admin_give_vip':
    case 'admin_give_gold':
    case 'admin_give_crystals':
    case 'admin_reset_cooldowns':
    case 'admin_delete_player':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      const actionType = data.replace('admin_give_', '').replace('admin_reset_', '').replace('admin_delete_', '');
      adminState.set(userId, { 
        action: 'awaiting_user_id', 
        type: actionType === 'cooldowns' ? 'cooldowns' : actionType === 'player' ? 'delete' : actionType
      });
      
      bot.sendMessage(userId, 
        `👑 *${data === 'admin_give_vip' ? 'Выдача VIP' : 
              data === 'admin_give_gold' ? 'Выдача золота' :
              data === 'admin_give_crystals' ? 'Выдача кристаллов' :
              data === 'admin_reset_cooldowns' ? 'Сброс кулдаунов' :
              'Удаление игрока'}*\n\n` +
        `Введите ID игрока:`,
        { parse_mode: 'Markdown' }
      );
      break;
      
    case 'admin_give_race':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      adminState.set(userId, { action: 'awaiting_user_id_for_race' });
      
      safeEditMessageText(chatId, messageId,
        `🧬 *Выдача расы*\n\n` +
        `Введите ID игрока, которому хотите выдать расу:`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '❌ Отмена', callback_data: 'admin_back' }]
            ]
          }
        }
      );
      break;
      
    case 'admin_start_raid':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      safeEditMessageText(chatId, messageId,
        `🐉 *Запуск рейда*\n\n` +
        `Выберите уровень босса (1-10) или случайный:`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '1️⃣ Уровень 1', callback_data: 'admin_raid_level_1' },
                { text: '2️⃣ Уровень 2', callback_data: 'admin_raid_level_2' }
              ],
              [
                { text: '3️⃣ Уровень 3', callback_data: 'admin_raid_level_3' },
                { text: '4️⃣ Уровень 4', callback_data: 'admin_raid_level_4' }
              ],
              [
                { text: '5️⃣ Уровень 5', callback_data: 'admin_raid_level_5' },
                { text: '6️⃣ Уровень 6', callback_data: 'admin_raid_level_6' }
              ],
              [
                { text: '7️⃣ Уровень 7', callback_data: 'admin_raid_level_7' },
                { text: '8️⃣ Уровень 8', callback_data: 'admin_raid_level_8' }
              ],
              [
                { text: '9️⃣ Уровень 9', callback_data: 'admin_raid_level_9' },
                { text: '🔟 Уровень 10', callback_data: 'admin_raid_level_10' }
              ],
              [
                { text: '🎲 Случайный', callback_data: 'admin_raid_level_random' }
              ],
              [
                { text: '❌ Отмена', callback_data: 'admin_back' }
              ]
            ]
          }
        }
      );
      break;
      
    case 'admin_reset_crystals':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      safeEditMessageText(chatId, messageId,
        `🔄 *Обнуление кристаллов*\n\n` +
        `⚠️ Вы уверены, что хотите обнулить кристаллы у ВСЕХ игроков?\n\n` +
        `Это действие нельзя отменить!`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Да, обнулить', callback_data: 'admin_confirm_reset_crystals' }
              ],
              [
                { text: '❌ Отмена', callback_data: 'admin_back' }
              ]
            ]
          }
        }
      );
      break;
      
    case 'admin_confirm_reset_crystals':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      // Обнуляем кристаллы у всех игроков
      db.run(`UPDATE players SET crystals = 0`, (err) => {
        if (err) {
          console.error('Ошибка обнуления кристаллов:', err);
          bot.answerCallbackQuery(query.id, { text: '❌ Ошибка обнуления', show_alert: true });
          return;
        }
        
        // Получаем количество затронутых игроков
        db.get(`SELECT COUNT(*) as count FROM players`, (err, result) => {
          const playersCount = result ? result.count : 0;
          
          console.log(`✅ Кристаллы обнулены у ${playersCount} игроков`);
          
          sendLogMessage(
            `🔄 Обнуление кристаллов\n` +
            `👤 Админ: @${query.from.username}\n` +
            `👥 Затронуто игроков: ${playersCount}`,
            'WARNING'
          );
          
          bot.answerCallbackQuery(query.id, { 
            text: `✅ Кристаллы обнулены у ${playersCount} игроков`, 
            show_alert: true 
          });
          
          // Возвращаемся в админ-панель
          bot.emit('callback_query', { ...query, data: 'admin_back' });
        });
      });
      break;
      
    case 'admin_clear_raid_participants':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      safeEditMessageText(chatId, messageId,
        `🧹 *Очистка участников рейда*\n\n` +
        `⚠️ Вы уверены, что хотите очистить список участников всех рейдов?\n\n` +
        `Это действие:\n` +
        `• Удалит всех участников из текущих рейдов\n` +
        `• Сбросит весь прогресс участия\n` +
        `• Нельзя отменить!`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Да, очистить', callback_data: 'admin_confirm_clear_participants' }
              ],
              [
                { text: '❌ Отмена', callback_data: 'admin_back' }
              ]
            ]
          }
        }
      );
      break;
      
    case 'admin_confirm_clear_participants':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      // Очищаем всех участников рейдов
      raids.clearAllRaidParticipants((err) => {
        if (err) {
          console.error('Ошибка очистки участников рейда:', err);
          bot.answerCallbackQuery(query.id, { text: '❌ Ошибка очистки', show_alert: true });
          return;
        }
        
        console.log(`✅ Все участники рейдов очищены админом @${query.from.username}`);
        
        sendLogMessage(
          `🧹 Очистка участников рейда\n` +
          `👤 Админ: @${query.from.username}\n` +
          `📋 Все участники рейдов удалены`,
          'WARNING'
        );
        
        bot.answerCallbackQuery(query.id, { 
          text: '✅ Все участники рейдов очищены', 
          show_alert: true 
        });
        
        // Возвращаемся в админ-панель
        bot.emit('callback_query', { ...query, data: 'admin_back' });
      });
      break;
      
    // Создание босса
    case 'admin_create_boss':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      adminState.set(userId, { action: 'create_boss_name', bossData: {} });
      
      safeEditMessageText(chatId, messageId,
        `➕ *Создание босса рейда*\n\n` +
        `Шаг 1/7: Введите название босса\n\n` +
        `Пример: Повелитель огня`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '❌ Отмена', callback_data: 'admin_back' }]
            ]
          }
        }
      );
      break;
      
    // Редактор боссов
    case 'admin_edit_boss':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      // Получаем список боссов
      db.all(`SELECT * FROM raid_bosses ORDER BY level ASC`, (err, bosses) => {
        if (err || !bosses || bosses.length === 0) {
          return safeEditMessageText(chatId, messageId,
            `❌ Боссы не найдены\n\n` +
            `Создайте хотя бы одного босса через "➕ Создать босса"`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 Назад', callback_data: 'admin_back' }]
                ]
              }
            }
          );
        }
        
        let message = `✏️ *Редактор боссов*\n\n` +
                     `Выберите босса для редактирования:\n\n`;
        
        const buttons = [];
        
        bosses.forEach(boss => {
          const rewards = JSON.parse(boss.rewards);
          message += `🐉 *${boss.name}* (Ур.${boss.level})\n`;
          message += `   ❤️ HP: ${boss.base_hp} (+${boss.times_defeated * 5000})\n`;
          message += `   💰 ${rewards.total_gold} | 💎 ${rewards.total_crystals} | ✨ ${rewards.total_exp}\n`;
          message += `   🏆 Побед: ${boss.times_defeated}\n\n`;
          
          buttons.push([{
            text: `${boss.name} (Ур.${boss.level})`,
            callback_data: `admin_edit_boss_${boss.id}`
          }]);
        });
        
        buttons.push([{ text: '🔙 Назад', callback_data: 'admin_back' }]);
        
        safeEditMessageText(chatId, messageId, message, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        });
      });
      break;
      
    case 'admin_broadcast':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      adminState.set(userId, { action: 'awaiting_broadcast_message' });
      
      safeEditMessageText(chatId, messageId,
        `📢 *Глобальное сообщение*\n\n` +
        `Введите текст сообщения, которое будет отправлено ВСЕМ игрокам:\n\n` +
        `💡 Поддерживается Markdown форматирование`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '❌ Отмена', callback_data: 'admin_back' }]
            ]
          }
        }
      );
      break;
      
    case 'admin_private_message':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      adminState.set(userId, { action: 'awaiting_private_message_user_id' });
      
      safeEditMessageText(chatId, messageId,
        `💬 *Личное сообщение*\n\n` +
        `Введите ID игрока, которому хотите отправить сообщение:`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '❌ Отмена', callback_data: 'admin_back' }]
            ]
          }
        }
      );
      break;
      
    // Управление расами
    case 'admin_races':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      safeEditMessageText(chatId, messageId,
        `🧬 *Управление расами*\n\n` +
        `Выберите действие:`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '➕ Добавить расу', callback_data: 'admin_add_race' }
              ],
              [
                { text: '📝 Редактировать расу', callback_data: 'admin_edit_race' }
              ],
              [
                { text: '🗑️ Удалить расу', callback_data: 'admin_delete_race' }
              ],
              [
                { text: '📋 Список рас', callback_data: 'admin_list_races' }
              ],
              [
                { text: '🔙 Назад в админ-панель', callback_data: 'admin_back' }
              ]
            ]
          }
        }
      );
      break;
      
    // Управление предметами
    case 'admin_items':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      safeEditMessageText(chatId, messageId,
        `🎒 *Управление предметами*\n\n` +
        `Выберите действие:`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '➕ Добавить предмет', callback_data: 'admin_add_item' }
              ],
              [
                { text: '📝 Редактировать предмет', callback_data: 'admin_edit_item' }
              ],
              [
                { text: '📋 Список предметов', callback_data: 'admin_list_items' }
              ],
              [
                { text: '🔙 Назад в админ-панель', callback_data: 'admin_back' }
              ]
            ]
          }
        }
      );
      break;
      
    // Возврат в админ-панель
    case 'admin_back':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      // Очищаем состояние админа
      adminState.delete(userId);
      
      safeEditMessageText(chatId, messageId,
        `👑 *АДМИН-ПАНЕЛЬ*\n\n` +
        `Выберите действие:`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '💎 Выдать VIP', callback_data: 'admin_give_vip' }
              ],
              [
                { text: '💰 Выдать золото', callback_data: 'admin_give_gold' },
                { text: '💎 Выдать кристаллы', callback_data: 'admin_give_crystals' }
              ],
              [
                { text: '🧬 Выдать расу', callback_data: 'admin_give_race' }
              ],
              [
                { text: '🐉 Запустить рейд', callback_data: 'admin_start_raid' }
              ],
              [
                { text: '➕ Создать босса', callback_data: 'admin_create_boss' },
                { text: '✏️ Редактор боссов', callback_data: 'admin_edit_boss' }
              ],
              [
                { text: '⏰ Сбросить кулдауны', callback_data: 'admin_reset_cooldowns' },
                { text: '🔄 Обнулить кристаллы', callback_data: 'admin_reset_crystals' }
              ],
              [
                { text: '🧹 Очистить участников рейда', callback_data: 'admin_clear_raid_participants' }
              ],
              [
                { text: '🗑️ Удалить игрока', callback_data: 'admin_delete_player' }
              ],
              [
                { text: '📢 Глобальное сообщение', callback_data: 'admin_broadcast' },
                { text: '💬 Личное сообщение', callback_data: 'admin_private_message' }
              ],
              [
                { text: '🧬 Управление расами', callback_data: 'admin_races' },
                { text: '🎒 Управление предметами', callback_data: 'admin_items' }
              ],
              [
                { text: '📊 Статистика сервера', callback_data: 'admin_stats' }
              ]
            ]
          }
        }
      );
      break;
      
    // Добавление новой расы
    case 'admin_add_race':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      adminState.set(userId, { action: 'add_race_photo' });
      
      safeEditMessageText(chatId, messageId,
        `➕ *Добавление новой расы*\n\n` +
        `Шаг 1/7: Отправьте фото расы\n\n` +
        `💡 Фото должно быть в формате JPG и называться как раса (например: dragon.jpg)`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Отмена', callback_data: 'admin_races' }]
            ]
          }
        }
      );
      break;
      
    // Список рас
    case 'admin_list_races':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      db.all(`SELECT * FROM races ORDER BY rarity DESC, name ASC`, (err, races) => {
        if (err || races.length === 0) {
          return safeEditMessageText(chatId, messageId, '❌ Расы не найдены', {
            reply_markup: {
              inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'admin_races' }]]
            }
          });
        }
        
        let message = `📋 *Список рас (${races.length})*\n\n`;
        const buttons = [];
        
        races.forEach((race, index) => {
          const rarityIcon = config.RARITY[race.rarity]?.color || '⚪️';
          const rarityName = config.RARITY[race.rarity]?.name || 'Неизвестно';
          
          message += `${index + 1}. ${rarityIcon} *${race.name}*\n`;
          message += `   ${rarityName} | ⚡${race.base_power} | ❤️${race.base_hp}\n`;
          message += `   🗡️${race.base_attack} | 🛡️${race.base_defense}\n\n`;
          
          if (index < 10) { // Показываем кнопки только для первых 10 рас
            buttons.push([{ 
              text: `📝 ${race.name}`, 
              callback_data: `admin_edit_race_${race.id}` 
            }]);
          }
        });
        
        buttons.push([{ text: '🔙 Назад', callback_data: 'admin_races' }]);
        
        safeEditMessageText(chatId, messageId, message, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        });
      });
      break;
      
    // Редактирование расы
    case 'admin_edit_race':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      // Показываем список рас с пагинацией
      db.all(`SELECT * FROM races ORDER BY rarity DESC, name ASC`, (err, races) => {
        if (err || races.length === 0) {
          return safeEditMessageText(chatId, messageId, '❌ Расы не найдены', {
            reply_markup: {
              inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'admin_races' }]]
            }
          });
        }
        
        const page = 0;
        const perPage = 5;
        const totalPages = Math.ceil(races.length / perPage);
        const start = page * perPage;
        const end = start + perPage;
        const pageRaces = races.slice(start, end);
        
        let message = `📝 *Редактирование расы*\n\n`;
        message += `Выберите расу для редактирования:\n\n`;
        message += `Страница ${page + 1} из ${totalPages}\n\n`;
        
        const buttons = [];
        
        pageRaces.forEach((race) => {
          const rarityIcon = config.RARITY[race.rarity]?.color || '⚪️';
          buttons.push([{ 
            text: `${rarityIcon} ${race.name}`, 
            callback_data: `admin_edit_race_${race.id}` 
          }]);
        });
        
        // Навигация
        const navButtons = [];
        if (page > 0) {
          navButtons.push({ text: '◀️ Назад', callback_data: `admin_edit_race_page_${page - 1}` });
        }
        if (page < totalPages - 1) {
          navButtons.push({ text: 'Вперёд ▶️', callback_data: `admin_edit_race_page_${page + 1}` });
        }
        if (navButtons.length > 0) {
          buttons.push(navButtons);
        }
        
        buttons.push([{ text: '🔙 Назад', callback_data: 'admin_races' }]);
        
        safeEditMessageText(chatId, messageId, message, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        });
      });
      break;
      
    // Удаление расы
    case 'admin_delete_race':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      // Показываем список рас с пагинацией для удаления
      db.all(`SELECT * FROM races ORDER BY rarity DESC, name ASC`, (err, races) => {
        if (err || races.length === 0) {
          return safeEditMessageText(chatId, messageId, '❌ Расы не найдены', {
            reply_markup: {
              inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'admin_races' }]]
            }
          });
        }
        
        const page = 0;
        const perPage = 5;
        const totalPages = Math.ceil(races.length / perPage);
        const start = page * perPage;
        const end = start + perPage;
        const pageRaces = races.slice(start, end);
        
        let message = `🗑️ *Удаление расы*\n\n`;
        message += `Выберите расу для удаления:\n\n`;
        message += `Страница ${page + 1} из ${totalPages}\n\n`;
        
        const buttons = [];
        
        pageRaces.forEach((race) => {
          const rarityIcon = config.RARITY[race.rarity]?.color || '⚪️';
          buttons.push([{ 
            text: `${rarityIcon} ${race.name}`, 
            callback_data: `delete_race_${race.id}` 
          }]);
        });
        
        // Навигация
        const navButtons = [];
        if (page > 0) {
          navButtons.push({ text: '◀️ Назад', callback_data: `admin_delete_race_page_${page - 1}` });
        }
        if (page < totalPages - 1) {
          navButtons.push({ text: 'Вперёд ▶️', callback_data: `admin_delete_race_page_${page + 1}` });
        }
        if (navButtons.length > 0) {
          buttons.push(navButtons);
        }
        
        buttons.push([{ text: '🔙 Назад', callback_data: 'admin_races' }]);
        
        safeEditMessageText(chatId, messageId, message, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        });
      });
      break;
      
    // Добавление нового предмета
    case 'admin_add_item':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      adminState.set(userId, { action: 'add_item_name' });
      
      safeEditMessageText(chatId, messageId,
        `➕ *Добавление нового предмета*\n\n` +
        `Шаг 1/8: Введите название предмета`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Отмена', callback_data: 'admin_items' }]
            ]
          }
        }
      );
      break;
      
    // Список предметов
    case 'admin_list_items':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      db.all(`SELECT * FROM items ORDER BY slot, rarity DESC, name ASC LIMIT 20`, (err, items) => {
        if (err || items.length === 0) {
          return editImageWithText(chatId, messageId, 'inventory_menu.jpg', '❌ Предметы не найдены', {
            reply_markup: {
              inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'admin_items' }]]
            }
          });
        }
        
        let message = `📋 *Список предметов (показано ${items.length})*\n\n`;
        const buttons = [];
        
        items.forEach((item, index) => {
          const rarityIcon = config.RARITY[item.rarity]?.color || '⚪️';
          const slotIcons = {
            helmet: '🪖', chest: '🛡️', legs: '👖', boots: '👢',
            weapon: '⚔️', shield: '🛡️', artifact_1: '💎', artifact_2: '💎', accessory: '🎒'
          };
          const slotIcon = slotIcons[item.slot] || '❓';
          
          message += `${index + 1}. ${rarityIcon}${slotIcon} *${item.name}*\n`;
          message += `   ⚡${item.power_bonus} ❤️${item.hp_bonus} 🗡️${item.attack_bonus} 🛡️${item.defense_bonus}\n\n`;
          
          if (index < 8) { // Показываем кнопки только для первых 8 предметов
            buttons.push([{ 
              text: `📝 ${item.name}`, 
              callback_data: `admin_edit_item_${item.id}` 
            }]);
          }
        });
        
        buttons.push([{ text: '🔙 Назад', callback_data: 'admin_items' }]);
        
        editImageWithText(chatId, messageId, 'inventory_menu.jpg', message, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        });
      });
      break;
      
    // Редактирование предмета
    case 'admin_edit_item':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      adminState.set(userId, { action: 'select_item_to_edit' });
      
      safeEditMessageText(chatId, messageId,
        `📝 *Редактирование предмета*\n\n` +
        `Введите название предмета для редактирования:`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📋 Показать список', callback_data: 'admin_list_items' }],
              [{ text: '🔙 Отмена', callback_data: 'admin_items' }]
            ]
          }
        }
      );
      break;
      
    case 'cancel_delete':
      bot.answerCallbackQuery(query.id, { text: '❌ Удаление отменено' });
      bot.sendMessage(userId, '❌ Удаление отменено');
      break;
      
    case 'admin_stats':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      db.get(`SELECT COUNT(*) as total FROM players`, (err, total) => {
        db.get(`SELECT COUNT(*) as vip FROM players WHERE is_vip = 1`, (err2, vip) => {
          db.get(`SELECT SUM(gold) as totalGold, SUM(crystals) as totalCrystals FROM players`, (err3, resources) => {
            db.get(`SELECT COUNT(*) as battles FROM players WHERE wins + losses > 0`, (err4, battles) => {
              
              bot.sendMessage(userId,
                `📊 *Статистика сервера*\n\n` +
                `👥 Всего игроков: ${total.total}\n` +
                `💎 VIP игроков: ${vip.vip}\n` +
                `⚔️ Участвовали в боях: ${battles.battles}\n\n` +
                `💰 Всего золота: ${resources.totalGold || 0}\n` +
                `💎 Всего кристаллов: ${resources.totalCrystals || 0}`,
                { parse_mode: 'Markdown' }
              );
            });
          });
        });
      });
      break;
      
    case 'admin_raids':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      // Проверяем активный рейд
      raids.getActiveRaid((err, activeRaid) => {
        let raidStatus = '';
        if (activeRaid) {
          const timeLeft = Math.floor((new Date(activeRaid.ends_at) - new Date()) / 1000 / 60);
          raidStatus = `🐉 *Активный рейд:*\n` +
            `• ${activeRaid.boss_name} (Ур.${activeRaid.boss_level})\n` +
            `• HP: ${activeRaid.current_hp}/${activeRaid.boss_hp}\n` +
            `• Осталось: ${timeLeft} мин\n\n`;
        } else {
          raidStatus = `❌ *Активных рейдов нет*\n\n`;
        }
        
        bot.sendMessage(userId,
          `🐉 *Управление рейдами*\n\n` +
          raidStatus +
          `📝 *Доступные команды:*\n` +
          `/speedupraid имя\\_босса - ускорить кулдаун до 1 минуты\n\n` +
          `Выберите действие:`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🎯 Создать рейд', callback_data: 'admin_create_raid' }
                ],
                [
                  { text: '🧹 Очистить участников', callback_data: 'admin_clear_participants' }
                ],
                [
                  { text: '❌ Отменить рейд', callback_data: 'admin_cancel_raid' }
                ],
                [
                  { text: '🔙 Назад', callback_data: 'admin_back' }
                ]
              ]
            }
          }
        );
      });
      break;
      
    case 'admin_log_channel':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      const currentLogChannel = config.LOG_CHANNEL_ID ? `@${config.LOG_CHANNEL_ID}` : 'Не установлен';
      
      safeEditMessageText(chatId, messageId,
        `📝 *Управление каналом логов*\n\n` +
        `📍 Текущий канал: ${currentLogChannel}\n\n` +
        `💡 Для установки канала:\n` +
        `1. Добавьте бота в канал как админа\n` +
        `2. Отправьте любое сообщение в канал\n` +
        `3. Перешлите это сообщение боту\n\n` +
        `Выберите действие:`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🔗 Установить канал', callback_data: 'admin_set_log_channel' }
              ],
              [
                { text: '❌ Отключить логи', callback_data: 'admin_disable_logs' }
              ],
              [
                { text: '🧪 Тест логов', callback_data: 'admin_test_logs' }
              ],
              [
                { text: '🔙 Назад', callback_data: 'admin_back' }
              ]
            ]
          }
        }
      );
      break;
      
    case 'admin_set_log_channel':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      adminState.set(userId, { action: 'set_log_channel' });
      
      bot.sendMessage(userId,
        `📝 *Установка канала логов*\n\n` +
        `Перешлите мне любое сообщение из канала, где бот является администратором.\n\n` +
        `❗ Важно: бот должен быть добавлен в канал как администратор с правами отправки сообщений.`,
        { parse_mode: 'Markdown' }
      );
      break;
      
    case 'admin_disable_logs':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      config.LOG_CHANNEL_ID = null;
      
      bot.sendMessage(userId, '✅ Логирование в канал отключено');
      break;
      
    case 'admin_test_logs':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      if (!config.LOG_CHANNEL_ID) {
        return bot.sendMessage(userId, '❌ Канал логов не установлен');
      }
      
      sendLogMessage('🧪 Тестовое сообщение логов', 'TEST');
      bot.sendMessage(userId, '✅ Тестовое сообщение отправлено в канал логов');
      break;
      
    // Админские команды рейдов
    case 'admin_create_raid':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      raids.createRaid((err, newRaid) => {
        if (err) {
          console.error('Ошибка создания рейда:', err);
          return bot.answerCallbackQuery(query.id, { text: '❌ Ошибка создания рейда', show_alert: true });
        }
        
        bot.answerCallbackQuery(query.id, { text: '✅ Рейд создан!', show_alert: true });
        bot.sendMessage(userId, 
          `✅ *Рейд создан!*\n\n` +
          `🐉 ${newRaid.name}\n` +
          `⭐ Уровень: ${newRaid.level}\n` +
          `❤️ HP: ${newRaid.hp.toLocaleString()}\n` +
          `⏰ Длительность: 2 часа`,
          { parse_mode: 'Markdown' }
        );
      });
      break;
      
    case 'admin_clear_participants':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      db.run(`DELETE FROM raid_participants`, (err) => {
        if (err) {
          console.error('Ошибка очистки участников:', err);
          return bot.answerCallbackQuery(query.id, { text: '❌ Ошибка очистки', show_alert: true });
        }
        
        bot.answerCallbackQuery(query.id, { text: '✅ Участники очищены!', show_alert: true });
        console.log('🧹 Админ очистил всех участников рейдов');
      });
      break;
      
    case 'admin_cancel_raid':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      db.run(`UPDATE active_raids SET status = 'cancelled' WHERE status = 'active'`, (err) => {
        if (err) {
          console.error('Ошибка отмены рейда:', err);
          return bot.answerCallbackQuery(query.id, { text: '❌ Ошибка отмены', show_alert: true });
        }
        
        bot.answerCallbackQuery(query.id, { text: '✅ Рейд отменен!', show_alert: true });
        console.log('❌ Админ отменил активный рейд');
      });
      break;
      
    case 'admin_back':
      if (query.from.username !== config.ADMIN_USERNAME) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
      }
      
      // Возвращаемся в главное админское меню
      bot.emit('callback_query', { ...query, data: 'admin_panel' });
      break;
      
    // Кланы
    case 'rating_clans':
      db.all(`SELECT c.*, COUNT(p.user_id) as member_count 
              FROM clans c 
              LEFT JOIN players p ON p.clan_id = c.id 
              GROUP BY c.id 
              ORDER BY c.total_power DESC 
              LIMIT 10`, (err, clans) => {
        
        let clanText = '🏰 *Топ кланов*\n\n';
        
        if (!clans || clans.length === 0) {
          clanText += 'Пока нет кланов';
        } else {
          clans.forEach((clan, index) => {
            clanText += `${index + 1}. ${clan.name}\n`;
            clanText += `   👥 ${clan.member_count} | ⚡ ${clan.total_power}\n\n`;
          });
        }
        
        bot.sendMessage(userId, clanText, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Назад', callback_data: 'rating_menu' }]
            ]
          }
        });
      });
      break;
      
    case 'my_clan':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err) return bot.sendMessage(userId, '❌ Ошибка');
        
        if (!player.clan_id) {
          bot.sendMessage(userId,
            `🏰 *Кланы*\n\n` +
            `Вы не в клане\n\n` +
            `💎 Создание - только VIP\n` +
            `Напишите @trimetillllll`,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  player.is_vip ? [{ text: '➕ Создать клан', callback_data: 'create_clan' }] : [],
                  [{ text: '🔙 Назад', callback_data: 'rating_menu' }]
                ]
              }
            }
          );
        } else {
          db.get(`SELECT * FROM clans WHERE id = ?`, [player.clan_id], (err, clan) => {
            if (err || !clan) {
              return bot.sendMessage(userId, '❌ Клан не найден');
            }
            
            db.all(`SELECT username, level, power FROM players WHERE clan_id = ? ORDER BY power DESC`, 
              [clan.id], (err, members) => {
                
                let memberList = '';
                members.forEach((member, index) => {
                  const isLeader = member.username === clan.leader_id;
                  memberList += `${index + 1}. ${member.username} ${isLeader ? '👑' : ''} (Ур.${member.level})\n`;
                });
                
                bot.sendMessage(userId,
                  `🏰 *${clan.name}*\n\n` +
                  `👥 Участников: ${members.length}\n` +
                  `⚡ Общая сила: ${clan.total_power}\n\n` +
                  `Участники:\n${memberList}`,
                  {
                    parse_mode: 'Markdown',
                    reply_markup: {
                      inline_keyboard: [
                        player.user_id === clan.leader_id ? 
                          [{ text: '❌ Распустить клан', callback_data: 'disband_clan' }] :
                          [{ text: '🚪 Покинуть клан', callback_data: 'leave_clan' }],
                        [{ text: '🔙 Назад', callback_data: 'rating_menu' }]
                      ]
                    }
                  }
                );
              });
          });
        }
      });
      break;
      
    case 'create_clan':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err) return bot.sendMessage(userId, '❌ Ошибка');
        
        if (!player.is_vip) {
          return bot.sendMessage(userId, 
            '❌ Создание кланов доступно только VIP игрокам\n\n' +
            'Напишите @trimetillllll для получения VIP'
          );
        }
        
        if (player.clan_id) {
          return bot.sendMessage(userId, '❌ Вы уже в клане! Сначала покиньте его.');
        }
        
        bot.sendMessage(userId,
          '🏰 *Создание клана*\n\n' +
          'Отправьте название клана (до 20 символов):',
          { parse_mode: 'Markdown' }
        );
        
        // Сохраняем состояние ожидания названия клана
        adminState.set(userId, { action: 'awaiting_clan_name' });
      });
      break;
      
    case 'leave_clan':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err) return bot.sendMessage(userId, '❌ Ошибка');
        
        if (!player.clan_id) {
          return bot.sendMessage(userId, '❌ Вы не в клане');
        }
        
        db.get(`SELECT * FROM clans WHERE id = ?`, [player.clan_id], (err, clan) => {
          if (clan.leader_id === player.user_id) {
            return bot.sendMessage(userId, 
              '❌ Вы лидер клана! Сначала распустите клан или передайте лидерство.'
            );
          }
          
          db.run(`UPDATE players SET clan_id = NULL WHERE user_id = ?`, [userId], (err) => {
            if (err) return bot.sendMessage(userId, '❌ Ошибка');
            
            bot.sendMessage(userId, `✅ Вы покинули клан ${clan.name}`, getMainMenu(true));
          });
        });
      });
      break;
      
    case 'disband_clan':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err) return bot.sendMessage(userId, '❌ Ошибка');
        
        if (!player.clan_id) {
          return bot.sendMessage(userId, '❌ Вы не в клане');
        }
        
        db.get(`SELECT * FROM clans WHERE id = ?`, [player.clan_id], (err, clan) => {
          if (clan.leader_id !== player.user_id) {
            return bot.sendMessage(userId, '❌ Только лидер может распустить клан');
          }
          
          // Удаляем всех из клана
          db.run(`UPDATE players SET clan_id = NULL WHERE clan_id = ?`, [clan.id], (err) => {
            // Удаляем клан
            db.run(`DELETE FROM clans WHERE id = ?`, [clan.id], (err) => {
              if (err) return bot.sendMessage(userId, '❌ Ошибка');
              
              bot.sendMessage(userId, `✅ Клан ${clan.name} распущен`, getMainMenu(true));
            });
          });
        });
      });
      break;
      
    case 'loot':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err) {
          console.error('Ошибка получения игрока для loot:', err);
          return bot.sendMessage(userId, '❌ Ошибка');
        }
        
        if (!player.race_id) {
          return bot.sendMessage(userId, '❌ Сначала получите расу!', getMainMenu(false));
        }
        
        const cooldown = checkCooldown(player.last_loot_time, config.LOOT_COOLDOWN);
        
        if (!cooldown.ready) {
          return safeEditMessageText(chatId, messageId, 
            formatCooldownMessage('Поиск предметов', cooldown), {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Назад', callback_data: 'battle_menu' }]
              ]
            }
          });
        }
        
        items.getRandomItem((err, item) => {
          if (err) {
            console.error('Ошибка получения случайного предмета:', err);
            return bot.sendMessage(userId, '❌ Ошибка получения предмета');
          }
          
          items.addItemToInventory(userId, item.id, (err) => {
            if (err) {
              console.error('Ошибка добавления в инвентарь:', err);
              return bot.sendMessage(userId, '❌ Ошибка добавления в инвентарь');
            }
            
            const rarityConfig = config.RARITY[item.rarity];
            const rarityIcon = rarityConfig ? rarityConfig.color : '⚪️';
            const rarityName = rarityConfig ? rarityConfig.name : 'Обычный';
            const now = Math.floor(Date.now() / 1000);
            
            db.run(`UPDATE players SET last_loot_time = ?, exp = exp + 10, awakening_xp = awakening_xp + 20 WHERE user_id = ?`, 
              [now, userId], (err) => {
                if (err) {
                  console.error('Ошибка обновления игрока после loot:', err);
                }
                
                // Обновляем прогресс квеста
                dailyQuests.updateQuestProgress(userId, 'loot', 1, (err, completedQuests) => {
                  if (completedQuests && completedQuests.length > 0) {
                    completedQuests.forEach(quest => {
                      bot.sendMessage(userId,
                        `✅ Квест выполнен!\n\n` +
                        `📋 ${quest.quest_name}\n` +
                        `🎁 +${quest.reward_gold}💰 +${quest.reward_exp}✨`
                      );
                    });
                  }
                });
                
                bot.sendMessage(userId,
                  `🎁 Предмет найден!\n\n` +
                  `${rarityIcon} ${item.name}\n` +
                  `${rarityName}\n\n` +
                  `⚡ +${item.power_bonus} | ❤️ +${item.hp_bonus}\n` +
                  `🗡️ +${item.attack_bonus} | 🛡️ +${item.defense_bonus}\n\n` +
                  `✨ +10 XP | 🔮 +20 XP пробуждения`,
                  getMainMenu(true)
                );
                
                checkLevelUp(userId);
              });
          });
        });
      });
      break;
      
    case 'inventory':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (!player.race_id) {
          return editImageWithText(chatId, messageId, 'main_menu.jpg', '❌ Сначала получите расу!', {
            ...getMainMenu(false)
          });
        }
        
        // Показываем экипированные предметы по слотам
        db.all(`SELECT inv.*, i.name, i.slot, i.rarity, i.power_bonus, i.hp_bonus, i.attack_bonus, i.defense_bonus FROM inventory inv
                JOIN items i ON inv.item_id = i.id
                WHERE inv.player_id = ? AND inv.equipped = 1`, [userId], (err, equipped) => {
          
          // Проверяем на ошибку
          if (err) {
            console.error('Ошибка загрузки инвентаря:', err);
            return bot.sendMessage(userId, '❌ Ошибка загрузки инвентаря', getMainMenu(true));
          }
          
          // Если equipped undefined или null, делаем пустой массив
          if (!equipped) equipped = [];
          
          const slots = {
            helmet: '🪖 Шлем',
            chest: '🛡️ Нагрудник', 
            legs: '👖 Поножи',
            boots: '👢 Сапоги',
            weapon: '⚔️ Оружие',
            shield: '🛡️ Щит',
            artifact_1: '💎 Артефакт 1',
            artifact_2: '💎 Артефакт 2',
            accessory: '🎒 Аксессуар'
          };
          
          let message = '🎒 Экипировка\n\n';
          
          Object.entries(slots).forEach(([slot, name]) => {
            const item = equipped.find(e => e.slot === slot);
            if (item) {
              // Проверяем что rarity существует в config.RARITY
              const rarityConfig = config.RARITY[item.rarity];
              const rarityIcon = rarityConfig ? rarityConfig.color : '⚪️';
              const itemStats = formatItemStats(item);
              message += `${name}: ${rarityIcon} ${item.name}${itemStats}\n`;
            } else {
              message += `${name}: пусто\n`;
            }
          });
          
          // Добавляем слот зелья
          message += `\n🧪 Зелье: `;
          if (player.equipped_potion_id) {
            potions.getPotionById(player.equipped_potion_id, (err, potion) => {
              if (!err && potion) {
                potions.getPotionQuantity(userId, potion.id, (err, quantity) => {
                  message += `${potion.name} (${quantity} шт)\n`;
                  
                  const buttons = [
                    [{ text: '📦 Все предметы', callback_data: 'all_items' }],
                    [{ text: '🧪 Зелья', callback_data: 'potions_inventory' }],
                    [{ text: '🔙 Назад', callback_data: 'main_menu' }]
                  ];
                  
                  editImageWithText(chatId, messageId, 'inventory.jpg', message, {
                    reply_markup: { inline_keyboard: buttons }
                  });
                });
              } else {
                message += `пусто\n`;
                
                const buttons = [
                  [{ text: '📦 Все предметы', callback_data: 'all_items' }],
                  [{ text: '🧪 Зелья', callback_data: 'potions_inventory' }],
                  [{ text: '🔙 Назад', callback_data: 'main_menu' }]
                ];
                
                editImageWithText(chatId, messageId, 'inventory.jpg', message, {
                  reply_markup: { inline_keyboard: buttons }
                });
              }
            });
          } else {
            message += `пусто\n`;
            
            const buttons = [
              [{ text: '📦 Все предметы', callback_data: 'all_items' }],
              [{ text: '🧪 Зелья', callback_data: 'potions_inventory' }],
              [{ text: '🔙 Назад', callback_data: 'main_menu' }]
            ];
            
            editImageWithText(chatId, messageId, 'inventory.jpg', message, {
              reply_markup: { inline_keyboard: buttons }
            });
          }
        });
      });
      break;
      
    case 'potions_inventory':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err) return bot.sendMessage(userId, '❌ Ошибка');
        
        potions.getPlayerPotions(userId, (err, playerPotions) => {
          if (err || !playerPotions || playerPotions.length === 0) {
            return safeEditMessageText(chatId, messageId,
              `🧪 *Инвентарь зелий*\n\n` +
              `У вас нет зелий\n\n` +
              `💡 Купите зелья в магазине!`,
              {
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '🛒 Магазин', callback_data: 'shop_potions' }],
                    [{ text: '🔙 К экипировке', callback_data: 'inventory' }]
                  ]
                }
              }
            );
          }
          
          let message = `🧪 *Инвентарь зелий*\n\n`;
          const buttons = [];
          
          playerPotions.forEach(potion => {
            const equipped = player.equipped_potion_id === potion.potion_id ? '✅' : '';
            message += `${equipped}${potion.name} x${potion.quantity}\n`;
            message += `📝 ${potion.description}\n\n`;
            
            buttons.push([{
              text: `${equipped}${potion.name} (${potion.quantity} шт)`,
              callback_data: `view_potion_${potion.potion_id}`
            }]);
          });
          
          buttons.push([{ text: '🛒 Купить зелья', callback_data: 'shop_potions' }]);
          buttons.push([{ text: '🔙 К экипировке', callback_data: 'inventory' }]);
          
          safeEditMessageText(chatId, messageId, message, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: buttons }
          });
        });
      });
      break;
      
    case 'all_items':
      db.all(`SELECT inv.id as inv_id, inv.equipped, i.* FROM inventory inv
              JOIN items i ON inv.item_id = i.id
              WHERE inv.player_id = ?
              ORDER BY i.slot, i.rarity DESC`, [userId], (err, items) => {
        if (err || items.length === 0) {
          return safeEditMessageText(chatId, messageId, '📦 Инвентарь пуст', {
            ...getMainMenu(true)
          });
        }
        
        let message = '📦 *Все предметы*\n\n';
        const buttons = [];
        
        // Группируем по слотам
        const itemsBySlot = {};
        items.forEach(item => {
          if (!itemsBySlot[item.slot]) itemsBySlot[item.slot] = [];
          itemsBySlot[item.slot].push(item);
        });
        
        Object.entries(itemsBySlot).forEach(([slot, slotItems]) => {
          const slotNames = {
            helmet: '🪖 Шлемы',
            chest: '🛡️ Нагрудники',
            legs: '👖 Поножи', 
            boots: '👢 Сапоги',
            weapon: '⚔️ Оружие',
            shield: '🛡️ Щиты',
            artifact_1: '💎 Артефакты',
            artifact_2: '💎 Артефакты',
            accessory: '🎒 Аксессуары'
          };
          
          message += `*${slotNames[slot] || slot}:*\n`;
          
          slotItems.slice(0, 3).forEach(item => {
            const rarityIcon = config.RARITY[item.rarity].color;
            const equipped = item.equipped ? '✅' : '';
            const itemStats = formatItemStats(item);
            message += `${equipped}${rarityIcon} ${item.name}${itemStats}\n`;
            
            buttons.push([{
              text: `${equipped}${item.name}`,
              callback_data: `equip_${item.inv_id}`
            }]);
          });
          
          message += '\n';
        });
        
        buttons.push([{ text: '🔙 К экипировке', callback_data: 'inventory' }]);
        
        safeEditMessageText(chatId, messageId, message, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        });
      });
      break;
      
    case 'duel':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err) return bot.sendMessage(userId, '❌ Ошибка');
        
        if (!player.race_id) {
          return bot.sendMessage(userId, '❌ Сначала получите расу!', getMainMenu(false));
        }
        
        // Получаем количество игроков в поиске
        db.get(`SELECT COUNT(*) as searching_count FROM players WHERE is_searching_duel = 1`, (err, result) => {
          const searchingCount = result ? result.searching_count : 0;
          
          // Показываем меню дуэлей с MMR и количеством ищущих
          mmrSystem.getPlayerMMR(userId, (err, mmrData) => {
            const playerMMR = mmrData ? mmrData.mmr : 0;
            const wins = mmrData ? mmrData.wins : 0;
            const losses = mmrData ? mmrData.losses : 0;
            const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
            
            editImageWithText(chatId, messageId, 'battle_menu.jpg',
              `⚔️ *Арена дуэлей*\n\n` +
              `🏆 MMR: ${playerMMR}\n` +
              `📊 Побед: ${wins} | Поражений: ${losses}\n` +
              `📈 Винрейт: ${winRate}%\n\n` +
              `🔍 В поиске: ${searchingCount} игроков\n\n` +
              `💡 MMR - рейтинг мастерства\n` +
              `🎯 Ищем противников вашего уровня`, {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔍 Найти дуэль', callback_data: 'start_matchmaking' }],
                  [{ text: '🏆 Топ игроков', callback_data: 'mmr_leaderboard' }],
                  [{ text: '🔙 Назад', callback_data: 'battle_menu' }]
                ]
              }
            });
          });
        });
      });
      break;
      
    case 'start_matchmaking':
      logWithPlayer(`🎯 Нажал "Найти дуэль"`, userId);
      
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err) {
          console.error('Ошибка получения игрока:', err);
          return bot.sendMessage(userId, '❌ Ошибка');
        }
        
        console.log(`👤 Игрок получен: race_id=${player.race_id}, last_duel_time=${player.last_duel_time}`);
        
        if (!player.race_id) {
          return bot.sendMessage(userId, '❌ Сначала получите расу!');
        }
        
        const cooldown = checkCooldown(player.last_duel_time, config.DUEL_COOLDOWN);
        
        if (!cooldown.ready) {
          return safeEditMessageText(chatId, messageId, 
            formatCooldownMessage('Дуэли', cooldown), {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Назад', callback_data: 'duel' }]
              ]
            }
          });
        }
        
        console.log(`✅ Проверки пройдены, отправляем сообщение о поиске`);
        
        // Удаляем старое сообщение и отправляем новое
        bot.deleteMessage(chatId, messageId).catch(() => {});
        
        bot.sendMessage(chatId,
          `🔍 Поиск противника...\n\n` +
          `🎯 Ищем игрока вашего уровня\n` +
          `💡 Сначала ищем в радиусе ±500 MMR\n` +
          `🌐 Затем расширяем поиск\n\n` +
          `⏳ Поиск будет продолжаться пока вы не отмените`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '❌ Отменить поиск', callback_data: 'cancel_matchmaking' }]
            ]
          }
        }).then(() => {
          logWithPlayer(`🔍 Запускаем startMatchmaking`, userId);
          
          // Начинаем поиск дуэли
          mmrSystem.startMatchmaking(userId, (err, result) => {
            if (err) {
              console.error('Ошибка startMatchmaking:', err);
              return bot.sendMessage(userId, `❌ ${err.message}`);
            }
            
            console.log(`📊 Результат startMatchmaking:`, result);
            
            if (result.type === 'duel_found') {
            // МАТЧ НАЙДЕН СРАЗУ!
            const opponent = result.isPlayer1 ? result.duel.player2 : result.duel.player1;
            const opponentId = result.isPlayer1 ? result.duel.player2Id : result.duel.player1Id;
            
            bot.sendMessage(userId, 
              `⚔️ Противник найден!\n\n` +
              `🎯 Противник: ${opponent.username || 'Игрок'}\n` +
              `🏆 MMR: ${opponent.mmr || 0}\n` +
              `📊 ${opponent.wins || 0}W / ${opponent.losses || 0}L\n\n` +
              `⚡ Начинаем бой!`
            );
            
            // Создаем пошаговый PvP бой
            startPvPBattle(userId, opponentId);
          } else if (result.type === 'searching') {
            // ДОБАВЛЕН В ОЧЕРЕДЬ - начинаем бесконечный поллинг
            logWithPlayer(`🔍 В очереди, начинаем бесконечный поллинг`, userId);
            
            const pollInterval = setInterval(() => {
              // Проверяем есть ли активный матч
              mmrSystem.checkActiveMatch(userId, (err, match) => {
                if (err) {
                  clearInterval(pollInterval);
                  return;
                }
                
                if (match) {
                  // МАТЧ НАЙДЕН!
                  clearInterval(pollInterval);
                  logWithPlayer(`✅ Найден в матче через поллинг с ${match.opponentId}`, userId);
                  
                  bot.sendMessage(userId, 
                    `⚔️ Противник найден!\n\n` +
                    `🎯 Противник: ${match.opponent.username || 'Игрок'}\n` +
                    `🏆 MMR: ${match.opponent.mmr || 0}\n` +
                    `📊 ${match.opponent.wins || 0}W / ${match.opponent.losses || 0}L\n\n` +
                    `⚡ Начинаем бой!`
                  );
                  
                  // Создаем пошаговый PvP бой
                  setTimeout(() => {
                    startPvPBattle(userId, match.opponentId);
                  }, 1000);
                  
                  return;
                }
                
                // Проверяем, не отменил ли игрок поиск
                db.get(`SELECT is_searching_duel FROM players WHERE user_id = ?`, [userId], (err, player) => {
                  if (err || !player || player.is_searching_duel === 0) {
                    // Игрок отменил поиск
                    clearInterval(pollInterval);
                    logWithPlayer(`❌ Отменил поиск`, userId);
                  }
                });
              });
            }, 1000);
          }
        });
        }).catch(err => {
          console.error('Ошибка отправки сообщения о поиске:', err);
        });
      });
      break;
      
    case 'cancel_matchmaking':
      bot.answerCallbackQuery(query.id);
      
      db.run(`UPDATE players SET is_searching_duel = 0, search_started_at = 0 WHERE user_id = ?`, [userId], () => {
        mmrSystem.clearActiveMatch(userId);
        bot.sendMessage(userId, '❌ Поиск отменен', getMainMenu(true));
      });
      break;
      
    case 'mmr_leaderboard':
      mmrSystem.getMMRLeaderboard(10, (err, leaderboard) => {
        if (err || !leaderboard.length) {
          return bot.sendMessage(userId, '❌ Ошибка загрузки рейтинга');
        }
        
        let leaderboardText = '🏆 *Топ игроков по MMR*\n\n';
        
        leaderboard.forEach((player, index) => {
          const position = index + 1;
          const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
          const winRate = player.wins + player.losses > 0 ? Math.round((player.wins / (player.wins + player.losses)) * 100) : 0;
          
          leaderboardText += `${medal} ${player.username || 'Игрок'}\n`;
          leaderboardText += `   🏆 ${player.mmr} MMR | 📊 ${winRate}% WR\n\n`;
        });
        
        editImageWithText(chatId, messageId, 'rating_menu.jpg', leaderboardText, {
          inline_keyboard: [
            [{ text: '🔙 К дуэлям', callback_data: 'duel' }],
            [{ text: '🏠 Главное меню', callback_data: 'main_menu' }]
          ]
        });
      });
      break;
      
    case 'top':
      duels.getTopPlayers(10, (err, players) => {
        if (err || players.length === 0) {
          return safeEditMessageText(chatId, messageId, '❌ Топ пуст', {
            ...getMainMenu(true)
          });
        }
        
        let message = '🏆 *Топ игроков*\n\n';
        
        players.forEach((player, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
          const rarityIcon = player.race_rarity ? config.RARITY[player.race_rarity].color : '⚪️';
          const vipIcon = player.is_vip ? '💎 ' : '';
          const displayName = player.display_name || player.username;
          const raceName = player.race_name || 'Без расы';
          
          message += `${medal} ${vipIcon}${displayName} ${rarityIcon}${raceName}\n`;
          message += `   🌲 Лес: ${player.forest_level || 1} | ⚡ ${player.power} | 💰 ${player.gold}\n\n`;
        });
        
        safeEditMessageText(chatId, messageId, message, {
          parse_mode: 'Markdown',
          ...getRatingMenu()
        });
      });
      break;
      
    case 'quests':
      logWithPlayer(`🔍 Открыл меню квестов`, userId);
      
      // Получаем информацию об игроке
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err) {
          console.error('Ошибка получения игрока:', err);
          return editImageWithText(chatId, messageId, 'quests_menu.jpg', '❌ Ошибка загрузки данных', {
            ...getRewardsMenu()
          });
        }
        
        const isVip = player.vip === 1;
        const questCount = isVip ? 5 : 3;
        
        // Автоматически выдаем ежедневные квесты если их нет
        dailyQuests.assignDailyQuests(userId, (err, result) => {
          if (err) {
            console.error('Ошибка выдачи квестов:', err);
          } else if (result) {
            console.log(`📋 Результат выдачи квестов:`, result);
          }
          
          // Получаем ежедневные квесты игрока
          dailyQuests.getPlayerDailyQuests(userId, (err, playerQuests) => {
            if (err) {
              console.error('Ошибка получения квестов игрока:', err);
              return editImageWithText(chatId, messageId, 'quests_menu.jpg', '❌ Ошибка загрузки квестов', {
                ...getRewardsMenu()
              });
            }
            
            logWithPlayer(`📋 Найдено квестов: ${playerQuests ? playerQuests.length : 0}`, userId);
            
            if (!playerQuests || playerQuests.length === 0) {
              return editImageWithText(chatId, messageId, 'quests_menu.jpg',
                '📋 *Ежедневные квесты*\n\n' +
                `${isVip ? '👑 VIP: 5 квестов в день\n\n' : ''}` +
                '✅ Все квесты выполнены!\n\n' +
                '🕐 Новые квесты появятся завтра в 00:00 МСК\n\n' +
                `💡 ${isVip ? 'VIP игроки получают 5 квестов' : 'VIP игроки получают 5 квестов вместо 3'}`,
                {
                  parse_mode: 'Markdown',
                  ...getRewardsMenu()
                }
              );
            }
            
            let message = '📋 *Ежедневные квесты*\n\n';
            
            if (isVip) {
              message += '👑 VIP: 5 квестов в день\n\n';
            }
            
            if (result && result.newlyAssigned) {
              message += `✨ Получено ${result.questCount || questCount} новых квестов!\n\n`;
            }
            
            playerQuests.forEach((quest, index) => {
              const progress = `${quest.progress}/${quest.requirement}`;
              const progressBar = getProgressBar(quest.progress, quest.requirement);
              const completed = quest.progress >= quest.requirement ? '✅ ' : '';
              
              message += `${completed}${index + 1}. ${quest.quest_name}\n`;
              message += `📝 ${quest.quest_description}\n`;
              message += `${progressBar} ${progress}\n`;
              message += `🎁 ${quest.reward_gold}💰 ${quest.reward_exp}✨\n\n`;
            });
            
            message += '🕐 Обновление: каждый день в 00:00 МСК';
            
            editImageWithText(chatId, messageId, 'quests_menu.jpg', message, {
              parse_mode: 'Markdown',
              ...getRewardsMenu()
            });
          });
        });
      });
      break;
      
    case 'achievements':
      achievements.getPlayerAchievements(userId, (err, playerAchs) => {
        if (err || playerAchs.length === 0) {
          return safeEditMessageText(chatId, messageId, '🏅 Нет достижений', {
            ...getRatingMenu()
          });
        }
        
        let message = '🏅 *Достижения*\n\n';
        
        playerAchs.forEach(ach => {
          message += `${ach.icon} ${ach.name}\n`;
        });
        
        safeEditMessageText(chatId, messageId, message, {
          parse_mode: 'Markdown',
          ...getRatingMenu()
        });
      });
      break;
      
    case 'clan':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (!player.clan_id) {
          // Удаляем старое сообщение и отправляем новое
          bot.deleteMessage(chatId, messageId).catch(() => {});
          bot.sendMessage(chatId,
            '🏰 Кланы\n\n' +
            'Вы не в клане\n\n' +
            '💎 Создание - только VIP\n' +
            `Напишите @${config.ADMIN_USERNAME}`,
            getClanMenu(false, false)
          );
        } else {
          clans.getClanInfo(player.clan_id, (err, clan) => {
            if (err) return bot.sendMessage(userId, '❌ Ошибка');
            
            const isLeader = clan.leader_id === userId;
            
            let message = `🏰 ${clan.name}\n\n`;
            
            if (clan.description) {
              message += `📝 ${clan.description}\n\n`;
            }
            
            message += `📊 Уровень: ${clan.level}\n`;
            message += `👥 ${clan.member_count}/${config.CLAN_MAX_MEMBERS}\n`;
            message += `⚡ ${clan.total_power || 0}\n`;
            message += `${isLeader ? '👑 Вы лидер' : ''}`;
            
            // Удаляем старое сообщение и отправляем новое
            bot.deleteMessage(chatId, messageId).catch(() => {});
            bot.sendMessage(chatId, message, getClanMenu(true, isLeader));
          });
        }
      });
      break;
      
    case 'clan_members':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err || !player.clan_id) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Вы не в клане' });
        }
        
        // Получаем всех членов клана
        db.all(`SELECT p.user_id, p.username, p.level, p.power, c.leader_id
                FROM players p
                JOIN clans c ON p.clan_id = c.id
                WHERE p.clan_id = ?
                ORDER BY p.power DESC`,
          [player.clan_id], (err, members) => {
            if (err || !members || members.length === 0) {
              return safeEditMessageText(chatId, messageId, '👥 Нет участников', {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '🔙 Назад', callback_data: 'clan' }]
                  ]
                }
              });
            }
            
            const leaderId = members[0].leader_id;
            let message = `👥 Члены клана (${members.length})\n\n`;
            
            members.forEach((member, index) => {
              const crown = member.user_id === leaderId ? '👑 ' : '';
              const position = index + 1;
              message += `${position}. ${crown}${member.username}\n`;
              message += `   Ур. ${member.level} | ⚡ ${member.power}\n\n`;
            });
            
            safeEditMessageText(chatId, messageId, message, {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 Назад', callback_data: 'clan' }]
                ]
              }
            });
          });
      });
      break;
      
    case 'clantop':
      // Показываем первый клан из топа
      clanManagement.getAvailableClans(50, (err, clans) => {
        if (err || !clans || clans.length === 0) {
          return safeEditMessageText(chatId, messageId, '🏰 Нет кланов', {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Назад', callback_data: 'rating_menu' }]
              ]
            }
          });
        }
        
        // Показываем первый клан (индекс 0)
        showClanCard(chatId, messageId, clans, 0, userId);
      });
      break;
      
    case 'race_browser':
      // Показываем первую расу из списка
      db.all(`SELECT * FROM races ORDER BY rarity DESC, name ASC`, (err, races) => {
        if (err || !races || races.length === 0) {
          return safeEditMessageText(chatId, messageId, '🧬 Нет рас', {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Назад', callback_data: 'rating_menu' }]
              ]
            }
          });
        }
        
        // Показываем первую расу (индекс 0)
        showRaceCard(chatId, messageId, races, 0, userId);
      });
      break;
      
    case 'upgrade_menu':
      editImageWithText(chatId, messageId, 'upgrade_menu.jpg',
        '🔮 *Развитие*\n\n' +
        'Выберите действие:',
        {
          parse_mode: 'Markdown',
          ...getUpgradeMenu()
        }
      );
      break;
      
    case 'characteristics':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err) return bot.sendMessage(userId, '❌ Ошибка');
        
        characteristics.getPlayerCharacteristics(userId, (err, chars) => {
          if (err) {
            console.error('Ошибка получения характеристик:', err);
            return safeEditMessageText(chatId, messageId, '❌ Ошибка загрузки характеристик', {
              reply_markup: {
                inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'upgrade_menu' }]]
              }
            });
          }
          
          let message = `📊 *ХАРАКТЕРИСТИКИ*\n\n💰 Золото: ${player.gold.toLocaleString()}\n\n`;
          
          const buttons = [];
          
          // Отображаем каждую характеристику
          Object.keys(chars).forEach(type => {
            const char = chars[type];
            message += `${char.icon} *${char.name}*\n`;
            message += `📈 Уровень: ${char.level}\n`;
            message += `💪 Общий бонус: +${char.current_bonus}\n`;
            
            if (char.level >= 0) {
              message += `⬆️ Следующее улучшение: +${char.next_upgrade_bonus}\n`;
            }
            
            message += `💰 Стоимость: ${char.next_cost.toLocaleString()} золота\n\n`;
            
            // Кнопка улучшения
            const canAfford = player.gold >= char.next_cost;
            const buttonText = canAfford 
              ? `${char.icon} Улучшить ${char.name} (${char.next_cost.toLocaleString()}💰)`
              : `${char.icon} ${char.name} (${char.next_cost.toLocaleString()}💰) ❌`;
            
            buttons.push([{ 
              text: buttonText, 
              callback_data: canAfford ? `upgrade_char_${type}` : 'insufficient_gold' 
            }]);
          });
          
          buttons.push([{ text: '🔙 Назад', callback_data: 'upgrade_menu' }]);
          
          safeEditMessageText(chatId, messageId, message, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: buttons }
          });
        });
      });
      break;
      
    case 'upgrade_race':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err) {
          console.error('Ошибка получения игрока:', err);
          return bot.sendMessage(userId, '❌ Ошибка получения данных игрока');
        }
        
        if (!player.race_id) {
          return safeEditMessageText(chatId, messageId, 
            '❌ Сначала получите расу!', 
            getUpgradeMenu()
          );
        }
        
        const cost = 100 * (player.level + 1);
        
        logWithPlayer(`[UPGRADE_RACE] Пытается прокачать расу. Уровень: ${player.level}, Стоимость: ${cost}, Золото: ${player.gold}`, userId);
        
        // Показываем подтверждение с правильной ценой
        safeEditMessageText(chatId, messageId,
          `⬆️ *Прокачка расы*\n\n` +
          `💰 Стоимость: ${cost} золота\n` +
          `⚡ Бонус: +20 к силе\n\n` +
          `💵 Ваше золото: ${player.gold}\n\n` +
          `Прокачать расу?`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: `✅ Прокачать за ${cost}💰`, callback_data: 'confirm_upgrade_race' }],
                [{ text: '❌ Отмена', callback_data: 'upgrade_menu' }]
              ]
            }
          }
        );
      });
      break;
      
    case 'confirm_upgrade_race':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err) {
          console.error('Ошибка получения игрока:', err);
          return bot.sendMessage(userId, '❌ Ошибка получения данных игрока');
        }
        
        if (!player.race_id) {
          return safeEditMessageText(chatId, messageId, 
            '❌ Сначала получите расу!', 
            getUpgradeMenu()
          );
        }
        
        const cost = 100 * (player.level + 1);
        
        logWithPlayer(`[CONFIRM_UPGRADE_RACE] Подтверждает прокачку. Золото: ${player.gold}, Стоимость: ${cost}`, userId);
        
        if (player.gold < cost) {
          return safeEditMessageText(chatId, messageId, 
            `❌ Недостаточно золота!\n\n` +
            `💰 Нужно: ${cost} золота\n` +
            `💵 У вас: ${player.gold} золота`,
            getUpgradeMenu()
          );
        }
        
        db.run(`UPDATE players SET gold = gold - ?, level = level + 1 WHERE user_id = ?`,
          [cost, userId], (updateErr) => {
            if (updateErr) {
              console.error('Ошибка обновления игрока:', updateErr);
              return bot.sendMessage(userId, '❌ Ошибка при прокачке расы');
            }
            
            const newLevel = player.level + 1;
            
            logWithPlayer(`[CONFIRM_UPGRADE_RACE] Раса успешно прокачана. Уровень: ${player.level} → ${newLevel}`, userId);
            
            // Пересчитываем силу после прокачки
            duels.calculatePlayerPower(userId, (err, newStats) => {
              if (err) {
                console.error('Ошибка расчета силы:', err);
                return bot.sendMessage(userId, '❌ Ошибка расчета характеристик');
              }
              
              safeEditMessageText(chatId, messageId,
                `✅ *Раса прокачана!*\n\n` +
                `⭐ Уровень: ${player.level} → ${newLevel}\n` +
                `⚡ Новая сила: ${newStats.power}\n` +
                `❤️ HP: ${newStats.hp}\n` +
                `🗡️ Атака: ${newStats.attack}\n` +
                `🛡️ Защита: ${newStats.defense}\n\n` +
                `💰 Потрачено: ${cost} золота`,
                {
                  parse_mode: 'Markdown',
                  ...getUpgradeMenu()
                }
              );
              
              // Логируем прокачку расы
              sendLogMessage(
                `⬆️ Раса прокачана\n` +
                `👤 Игрок: ${userId} (@${query.from.username})\n` +
                `⭐ Уровень: ${player.level} → ${newLevel}\n` +
                `⚡ Новая сила: ${newStats.power}\n` +
                `💰 Потрачено: ${cost} золота`,
                'SUCCESS'
              );
            });
            
            // Обновляем прогресс квестов на прокачку
            dailyQuests.updateQuestProgress(userId, 'upgrade', 1, (err, completedQuests) => {
              if (completedQuests && completedQuests.length > 0) {
                completedQuests.forEach(quest => {
                  bot.sendMessage(userId, 
                    `✅ Квест выполнен!\n\n` +
                    `📋 ${quest.quest_name}\n` +
                    `🎁 +${quest.reward_gold}💰 +${quest.reward_exp}✨`
                  );
                  
                  // Логируем выполнение квеста
                  sendLogMessage(
                    `📋 Квест выполнен\n` +
                    `👤 Игрок: ${userId} (@${query.from.username})\n` +
                    `📝 Квест: ${quest.quest_name}\n` +
                    `🎁 Награда: ${quest.reward_gold}💰 ${quest.reward_exp}✨`,
                    'QUEST'
                  );
                });
              }
            });
          });
      });
      break;
      
    case 'awaken':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (!player.race_id) {
          return bot.sendMessage(userId, '❌ Сначала получите расу!', getMainMenu(false));
        }
        
        if (player.awakening_level >= 10) {
          return bot.sendMessage(userId, '❌ Максимальный уровень!', getMainMenu(true));
        }
        
        if (player.awakening_xp < config.AWAKENING_XP_REQUIRED) {
          return bot.sendMessage(userId, 
            `❌ Недостаточно XP пробуждения!\n\n` +
            `🔮 ${player.awakening_xp}/${config.AWAKENING_XP_REQUIRED}\n\n` +
            `💡 Фармите XP через:\n` +
            `• Дуэли (+100 XP за победу)\n` +
            `• Квесты (+50-200 XP)\n` +
            `• Поиск предметов (+20 XP)`,
            getMainMenu(true)
          );
        }
        
        // Показываем подтверждение с правильной ценой
        safeEditMessageText(chatId, messageId,
          `🌟 *Пробуждение расы*\n\n` +
          `💰 Стоимость: ${config.AWAKENING_GOLD_COST} золота\n` +
          `⚡ Бонус: +50 к силе\n` +
          `🔮 XP пробуждения: ${player.awakening_xp}/${config.AWAKENING_XP_REQUIRED}\n\n` +
          `💵 Ваше золото: ${player.gold}\n\n` +
          `Пробудить расу?`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: `✅ Пробудить за ${config.AWAKENING_GOLD_COST}💰`, callback_data: 'confirm_awaken' }],
                [{ text: '❌ Отмена', callback_data: 'upgrade_menu' }]
              ]
            }
          }
        );
      });
      break;
      
    case 'confirm_awaken':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (!player.race_id) {
          return bot.sendMessage(userId, '❌ Сначала получите расу!', getMainMenu(false));
        }
        
        if (player.awakening_level >= 10) {
          return bot.sendMessage(userId, '❌ Максимальный уровень!', getMainMenu(true));
        }
        
        if (player.awakening_xp < config.AWAKENING_XP_REQUIRED) {
          return bot.sendMessage(userId, 
            `❌ Недостаточно XP пробуждения!\n\n` +
            `🔮 ${player.awakening_xp}/${config.AWAKENING_XP_REQUIRED}`,
            getMainMenu(true)
          );
        }
        
        if (player.gold < config.AWAKENING_GOLD_COST) {
          return bot.sendMessage(userId, `❌ Нужно ${config.AWAKENING_GOLD_COST}💰`, getMainMenu(true));
        }
        
        db.run(`UPDATE players SET gold = gold - ?, awakening_level = awakening_level + 1, awakening_xp = 0, power = power + 50 WHERE user_id = ?`,
          [config.AWAKENING_GOLD_COST, userId], () => {
            bot.sendMessage(userId, 
              `✨ *ПРОБУЖДЕНИЕ!* ✨\n\n` +
              `🌟 Уровень: ${player.awakening_level + 1}\n` +
              `⚡ +50 силы\n\n` +
              `💰 -${config.AWAKENING_GOLD_COST}`,
              { parse_mode: 'Markdown', ...getMainMenu(true) }
            );
          });
      });
      break;
      
    case 'help':
      safeEditMessageText(chatId, messageId, 
        `📋 Как играть:\n\n` +
        `🎮 Используйте кнопки меню для навигации\n\n` +
        `💡 Советы:\n` +
        `• Выполняйте квесты для опыта\n` +
        `• Собирайте и экипируйте предметы\n` +
        `• Участвуйте в дуэлях\n` +
        `• Прокачивайте расу\n` +
        `• Вступайте в кланы`,
        {
          ...getMainMenu()
        }
      );
      break;
      
    case 'work':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err) return bot.sendMessage(userId, '❌ Ошибка');
        
        if (!player.race_id) {
          return bot.sendMessage(userId, '❌ Сначала получите расу!', getMainMenu(false));
        }
        
        const cooldown = checkCooldown(player.last_work_time, config.WORK_COOLDOWN);
        
        if (!cooldown.ready) {
          return safeEditMessageText(chatId, messageId, 
            formatCooldownMessage('Работа', cooldown), {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Назад', callback_data: 'rewards_menu' }]
              ]
            }
          });
        }
        
        const goldEarned = Math.floor(Math.random() * 100) + 50; // 50-150 золота
        const expEarned = 20;
        const now = Math.floor(Date.now() / 1000);
        
        db.run(`UPDATE players SET last_work_time = ?, gold = gold + ?, exp = exp + ? WHERE user_id = ?`,
          [now, goldEarned, expEarned, userId], () => {
            bot.sendMessage(userId,
              `💼 Работа выполнена!\n\n` +
              `💰 Заработано: ${goldEarned} золота\n` +
              `✨ Получено: ${expEarned} опыта\n\n` +
              `⏰ Следующая работа через: ${formatCooldown(config.WORK_COOLDOWN)}`,
              getMainMenu(true)
            );
            
            checkLevelUp(userId);
            
            // Логируем работу
            sendLogMessage(
              `💼 Работа выполнена\n` +
              `👤 Игрок: ${userId}\n` +
              `💰 Заработано: ${goldEarned} золота\n` +
              `✨ Получено: ${expEarned} опыта`,
              'WORK'
            );
            
            // Обновляем прогресс квестов
            dailyQuests.updateQuestProgress(userId, 'work', 1, (err, completedQuests) => {
              if (completedQuests && completedQuests.length > 0) {
                completedQuests.forEach(quest => {
                  bot.sendMessage(userId, 
                    `✅ Квест выполнен!\n\n` +
                    `📋 ${quest.quest_name}\n` +
                    `🎁 +${quest.reward_gold}💰 +${quest.reward_exp}✨`
                  );
                  
                  // Логируем выполнение квеста
                  sendLogMessage(
                    `📋 Квест выполнен\n` +
                    `👤 Игрок: ${userId}\n` +
                    `📝 Квест: ${quest.quest_name}\n` +
                    `🎁 Награда: ${quest.reward_gold}💰 ${quest.reward_exp}✨`,
                    'QUEST'
                  );
                });
              }
            });
            
            // Проверяем квесты на накопление золота
            db.get(`SELECT gold FROM players WHERE user_id = ?`, [userId], (err, player) => {
              if (player) {
                dailyQuests.updateQuestProgress(userId, 'gold_total', player.gold, (err, completedQuests) => {
                  if (completedQuests && completedQuests.length > 0) {
                    completedQuests.forEach(quest => {
                      bot.sendMessage(userId, 
                        `✅ Квест выполнен!\n\n` +
                        `📋 ${quest.quest_name}\n` +
                        `🎁 +${quest.reward_gold}💰 +${quest.reward_exp}✨`
                      );
                    });
                  }
                });
              }
            });
          });
      });
      break;
      
    case 'daily_reward':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err) return bot.sendMessage(userId, '❌ Ошибка');
        
        if (!player.race_id) {
          return bot.sendMessage(userId, '❌ Сначала получите расу!', getMainMenu(false));
        }
        
        const cooldown = checkCooldown(player.last_daily_reward, config.DAILY_REWARD_COOLDOWN);
        
        if (!cooldown.ready) {
          return safeEditMessageText(chatId, messageId, 
            formatCooldownMessage('Ежедневная награда', cooldown), {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Назад', callback_data: 'rewards_menu' }]
              ]
            }
          });
        }
        
        const goldReward = 200;
        const expReward = 100;
        const now = Math.floor(Date.now() / 1000);
        
        db.run(`UPDATE players SET last_daily_reward = ?, gold = gold + ?, exp = exp + ? WHERE user_id = ?`,
          [now, goldReward, expReward, userId], () => {
            bot.sendMessage(userId,
              `🎁 Ежедневная награда!\n\n` +
              `💰 +${goldReward} золота\n` +
              `✨ +${expReward} опыта\n\n` +
              `⏰ Следующая награда через: 24 часа`,
              getMainMenu(true)
            );
            
            checkLevelUp(userId);
            
            // Логируем ежедневную награду
            sendLogMessage(
              `🎁 Ежедневная награда получена\n` +
              `👤 Игрок: ${userId}\n` +
              `💰 Получено: ${goldReward} золота\n` +
              `✨ Получено: ${expReward} опыта`,
              'DAILY'
            );
            
            // Проверяем квесты на накопление золота
            db.get(`SELECT gold FROM players WHERE user_id = ?`, [userId], (err, player) => {
              if (player) {
                dailyQuests.updateQuestProgress(userId, 'gold_total', player.gold, (err, completedQuests) => {
                  if (completedQuests && completedQuests.length > 0) {
                    completedQuests.forEach(quest => {
                      bot.sendMessage(userId, 
                        `✅ Квест выполнен!\n\n` +
                        `📋 ${quest.quest_name}\n` +
                        `🎁 +${quest.reward_gold}💰 +${quest.reward_exp}✨`
                      );
                    });
                  }
                });
              }
            });
          });
      });
      break;
      
    // Обработчики редактирования рас
    default:
      // Обработчики улучшения характеристик
      if (data.startsWith('upgrade_char_')) {
        const charType = data.replace('upgrade_char_', '');
        
        bot.answerCallbackQuery(query.id, { text: '⏳ Улучшение...', show_alert: false });
        
        characteristics.upgradeCharacteristic(userId, charType, (err, result) => {
          if (err) {
            return bot.answerCallbackQuery(query.id, { 
              text: `❌ ${err.message}`, 
              show_alert: true 
            });
          }
          
          bot.answerCallbackQuery(query.id, { 
            text: `✅ ${result.icon} ${result.name} улучшено до уровня ${result.new_level}! Бонус: +${result.bonus}`, 
            show_alert: true 
          });
          
          // Обновляем меню характеристик
          bot.emit('callback_query', { ...query, data: 'characteristics' });
        });
        return;
      }
      
      if (data === 'insufficient_gold') {
        bot.answerCallbackQuery(query.id, { 
          text: '❌ Недостаточно золота', 
          show_alert: true 
        });
        return;
      }
      
      // Обработчики запуска рейда админом
      if (data.startsWith('admin_raid_level_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
        }
        
        const levelStr = data.replace('admin_raid_level_', '');
        const level = levelStr === 'random' ? null : parseInt(levelStr);
        
        bot.answerCallbackQuery(query.id, { text: '⏳ Создание рейда...', show_alert: false });
        
        raids.createManualRaid(level, (err, raid) => {
          if (err) {
            console.error('Ошибка создания рейда:', err);
            return bot.sendMessage(userId, `❌ Ошибка создания рейда: ${err.message}`);
          }
          
          const timeLeft = Math.floor((new Date(raid.ends_at) - new Date()) / 1000 / 60);
          
          // Уведомляем админа
          bot.sendMessage(userId,
            `✅ *Рейд запущен!*\n\n` +
            `👹 ${raid.name}\n` +
            `⭐ Уровень: ${raid.level}\n` +
            `❤️ HP: ${raid.hp}\n` +
            `⏰ Длительность: ${timeLeft} мин\n\n` +
            `💰 Награды: ${raid.rewards.gold_min}-${raid.rewards.gold_max}💰\n` +
            `💎 Кристаллы: ${raid.rewards.total_crystals}💎 (делятся по урону)\n` +
            `✨ Опыт: ${raid.rewards.exp_min}-${raid.rewards.exp_max}✨\n` +
            `📦 Шанс предмета: ${raid.rewards.item_chance}%`,
            { parse_mode: 'Markdown' }
          );
          
          // Логируем запуск рейда
          sendLogMessage(
            `🐉 Админ запустил рейд\n` +
            `👤 Админ: ${userId} (@${query.from.username})\n` +
            `👹 Босс: ${raid.name} (Ур.${raid.level})\n` +
            `❤️ HP: ${raid.hp}\n` +
            `⏰ Длительность: 2 часа`,
            'ADMIN'
          );
          
          // Отправляем глобальное уведомление всем игрокам
          db.all(`SELECT user_id FROM players WHERE race_id IS NOT NULL`, (err, players) => {
            if (err || !players) return;
            
            const raidMessage = 
              `🐉 *НОВЫЙ РЕЙД!*\n\n` +
              `👹 ${raid.name} (Ур.${raid.level})\n` +
              `📝 ${raid.description}\n\n` +
              `❤️ HP: ${raid.hp}\n` +
              `⏰ Время: ${timeLeft} мин\n\n` +
              `💰 Награды: ${raid.rewards.gold_min}-${raid.rewards.gold_max}💰\n` +
              `💎 ${raid.rewards.total_crystals}💎 (делятся по урону)\n` +
              `✨ ${raid.rewards.exp_min}-${raid.rewards.exp_max}✨\n\n` +
              `⚠️ Минимум 2% урона для награды\n\n` +
              `Откройте меню "🐉 Рейды" чтобы присоединиться!`;
            
            players.forEach(player => {
              bot.sendMessage(player.user_id, raidMessage, { parse_mode: 'Markdown' })
                .catch(err => console.error(`Ошибка отправки уведомления игроку ${player.user_id}:`, err));
            });
            
            console.log(`📢 Уведомление о рейде отправлено ${players.length} игрокам`);
          });
        });

      }
      
      // Обработчики редактирования босса
      if (data.startsWith('admin_edit_boss_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
        }
        
        const bossId = parseInt(data.replace('admin_edit_boss_', ''));
        
        db.get(`SELECT * FROM raid_bosses WHERE id = ?`, [bossId], (err, boss) => {
          if (err || !boss) {
            return bot.answerCallbackQuery(query.id, { text: '❌ Босс не найден', show_alert: true });
          }
          
          const rewards = JSON.parse(boss.rewards);
          
          safeEditMessageText(chatId, messageId,
            `✏️ *Редактирование босса*\n\n` +
            `🐉 *${boss.name}*\n` +
            `⭐ Уровень: ${boss.level}\n` +
            `❤️ Базовое HP: ${boss.base_hp}\n` +
            `🏆 Побед: ${boss.times_defeated}\n` +
            `📝 Описание: ${boss.description}\n` +
            `🖼️ Изображение: ${boss.image}\n\n` +
            `💰 Награды:\n` +
            `   Золото: ${rewards.total_gold}\n` +
            `   Кристаллы: ${rewards.total_crystals}\n` +
            `   Опыт: ${rewards.total_exp}\n\n` +
            `Выберите параметр для изменения:`,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '📝 Название', callback_data: `edit_boss_name_${bossId}` },
                    { text: '⭐ Уровень', callback_data: `edit_boss_level_${bossId}` }
                  ],
                  [
                    { text: '❤️ HP', callback_data: `edit_boss_hp_${bossId}` },
                    { text: '📝 Описание', callback_data: `edit_boss_desc_${bossId}` }
                  ],
                  [
                    { text: '🖼️ Изображение', callback_data: `edit_boss_image_${bossId}` }
                  ],
                  [
                    { text: '💰 Золото', callback_data: `edit_boss_gold_${bossId}` },
                    { text: '💎 Кристаллы', callback_data: `edit_boss_crystals_${bossId}` }
                  ],
                  [
                    { text: '✨ Опыт', callback_data: `edit_boss_exp_${bossId}` }
                  ],
                  [
                    { text: '🗑️ Удалить босса', callback_data: `delete_boss_${bossId}` }
                  ],
                  [
                    { text: '🔙 Назад', callback_data: 'admin_edit_boss' }
                  ]
                ]
              }
            }
          );
        });

      }
      
      // Обработчики редактирования параметров босса
      if (data.startsWith('edit_boss_name_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
        }
        
        const bossId = parseInt(data.replace('edit_boss_name_', ''));
        adminState.set(userId, { action: 'edit_boss_name', bossId });
        
        bot.sendMessage(chatId, '📝 Введите новое название босса:');

      }
      
      if (data.startsWith('edit_boss_level_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
        }
        
        const bossId = parseInt(data.replace('edit_boss_level_', ''));
        adminState.set(userId, { action: 'edit_boss_level', bossId });
        
        bot.sendMessage(chatId, '⭐ Введите новый уровень босса (1-120):');

      }
      
      if (data.startsWith('edit_boss_hp_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
        }
        
        const bossId = parseInt(data.replace('edit_boss_hp_', ''));
        adminState.set(userId, { action: 'edit_boss_hp', bossId });
        
        bot.sendMessage(chatId, '❤️ Введите новое базовое HP (10000-1000000):');

      }
      
      if (data.startsWith('edit_boss_desc_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
        }
        
        const bossId = parseInt(data.replace('edit_boss_desc_', ''));
        adminState.set(userId, { action: 'edit_boss_desc', bossId });
        
        bot.sendMessage(chatId, '📝 Введите новое описание босса (до 200 символов):');

      }
      
      if (data.startsWith('edit_boss_image_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
        }
        
        const bossId = parseInt(data.replace('edit_boss_image_', ''));
        adminState.set(userId, { action: 'edit_boss_image', bossId });
        
        bot.sendMessage(chatId, '🖼️ Введите имя файла изображения (например: raid_fire_lord.jpg):');

      }
      
      if (data.startsWith('edit_boss_gold_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
        }
        
        const bossId = parseInt(data.replace('edit_boss_gold_', ''));
        adminState.set(userId, { action: 'edit_boss_gold', bossId });
        
        bot.sendMessage(chatId, '💰 Введите новую награду золота (100-10000):');

      }
      
      if (data.startsWith('edit_boss_crystals_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
        }
        
        const bossId = parseInt(data.replace('edit_boss_crystals_', ''));
        adminState.set(userId, { action: 'edit_boss_crystals', bossId });
        
        bot.sendMessage(chatId, '💎 Введите новую награду кристаллов (5-100):');

      }
      
      if (data.startsWith('edit_boss_exp_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
        }
        
        const bossId = parseInt(data.replace('edit_boss_exp_', ''));
        adminState.set(userId, { action: 'edit_boss_exp', bossId });
        
        bot.sendMessage(chatId, '✨ Введите новую награду опыта (100-10000):');

      }
      
      if (data.startsWith('delete_boss_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
        }
        
        const bossId = parseInt(data.replace('delete_boss_', ''));
        
        db.get(`SELECT name FROM raid_bosses WHERE id = ?`, [bossId], (err, boss) => {
          if (err || !boss) {
            return bot.answerCallbackQuery(query.id, { text: '❌ Босс не найден', show_alert: true });
          }
          
          safeEditMessageText(chatId, messageId,
            `🗑️ *Удаление босса*\n\n` +
            `⚠️ Вы уверены, что хотите удалить босса "${boss.name}"?\n\n` +
            `Это действие нельзя отменить!`,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '✅ Да, удалить', callback_data: `confirm_delete_boss_${bossId}` }
                  ],
                  [
                    { text: '❌ Отмена', callback_data: `admin_edit_boss_${bossId}` }
                  ]
                ]
              }
            }
          );
        });

      }
      
      if (data.startsWith('confirm_delete_boss_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
        }
        
        const bossId = parseInt(data.replace('confirm_delete_boss_', ''));
        
        db.run(`DELETE FROM raid_bosses WHERE id = ?`, [bossId], (err) => {
          if (err) {
            return bot.answerCallbackQuery(query.id, { text: '❌ Ошибка удаления', show_alert: true });
          }
          
          bot.answerCallbackQuery(query.id, { text: '✅ Босс удален', show_alert: true });
          
          sendLogMessage(
            `🗑️ Удален босс рейда\n` +
            `👤 Админ: @${query.from.username}\n` +
            `🆔 ID босса: ${bossId}`,
            'ADMIN'
          );
          
          // Возвращаемся к списку боссов
          bot.emit('callback_query', { ...query, data: 'admin_edit_boss' });
        });

      }
      
      // Админский обработчик мгновенного запуска рейда
      if (data.startsWith('admin_force_start_raid_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
        }
        
        const bossId = parseInt(data.replace('admin_force_start_raid_', ''));
        
        raids.forceStartRaidWithBoss(bossId, (err, result) => {
          if (err) {
            console.error('Ошибка принудительного запуска рейда:', err);
            return bot.answerCallbackQuery(query.id, { text: '❌ Ошибка запуска рейда', show_alert: true });
          }
          
          bot.answerCallbackQuery(query.id, { text: '⚡ Рейд запущен мгновенно!', show_alert: true });
          
          // Обновляем интерфейс
          showRaidBossSelection(chatId, messageId, 0, userId, query.from.username);
        });
        
        return;
      }
      
      // Админский обработчик ускорения кулдауна рейда
      if (data.startsWith('admin_speedup_raid_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав', show_alert: true });
        }
        
        const bossId = parseInt(data.replace('admin_speedup_raid_', ''));
        
        // Получаем имя босса по ID
        raids.getBossList((err, bosses) => {
          if (err || !bosses) {
            return bot.answerCallbackQuery(query.id, { text: '❌ Ошибка получения списка боссов', show_alert: true });
          }
          
          const boss = bosses.find(b => b.id === bossId);
          if (!boss) {
            return bot.answerCallbackQuery(query.id, { text: '❌ Босс не найден', show_alert: true });
          }
          
          raids.speedupBossCooldown(boss.name, (err, result) => {
            if (err) {
              console.error('Ошибка ускорения кулдауна:', err);
              return bot.answerCallbackQuery(query.id, { 
                text: '❌ ' + (err.message || 'Ошибка ускорения кулдауна'), 
                show_alert: true 
              });
            }
            
            bot.answerCallbackQuery(query.id, { 
              text: `⏱️ Кулдаун ускорен! Рейд будет доступен через 1 минуту`, 
              show_alert: true 
            });
            
            // Обновляем интерфейс
            showRaidBossSelection(chatId, messageId, 0, userId, query.from.username);
          });
        });
        
        return;
      }
      
      // Обработчик атаки активного рейда
      if (data === 'attack_active_raid') {
        raids.getActiveRaid((err, raid) => {
          if (err || !raid) {
            return safeEditMessageText(chatId, messageId, '❌ Активный рейд не найден', {
              reply_markup: {
                inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'select_raid_boss' }]]
              }
            });
          }
          
          const hpPercent = Math.floor((raid.current_hp / raid.boss_hp) * 100);
          const timeLeft = Math.floor((new Date(raid.ends_at) - new Date()) / 1000 / 60);
          const hpBar = getHPBar(hpPercent);
          
          // Проверяем условия участия
          raids.checkRaidRequirements(userId, raid.boss_name, (err, requirements) => {
            const canJoin = requirements ? requirements.canJoin : true;
            const requirementReason = requirements ? requirements.reason : null;
            
            // Проверяем, присоединился ли игрок
            db.get(`SELECT * FROM raid_participants WHERE raid_id = ? AND user_id = ?`, [raid.id, userId], (err, participant) => {
              const hasJoined = !!participant;
              
              const buttons = [];
              if (hasJoined) {
                buttons.push([{ text: '⚔️ Атаковать', callback_data: `attack_raid_${raid.id}` }]);
                buttons.push([{ text: '📊 Моя статистика', callback_data: `my_raid_stats_${raid.id}` }]);
              } else if (canJoin) {
                buttons.push([{ text: '⚔️ Присоединиться', callback_data: `join_raid_${raid.id}` }]);
              } else {
                buttons.push([{ text: `❌ ${requirementReason}`, callback_data: 'noop' }]);
              }
              
              buttons.push([{ text: '👥 Участники', callback_data: `raid_participants_${raid.id}` }]);
              buttons.push([{ text: '🔄 Обновить', callback_data: `attack_active_raid` }]);
              buttons.push([{ text: '🔙 Назад', callback_data: 'select_raid_boss' }]);
              
              // Формируем текст с условиями участия
              let requirementsText = '';
              if (raid.boss_name === 'Владыка тьмы') {
                requirementsText = '\n📋 *Условия участия:*\n' +
                  '• Уровень расы 10+\n' +
                  '• Участие в рейде "Повелитель ветра"\n' +
                  '🎁 *Специальная награда:*\n' +
                  '• Топ-1 по урону получает Амулет тьмы\n';
              }
              
              let statusText = '';
              if (hasJoined) {
                statusText = '✅ Вы участвуете в рейде';
              } else if (canJoin) {
                statusText = '⚠️ Присоединитесь к рейду';
              } else {
                statusText = `❌ ${requirementReason}`;
              }
              
              editImageWithText(chatId, messageId, `raids/${raid.boss_image}`,
                `🐉 *АКТИВНЫЙ РЕЙД*\n\n` +
                `🌪️ ${raid.boss_name}\n` +
                `⭐ Уровень: ${raid.boss_level}\n` +
                `📝 ${raid.boss_description}\n${requirementsText}\n` +
                `${hpBar}\n` +
                `❤️ HP: ${raid.current_hp.toLocaleString()}/${raid.boss_hp.toLocaleString()} (${hpPercent}%)\n` +
                `⏰ Осталось: ${timeLeft} мин\n\n` +
                `💰 Награды (делятся по урону):\n` +
                `• ${raid.rewards.total_gold} золота\n` +
                `• ${raid.rewards.total_crystals} алмазов\n` +
                `• ${raid.rewards.total_exp} опыта\n\n` +
                `${statusText}`,
                {
                  parse_mode: 'Markdown',
                  reply_markup: { inline_keyboard: buttons }
                }
              );
            });
          });
        });
        
        return;
      }
      
      // Обработчики рейдов
      if (data.startsWith('raid_boss_')) {
        const raidBossId = parseInt(data.replace('raid_boss_', ''));
        
        raids.getActiveRaid((err, raid) => {
          if (err || !raid || raid.id !== raidBossId) {
            return safeEditMessageText(chatId, messageId, '❌ Рейд не найден или завершен', {
              reply_markup: {
                inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'raids_menu' }]]
              }
            });
          }
          
          const hpPercent = Math.floor((raid.current_hp / raid.boss_hp) * 100);
          const timeLeft = Math.floor((new Date(raid.ends_at) - new Date()) / 1000 / 60);
          const hpBar = getHPBar(hpPercent);
          
          // Проверяем условия участия
          raids.checkRaidRequirements(userId, raid.boss_name, (err, requirements) => {
            const canJoin = requirements ? requirements.canJoin : true;
            const requirementReason = requirements ? requirements.reason : null;
            
            // Проверяем, присоединился ли игрок
            raids.getPlayerRaidStats(raid.id, userId, (err, stats) => {
              const hasJoined = !!stats;
              const buttons = [];
              
              if (hasJoined) {
                buttons.push([{ text: '⚔️ Атаковать', callback_data: `attack_raid_${raid.id}` }]);
                buttons.push([{ text: '📊 Моя статистика', callback_data: `my_raid_stats_${raid.id}` }]);
              } else if (canJoin) {
                buttons.push([{ text: '⚔️ Присоединиться', callback_data: `join_raid_${raid.id}` }]);
              } else {
                buttons.push([{ text: '❌ Недоступно', callback_data: 'noop' }]);
              }
              
              buttons.push([{ text: '👥 Участники', callback_data: `raid_participants_${raid.id}` }]);
              buttons.push([{ text: '🔄 Обновить', callback_data: `raid_boss_${raid.id}` }]);
              buttons.push([{ text: '🔙 Назад', callback_data: 'select_raid_boss' }]);
              
              // Формируем текст с условиями участия
              let requirementsText = '';
              if (raid.boss_name === 'Владыка тьмы') {
                requirementsText = '\n📋 *Условия участия:*\n' +
                  '• Уровень расы 10+\n' +
                  '• Участие в рейде "Повелитель ветра"\n' +
                  '🎁 *Специальная награда:*\n' +
                  '• Топ-1 по урону получает Амулет тьмы\n';
              }
              
              let statusText = '';
              if (hasJoined) {
                statusText = '✅ Вы участвуете в рейде';
              } else if (canJoin) {
                statusText = '⚠️ Присоединитесь к рейду';
              } else {
                statusText = `❌ ${requirementReason}`;
              }
              
              editImageWithText(chatId, messageId, `raids/${raid.boss_image}`,
                `🐉 *РЕЙД-БОСС*\n\n` +
                `🌪️ ${raid.boss_name}\n` +
                `⭐ Уровень: ${raid.boss_level}\n` +
                `📝 ${raid.boss_description}\n${requirementsText}\n` +
                `${hpBar}\n` +
                `❤️ HP: ${raid.current_hp.toLocaleString()}/${raid.boss_hp.toLocaleString()} (${hpPercent}%)\n` +
                `⏰ Осталось: ${timeLeft} мин\n\n` +
                `${statusText}`,
                {
                  reply_markup: {
                    inline_keyboard: buttons
                  },
                  parse_mode: 'Markdown'
                }
              );
            });
          });
        });

      }

      }
      
      if (data.startsWith('join_raid_')) {
        const raidId = parseInt(data.replace('join_raid_', ''));
        console.log(`🎯 Попытка присоединения к рейду: raidId=${raidId}, userId=${userId}`);
        
        raids.joinRaid(raidId, userId, (err, result) => {
          if (err) {
            console.error('❌ Ошибка присоединения к рейду:', err);
            return bot.answerCallbackQuery(query.id, { text: '❌ Ошибка присоединения', show_alert: true });
          }
          
          console.log('📋 Результат присоединения:', result);
          
          if (result.cannotJoin) {
            console.log(`❌ Не может присоединиться: ${result.reason}`);
            return bot.answerCallbackQuery(query.id, { 
              text: `❌ ${result.reason}`, 
              show_alert: true 
            });
          }
          
          if (result.alreadyJoined) {
            console.log('✅ Игрок уже в рейде');
            bot.answerCallbackQuery(query.id, { text: '✅ Вы уже в рейде!', show_alert: false });
          } else {
            console.log('✅ Игрок успешно присоединился к рейду');
            bot.answerCallbackQuery(query.id, { text: '✅ Вы присоединились к рейду!', show_alert: false });
          }
          
          // Открываем меню битвы с боссом
          showRaidBattleMenu(chatId, messageId, raidId, userId);
        });
      }
      
      // Обработчик открытия меню битвы с боссом
      if (data.startsWith('raid_battle_')) {
        const raidId = parseInt(data.replace('raid_battle_', ''));
        showRaidBattleMenu(chatId, messageId, raidId, userId);
        return;
      }
      
      if (data.startsWith('attack_raid_')) {
        const raidId = parseInt(data.replace('attack_raid_', ''));
        
        getOrCreatePlayer(userId, query.from.username, (err, player) => {
          if (err) {
            return bot.answerCallbackQuery(query.id, { text: '❌ Ошибка', show_alert: true });
          }
          
          duels.calculatePlayerPower(userId, (err, stats) => {
            if (err || !stats) {
              return bot.answerCallbackQuery(query.id, { text: '❌ Ошибка расчета силы', show_alert: true });
            }
            
            // Используем урон игрока (attack), а не силу (power)
            raids.attackBoss(raidId, userId, stats.attack, (err, result) => {
              if (err) {
                return bot.answerCallbackQuery(query.id, { text: `❌ ${err.message}`, show_alert: true });
              }
              
              if (result.bossDefeated) {
                bot.answerCallbackQuery(query.id, { text: `⚔️ Урон: ${result.damage}\n🏆 БОСС ПОБЕЖДЕН!`, show_alert: true });
                
                const results = result.results;
                let topMessage = `🏆 *РЕЙД ЗАВЕРШЕН!*\n\n` +
                  `🌪️ ${results.boss_name} (Ур.${results.boss_level}) побежден!\n\n` +
                  `📊 *ТОП УРОНА:*\n\n`;
                
                results.participants.slice(0, 10).forEach((p, index) => {
                  const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                  topMessage += `${medal} ${p.username}\n`;
                  topMessage += `   ⚔️ ${p.damage_dealt} урона (${p.damage_percent}%)\n`;
                  topMessage += `   🎁 ${p.gold}💰 ${p.crystals}💎 ${p.exp}✨\n`;
                  if (p.special_reward) {
                    topMessage += `   🌟 Специальная награда: ${p.special_reward}\n`;
                  }
                  topMessage += `\n`;
                });
                
                results.participants.forEach(p => {
                  bot.sendMessage(p.player_id, topMessage, { parse_mode: 'Markdown' }).catch(err => {
                    console.log(`Не удалось отправить топ игроку ${p.player_id}`);
                  });
                  
                  let rewardMessage = `🎁 *Ваши награды:*\n\n` +
                    `💰 +${p.gold} золота\n` +
                    `💎 +${p.crystals} алмазов\n` +
                    `✨ +${p.exp} опыта\n\n` +
                    `⚔️ Ваш урон: ${p.damage_dealt} (${p.damage_percent}%)`;
                  
                  if (p.special_reward) {
                    rewardMessage += `\n\n🌟 *СПЕЦИАЛЬНАЯ НАГРАДА!*\n🎁 Вы получили: ${p.special_reward}`;
                  }
                  
                  bot.sendMessage(p.player_id, rewardMessage, { parse_mode: 'Markdown' }).catch(err => {
                    console.log(`Не удалось отправить награды игроку ${p.player_id}`);
                  });
                });
                
                sendLogMessage(
                  `🏆 Рейд завершен\n` +
                  `🌪️ Босс: ${results.boss_name} (Ур.${results.boss_level})\n` +
                  `👥 Участников: ${results.participants.length}\n` +
                  `⚔️ Урон: ${results.total_damage}`,
                  'SUCCESS'
                );
                
                // Возвращаем к выбору боссов после завершения рейда
                setTimeout(() => {
                  bot.emit('callback_query', { ...query, data: 'select_raid_boss' });
                }, 2000);
              } else {
                bot.answerCallbackQuery(query.id, { 
                  text: `⚔️ Урон: ${result.damage}\n❤️ HP босса: ${result.currentHp.toLocaleString()}/${result.maxHp.toLocaleString()}`, 
                  show_alert: false 
                });
                
                // Обновляем меню битвы с боссом
                showRaidBattleMenu(chatId, messageId, raidId, userId);
              }
            });
          });
        });
      }
      
      if (data.startsWith('raid_participants_')) {
        const raidId = parseInt(data.replace('raid_participants_', ''));
        
        raids.getRaidParticipants(raidId, (err, participants) => {
          if (err || !participants || participants.length === 0) {
            return bot.answerCallbackQuery(query.id, { text: 'Пока нет участников', show_alert: true });
          }
          
          let message = `👥 *Участники рейда*\n\n`;
          
          participants.slice(0, 20).forEach((p, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            message += `${medal} ${p.display_name || p.username || `Игрок ${p.player_id}`}\n`;
            message += `   ⚔️ ${p.damage_dealt} урона | 🎯 ${p.attacks_count} атак\n\n`;
          });
          
          if (participants.length > 20) {
            message += `\n...и еще ${participants.length - 20} участников`;
          }
          
          safeEditMessageText(chatId, messageId, message, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Назад к рейду', callback_data: 'raids_menu' }]
              ]
            }
          });
        });
      }
      
      if (data.startsWith('my_raid_stats_')) {
        const raidId = parseInt(data.replace('my_raid_stats_', ''));
        
        raids.getPlayerRaidStats(raidId, userId, (err, stats) => {
          if (err || !stats) {
            return bot.answerCallbackQuery(query.id, { text: 'Статистика не найдена', show_alert: true });
          }
          
          // Получаем общий урон всех участников
          raids.getRaidParticipants(raidId, (err, participants) => {
            if (err || !participants) {
              return bot.answerCallbackQuery(query.id, { text: 'Ошибка загрузки статистики', show_alert: true });
            }
            
            const totalDamage = participants.reduce((sum, p) => sum + p.damage_dealt, 0);
            const damagePercent = totalDamage > 0 ? Math.floor((stats.damage_dealt / totalDamage) * 100) : 0;
            
            bot.answerCallbackQuery(query.id, {
              text: `📊 Ваша статистика:\n⚔️ Урон: ${stats.damage_dealt} (${damagePercent}%)\n🎯 Атак: ${stats.attacks_count}`,
              show_alert: true
            });
          });
        });
      }
      
      // Обработка динамических callback_data для редактирования рас
      if (data.startsWith('edit_race_name_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав' });
        }
        
        const raceId = parseInt(data.replace('edit_race_name_', ''));
        adminState.set(userId, { action: 'edit_race_name', raceId: raceId });
        
        bot.sendMessage(userId, 
          '📝 *Изменение названия расы*\n\n' +
          'Введите новое название расы:',
          { parse_mode: 'Markdown' }
        );
      }
      
      if (data.startsWith('edit_race_rarity_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав' });
        }
        
        const raceId = parseInt(data.replace('edit_race_rarity_', ''));
        adminState.set(userId, { action: 'edit_race_rarity', raceId: raceId });
        
        bot.sendMessage(userId, 
          '🎨 *Изменение редкости расы*\n\n' +
          'Выберите новую редкость:\n\n' +
          '1 - ⚪️ Обычная (COMMON)\n' +
          '2 - 🔵 Редкая (RARE)\n' +
          '3 - 🟣 Эпическая (EPIC)\n' +
          '4 - 🔴 Мистическая (MYTHIC)\n' +
          '5 - 🟡 Легендарная (LEGENDARY)\n' +
          '6 - ⚫️ Секретная (SECRET)\n\n' +
          'Введите номер (1-6):',
          { parse_mode: 'Markdown' }
        );
      }
      
      if (data.startsWith('edit_race_power_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав' });
        }
        
        const raceId = parseInt(data.replace('edit_race_power_', ''));
        adminState.set(userId, { action: 'edit_race_power', raceId: raceId });
        
        bot.sendMessage(userId, 
          '⚡ *Изменение силы расы*\n\n' +
          'Введите новое значение силы (1-1000):',
          { parse_mode: 'Markdown' }
        );
      }
      
      if (data.startsWith('edit_race_hp_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав' });
        }
        
        const raceId = parseInt(data.replace('edit_race_hp_', ''));
        adminState.set(userId, { action: 'edit_race_hp', raceId: raceId });
        
        bot.sendMessage(userId, 
          '❤️ *Изменение здоровья расы*\n\n' +
          'Введите новое значение здоровья (1-1000):',
          { parse_mode: 'Markdown' }
        );
      }
      
      if (data.startsWith('edit_race_attack_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав' });
        }
        
        const raceId = parseInt(data.replace('edit_race_attack_', ''));
        adminState.set(userId, { action: 'edit_race_attack', raceId: raceId });
        
        bot.sendMessage(userId, 
          '🗡️ *Изменение атаки расы*\n\n' +
          'Введите новое значение атаки (1-500):',
          { parse_mode: 'Markdown' }
        );
      }
      
      if (data.startsWith('edit_race_defense_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав' });
        }
        
        const raceId = parseInt(data.replace('edit_race_defense_', ''));
        adminState.set(userId, { action: 'edit_race_defense', raceId: raceId });
        
        bot.sendMessage(userId, 
          '🛡️ *Изменение защиты расы*\n\n' +
          'Введите новое значение защиты (1-500):',
          { parse_mode: 'Markdown' }
        );
      }
      
      if (data.startsWith('edit_race_ability_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав' });
        }
        
        const raceId = parseInt(data.replace('edit_race_ability_', ''));
        adminState.set(userId, { action: 'edit_race_ability', raceId: raceId });
        
        bot.sendMessage(userId, 
          '🎯 *Изменение способности расы*\n\n' +
          'Введите новое описание способности:',
          { parse_mode: 'Markdown' }
        );
      }
      
      if (data.startsWith('edit_race_desc_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав' });
        }
        
        const raceId = parseInt(data.replace('edit_race_desc_', ''));
        adminState.set(userId, { action: 'edit_race_desc', raceId: raceId });
        
        bot.sendMessage(userId, 
          '📝 *Изменение описания расы*\n\n' +
          'Введите новое описание расы:',
          { parse_mode: 'Markdown' }
        );
      }
      
      if (data.startsWith('delete_race_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав' });
        }
        
        const raceId = parseInt(data.replace('delete_race_', ''));
        
        db.get(`SELECT name FROM races WHERE id = ?`, [raceId], (err, race) => {
          if (err || !race) {
            return bot.sendMessage(userId, '❌ Раса не найдена');
          }
          
          bot.sendMessage(userId, 
            `⚠️ *ВНИМАНИЕ!*\n\n` +
            `Вы уверены что хотите удалить расу "${race.name}"?\n\n` +
            `Это действие необратимо!`,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '✅ Да, удалить', callback_data: `confirm_delete_race_${raceId}` },
                    { text: '❌ Отмена', callback_data: 'admin_list_races' }
                  ]
                ]
              }
            }
          );
        });
      }
      
      if (data.startsWith('confirm_delete_race_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав' });
        }
        
        const raceId = parseInt(data.replace('confirm_delete_race_', ''));
        
        db.get(`SELECT name FROM races WHERE id = ?`, [raceId], (err, race) => {
          if (err || !race) {
            return bot.sendMessage(userId, '❌ Раса не найдена');
          }
          
          db.run(`DELETE FROM races WHERE id = ?`, [raceId], (err) => {
            if (err) {
              console.error('Ошибка удаления расы:', err);
              sendLogMessage('ERROR', `❌ Ошибка удаления расы: ${err.message}`);
              return bot.sendMessage(userId, '❌ Ошибка удаления расы');
            }
            
            sendLogMessage('ADMIN', `🗑️ Админ удалил расу: ${race.name} (ID: ${raceId})`);
            bot.sendMessage(userId, `✅ Раса "${race.name}" успешно удалена`, {
              reply_markup: {
                inline_keyboard: [[{ text: '📋 К списку рас', callback_data: 'admin_list_races' }]]
              }
            });
          });
        });
      }
      
      if (data.startsWith('admin_edit_race_page_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав' });
        }
        
        const page = parseInt(data.replace('admin_edit_race_page_', ''));
        
        db.all(`SELECT * FROM races ORDER BY rarity DESC, name ASC`, (err, races) => {
          if (err || races.length === 0) {
            return safeEditMessageText(chatId, messageId, '❌ Расы не найдены', {
              reply_markup: {
                inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'admin_races' }]]
              }
            });
          }
          
          const perPage = 5;
          const totalPages = Math.ceil(races.length / perPage);
          const start = page * perPage;
          const end = start + perPage;
          const pageRaces = races.slice(start, end);
          
          let message = `📝 *Редактирование расы*\n\n`;
          message += `Выберите расу для редактирования:\n\n`;
          message += `Страница ${page + 1} из ${totalPages}\n\n`;
          
          const buttons = [];
          
          pageRaces.forEach((race) => {
            const rarityIcon = config.RARITY[race.rarity]?.color || '⚪️';
            buttons.push([{ 
              text: `${rarityIcon} ${race.name}`, 
              callback_data: `admin_edit_race_${race.id}` 
            }]);
          });
          
          // Навигация
          const navButtons = [];
          if (page > 0) {
            navButtons.push({ text: '◀️ Назад', callback_data: `admin_edit_race_page_${page - 1}` });
          }
          if (page < totalPages - 1) {
            navButtons.push({ text: 'Вперёд ▶️', callback_data: `admin_edit_race_page_${page + 1}` });
          }
          if (navButtons.length > 0) {
            buttons.push(navButtons);
          }
          
          buttons.push([{ text: '🔙 Назад', callback_data: 'admin_races' }]);
          
          safeEditMessageText(chatId, messageId, message, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: buttons }
          });
        });

      }
      
      if (data.startsWith('admin_delete_race_page_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав' });
        }
        
        const page = parseInt(data.replace('admin_delete_race_page_', ''));
        
        db.all(`SELECT * FROM races ORDER BY rarity DESC, name ASC`, (err, races) => {
          if (err || races.length === 0) {
            return safeEditMessageText(chatId, messageId, '❌ Расы не найдены', {
              reply_markup: {
                inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'admin_races' }]]
              }
            });
          }
          
          const perPage = 5;
          const totalPages = Math.ceil(races.length / perPage);
          const start = page * perPage;
          const end = start + perPage;
          const pageRaces = races.slice(start, end);
          
          let message = `🗑️ *Удаление расы*\n\n`;
          message += `Выберите расу для удаления:\n\n`;
          message += `Страница ${page + 1} из ${totalPages}\n\n`;
          
          const buttons = [];
          
          pageRaces.forEach((race) => {
            const rarityIcon = config.RARITY[race.rarity]?.color || '⚪️';
            buttons.push([{ 
              text: `${rarityIcon} ${race.name}`, 
              callback_data: `delete_race_${race.id}` 
            }]);
          });
          
          // Навигация
          const navButtons = [];
          if (page > 0) {
            navButtons.push({ text: '◀️ Назад', callback_data: `admin_delete_race_page_${page - 1}` });
          }
          if (page < totalPages - 1) {
            navButtons.push({ text: 'Вперёд ▶️', callback_data: `admin_delete_race_page_${page + 1}` });
          }
          if (navButtons.length > 0) {
            buttons.push(navButtons);
          }
          
          buttons.push([{ text: '🔙 Назад', callback_data: 'admin_races' }]);
          
          safeEditMessageText(chatId, messageId, message, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: buttons }
          });
        });

      }
      
      // Обработчики для выдачи расы
      if (data.startsWith('admin_race_page_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав' });
        }
        
        const state = adminState.get(userId);
        if (!state || !state.races) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Сессия истекла' });
        }
        
        const page = parseInt(data.replace('admin_race_page_', ''));
        state.racePage = page;
        adminState.set(userId, state);
        
        const races = state.races;
        const perPage = 5;
        const totalPages = Math.ceil(races.length / perPage);
        const start = page * perPage;
        const end = start + perPage;
        const pageRaces = races.slice(start, end);
        
        let message = `✅ Игрок: ${state.targetUsername} (ID: ${state.targetUserId})\n\n`;
        message += `🧬 *Выберите расу для выдачи:*\n\n`;
        message += `Страница ${page + 1} из ${totalPages}\n\n`;
        
        const buttons = [];
        
        pageRaces.forEach((race) => {
          const rarityIcon = config.RARITY[race.rarity]?.color || '⚪️';
          buttons.push([{ 
            text: `${rarityIcon} ${race.name}`, 
            callback_data: `admin_select_race_${race.id}` 
          }]);
        });
        
        // Навигация
        const navButtons = [];
        if (page > 0) {
          navButtons.push({ text: '◀️ Назад', callback_data: `admin_race_page_${page - 1}` });
        }
        if (page < totalPages - 1) {
          navButtons.push({ text: 'Вперёд ▶️', callback_data: `admin_race_page_${page + 1}` });
        }
        if (navButtons.length > 0) {
          buttons.push(navButtons);
        }
        
        buttons.push([{ text: '❌ Отмена', callback_data: 'admin_back' }]);
        
        safeEditMessageText(chatId, messageId, message, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        });

      }
      
      if (data.startsWith('admin_select_race_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав' });
        }
        
        const state = adminState.get(userId);
        if (!state || !state.targetUserId) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Сессия истекла' });
        }
        
        const raceId = parseInt(data.replace('admin_select_race_', ''));
        
        db.get(`SELECT * FROM races WHERE id = ?`, [raceId], (err, race) => {
          if (err || !race) {
            return bot.answerCallbackQuery(query.id, { text: '❌ Раса не найдена' });
          }
          
          // Выдаем расу игроку
          db.run(`UPDATE players SET race_id = ? WHERE user_id = ?`, 
            [raceId, state.targetUserId], (err) => {
              if (err) {
                console.error('Ошибка выдачи расы:', err);
                return bot.sendMessage(userId, '❌ Ошибка выдачи расы');
              }
              
              const rarityIcon = config.RARITY[race.rarity]?.color || '⚪️';
              
              bot.sendMessage(userId, 
                `✅ Раса выдана!\n\n` +
                `👤 Игрок: ${state.targetUsername}\n` +
                `🧬 Раса: ${rarityIcon} ${race.name}`
              );
              
              bot.sendMessage(state.targetUserId, 
                `🎁 Вам выдана раса!\n\n` +
                `${rarityIcon} *${race.name}*\n` +
                `⭐ ${config.RARITY[race.rarity].name}\n\n` +
                `⚡ Сила: ${race.base_power}\n` +
                `❤️ Здоровье: ${race.base_hp}\n` +
                `🗡️ Атака: ${race.base_attack}\n` +
                `🛡️ Защита: ${race.base_defense}\n\n` +
                `🎯 ${race.special_ability}`,
                { parse_mode: 'Markdown' }
              );
              
              // Логируем
              sendLogMessage(
                `👑 Админ выдал расу\n` +
                `👤 Админ: ${userId} (@${query.from.username})\n` +
                `🎯 Получатель: ${state.targetUserId} (@${state.targetUsername})\n` +
                `🧬 Раса: ${rarityIcon} ${race.name} (${config.RARITY[race.rarity].name})`,
                'ADMIN'
              );
              
              adminState.delete(userId);
            });
        });

      }
      
      // Обработчики редактирования предметов
      if (data.startsWith('edit_item_name_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав' });
        }
        
        const itemId = parseInt(data.replace('edit_item_name_', ''));
        adminState.set(userId, { action: 'edit_item_name', itemId: itemId });
        
        bot.sendMessage(userId, 
          '📝 *Изменение названия предмета*\n\n' +
          'Введите новое название предмета:',
          { parse_mode: 'Markdown' }
        );

      }
      
      if (data.startsWith('edit_item_rarity_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав' });
        }
        
        const itemId = parseInt(data.replace('edit_item_rarity_', ''));
        adminState.set(userId, { action: 'edit_item_rarity', itemId: itemId });
        
        bot.sendMessage(userId, 
          '🎨 *Изменение редкости предмета*\n\n' +
          'Выберите новую редкость:\n\n' +
          '1 - ⚪️ Обычный (COMMON)\n' +
          '2 - 🔵 Редкий (RARE)\n' +
          '3 - 🟣 Эпический (EPIC)\n' +
          '4 - 🔴 Мистический (MYTHIC)\n' +
          '5 - 🟡 Легендарный (LEGENDARY)\n' +
          '6 - ⚫️ Секретный (SECRET)\n\n' +
          'Введите номер (1-6):',
          { parse_mode: 'Markdown' }
        );

      }
      
      if (data.startsWith('delete_item_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав' });
        }
        
        const itemId = parseInt(data.replace('delete_item_', ''));
        
        db.get(`SELECT name FROM items WHERE id = ?`, [itemId], (err, item) => {
          if (err || !item) {
            return bot.sendMessage(userId, '❌ Предмет не найден');
          }
          
          bot.sendMessage(userId, 
            `⚠️ *ВНИМАНИЕ!*\n\n` +
            `Вы уверены что хотите удалить предмет "${item.name}"?\n\n` +
            `Это действие необратимо!`,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '✅ Да, удалить', callback_data: `confirm_delete_item_${itemId}` },
                    { text: '❌ Отмена', callback_data: 'admin_list_items' }
                  ]
                ]
              }
            }
          );
        });

      }
      
      if (data.startsWith('confirm_delete_item_')) {
        if (query.from.username !== config.ADMIN_USERNAME) {
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав' });
        }
        
        const itemId = parseInt(data.replace('confirm_delete_item_', ''));
        
        db.run(`DELETE FROM items WHERE id = ?`, [itemId], (err) => {
          if (err) {
            return bot.sendMessage(userId, '❌ Ошибка удаления предмета');
          }
          
          bot.sendMessage(userId, '✅ Предмет успешно удален');
        });

      }
      
      // Обработка экипировки предметов
      if (data.startsWith('equip_')) {
        const inventoryId = parseInt(data.split('_')[1]);
        
        // Получаем детальную информацию о предмете
        db.get(`SELECT inv.id as inv_id, inv.equipped, i.* FROM inventory inv
                JOIN items i ON inv.item_id = i.id
                WHERE inv.id = ? AND inv.player_id = ?`, [inventoryId, userId], (err, item) => {
          if (err || !item) {
            return bot.answerCallbackQuery(query.id, { text: '❌ Предмет не найден' });
          }
          
          const rarityConfig = config.RARITY[item.rarity];
          const rarityIcon = rarityConfig ? rarityConfig.color : '⚪️';
          const rarityName = rarityConfig ? rarityConfig.name : 'Обычный';
          const equipped = item.equipped ? '✅ Экипирован' : '⚪️ Не экипирован';
          
          const slotNames = {
            helmet: '🪖 Шлем',
            chest: '🛡️ Нагрудник',
            legs: '👖 Поножи',
            boots: '👢 Сапоги',
            weapon: '⚔️ Оружие',
            shield: '🛡️ Щит',
            artifact_1: '💎 Артефакт',
            artifact_2: '💎 Артефакт',
            accessory: '🎒 Аксессуар'
          };
          
          let message = `📋 *Информация о предмете*\n\n`;
          message += `${rarityIcon} *${item.name}*\n`;
          message += `${rarityName} ${slotNames[item.slot] || item.slot}\n`;
          message += `${equipped}\n\n`;
          
          if (item.description) {
            message += `📝 ${item.description}\n\n`;
          }
          
          message += `⚡ Характеристики:\n`;
          if (item.power_bonus > 0) message += `⚡ Сила: +${item.power_bonus}\n`;
          if (item.hp_bonus > 0) message += `❤️ Здоровье: +${item.hp_bonus}\n`;
          if (item.attack_bonus > 0) message += `🗡️ Атака: +${item.attack_bonus}\n`;
          if (item.defense_bonus > 0) message += `🛡️ Защита: +${item.defense_bonus}\n`;
          
          if (item.special_effect) {
            message += `\n✨ Особый эффект: ${item.special_effect}`;
          }
          
          // Рассчитываем цену продажи (50% от базовой стоимости по редкости)
          const rarityPrices = {
            'COMMON': 50,
            'RARE': 150,
            'EPIC': 400,
            'MYTHIC': 1000,
            'LEGENDARY': 2500,
            'SECRET': 5000
          };
          const sellPrice = Math.floor((rarityPrices[item.rarity] || 50) * 0.5);
          
          const buttons = [];
          
          if (!item.equipped) {
            buttons.push([{ text: '✅ Экипировать', callback_data: `do_equip_${inventoryId}` }]);
          } else {
            buttons.push([{ text: '❌ Снять', callback_data: `unequip_${inventoryId}` }]);
          }
          
          buttons.push([{ text: `💰 Продать за ${sellPrice} золота`, callback_data: `sell_item_${inventoryId}` }]);
          buttons.push([{ text: '🔙 К предметам', callback_data: 'all_items' }]);
          
          safeEditMessageText(chatId, messageId, message, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: buttons }
          });
        });
      }
      
      // Обработка экипировки предмета (подтверждение)
      if (data.startsWith('do_equip_')) {
        const inventoryId = parseInt(data.split('_')[2]);
        
        items.equipItem(userId, inventoryId, (err) => {
          if (err) {
            return bot.answerCallbackQuery(query.id, { text: `❌ ${err.message}` });
          }
          
          bot.answerCallbackQuery(query.id, { text: '✅ Предмет экипирован!' });
          
          // Возвращаемся к детальному виду предмета
          bot.emit('callback_query', { ...query, data: `equip_${inventoryId}` });
        });
      }
      
      // Обработка снятия предмета
      if (data.startsWith('unequip_')) {
        const inventoryId = parseInt(data.split('_')[1]);
        
        db.run(`UPDATE inventory SET equipped = 0 WHERE id = ? AND player_id = ?`,
          [inventoryId, userId], (err) => {
            if (err) {
              return bot.answerCallbackQuery(query.id, { text: '❌ Ошибка снятия предмета' });
            }
            
            bot.answerCallbackQuery(query.id, { text: '✅ Предмет снят!' });
            
            // Возвращаемся к детальному виду предмета
            bot.emit('callback_query', { ...query, data: `equip_${inventoryId}` });
          });
      }
      
      // Обработка продажи предмета (показываем подтверждение)
      if (data.startsWith('sell_item_')) {
        const inventoryId = parseInt(data.split('_')[2]);
        
        // Получаем информацию о предмете
        db.get(`SELECT inv.id as inv_id, inv.equipped, i.* FROM inventory inv
                JOIN items i ON inv.item_id = i.id
                WHERE inv.id = ? AND inv.player_id = ?`, [inventoryId, userId], (err, item) => {
          if (err || !item) {
            return bot.answerCallbackQuery(query.id, { text: '❌ Предмет не найден' });
          }
          
          if (item.equipped) {
            return bot.answerCallbackQuery(query.id, { 
              text: '❌ Сначала снимите предмет!',
              show_alert: true
            });
          }
          
          // Рассчитываем цену продажи
          const rarityPrices = {
            'COMMON': 50,
            'RARE': 150,
            'EPIC': 400,
            'MYTHIC': 1000,
            'LEGENDARY': 2500,
            'SECRET': 5000
          };
          const sellPrice = Math.floor((rarityPrices[item.rarity] || 50) * 0.5);
          
          const rarityIcon = config.RARITY[item.rarity].color;
          
          safeEditMessageText(chatId, messageId,
            `💰 *Продать предмет?*\n\n` +
            `${rarityIcon} ${item.name}\n\n` +
            `💵 Вы получите: ${sellPrice} золота\n\n` +
            `⚠️ Это действие нельзя отменить!`,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: `✅ Продать за ${sellPrice}💰`, callback_data: `confirm_sell_${inventoryId}` }],
                  [{ text: '❌ Отмена', callback_data: `equip_${inventoryId}` }]
                ]
              }
            }
          );
        });
      }
      
      // Подтверждение продажи предмета
      if (data.startsWith('confirm_sell_')) {
        const inventoryId = parseInt(data.split('_')[2]);
        
        // Получаем информацию о предмете
        db.get(`SELECT inv.id as inv_id, inv.equipped, i.* FROM inventory inv
                JOIN items i ON inv.item_id = i.id
                WHERE inv.id = ? AND inv.player_id = ?`, [inventoryId, userId], (err, item) => {
          if (err || !item) {
            return bot.answerCallbackQuery(query.id, { text: '❌ Предмет не найден' });
          }
          
          if (item.equipped) {
            return bot.answerCallbackQuery(query.id, { 
              text: '❌ Сначала снимите предмет!',
              show_alert: true
            });
          }
          
          // Рассчитываем цену продажи
          const rarityPrices = {
            'COMMON': 50,
            'RARE': 150,
            'EPIC': 400,
            'MYTHIC': 1000,
            'LEGENDARY': 2500,
            'SECRET': 5000
          };
          const sellPrice = Math.floor((rarityPrices[item.rarity] || 50) * 0.5);
          
          // Удаляем предмет и добавляем золото
          db.run(`DELETE FROM inventory WHERE id = ? AND player_id = ?`, [inventoryId, userId], (err) => {
            if (err) {
              return bot.answerCallbackQuery(query.id, { text: '❌ Ошибка продажи' });
            }
            
            db.run(`UPDATE players SET gold = gold + ? WHERE user_id = ?`, [sellPrice, userId], (err) => {
              if (err) {
                console.error('Ошибка добавления золота:', err);
              }
              
              bot.answerCallbackQuery(query.id, { text: '✅ Предмет продан!' });
              
              const rarityIcon = config.RARITY[item.rarity].color;
              
              bot.sendMessage(userId,
                `💰 *Предмет продан!*\n\n` +
                `${rarityIcon} ${item.name}\n\n` +
                `💵 Получено: ${sellPrice} золота`,
                { parse_mode: 'Markdown', ...getMainMenu(true) }
              );
              
              // Логируем продажу предмета
              sendLogMessage(
                `💰 Предмет продан\n` +
                `👤 Игрок: ${userId}\n` +
                `${rarityIcon} Предмет: ${item.name}\n` +
                `💵 Цена: ${sellPrice} золота`,
                'GOLD'
              );
            });
          });
        });
      }
      
      // Обработка покупки зелья
      if (data.startsWith('buy_potion_')) {
        const potionId = parseInt(data.split('_')[2]);
        
        potions.getPotionById(potionId, (err, potion) => {
          if (err || !potion) {
            return bot.answerCallbackQuery(query.id, { text: '❌ Зелье не найдено' });
          }
          
          getOrCreatePlayer(userId, query.from.username, (err, player) => {
            if (err) return;
            
            safeEditMessageText(chatId, messageId,
              `🧪 *Купить зелье?*\n\n` +
              `${potion.name}\n` +
              `📝 ${potion.description}\n\n` +
              `💰 Цена: ${potion.price} золота\n` +
              `💵 Ваше золото: ${player.gold}\n\n` +
              `Сколько купить?`,
              {
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '1 шт', callback_data: `confirm_buy_potion_${potionId}_1` },
                      { text: '5 шт', callback_data: `confirm_buy_potion_${potionId}_5` }
                    ],
                    [
                      { text: '10 шт', callback_data: `confirm_buy_potion_${potionId}_10` },
                      { text: '20 шт', callback_data: `confirm_buy_potion_${potionId}_20` }
                    ],
                    [{ text: '❌ Отмена', callback_data: 'shop_potions' }]
                  ]
                }
              }
            );
          });
        });
      }
      
      // Подтверждение покупки зелья
      if (data.startsWith('confirm_buy_potion_')) {
        const parts = data.split('_');
        const potionId = parseInt(parts[3]);
        const quantity = parseInt(parts[4]);
        
        potions.buyPotion(userId, potionId, quantity, (err, result) => {
          if (err) {
            return bot.answerCallbackQuery(query.id, { 
              text: `❌ ${err.message}`,
              show_alert: true
            });
          }
          
          bot.answerCallbackQuery(query.id, { text: '✅ Зелье куплено!' });
          
          bot.sendMessage(userId,
            `🧪 *Зелье куплено!*\n\n` +
            `${result.potion.name} x${result.quantity}\n\n` +
            `💰 Потрачено: ${result.totalCost} золота\n\n` +
            `💡 Экипируйте зелье в инвентаре чтобы использовать в бою!`,
            { parse_mode: 'Markdown', ...getMainMenu(true) }
          );
        });
      }
      
      // Просмотр зелья
      if (data.startsWith('view_potion_')) {
        const potionId = parseInt(data.split('_')[2]);
        
        getOrCreatePlayer(userId, query.from.username, (err, player) => {
          if (err) return;
          
          potions.getPotionById(potionId, (err, potion) => {
            if (err || !potion) {
              return bot.answerCallbackQuery(query.id, { text: '❌ Зелье не найдено' });
            }
            
            potions.getPotionQuantity(userId, potionId, (err, quantity) => {
              if (err) quantity = 0;
              
              const equipped = player.equipped_potion_id === potionId ? '✅ Экипировано' : '⚪️ Не экипировано';
              
              let message = `🧪 *${potion.name}*\n\n`;
              message += `${equipped}\n\n`;
              message += `📝 ${potion.description}\n`;
              message += `💚 Восстанавливает ${potion.heal_amount}% HP\n\n`;
              message += `📦 В наличии: ${quantity} шт\n`;
              message += `💰 Цена: ${potion.price} золота\n\n`;
              message += `💡 Используется в бою кнопкой "🧪 Зелье"`;
              
              const buttons = [];
              
              if (player.equipped_potion_id === potionId) {
                buttons.push([{ text: '❌ Снять', callback_data: `unequip_potion` }]);
              } else {
                buttons.push([{ text: '✅ Экипировать', callback_data: `equip_potion_${potionId}` }]);
              }
              
              buttons.push([{ text: '🛒 Купить еще', callback_data: `buy_potion_${potionId}` }]);
              buttons.push([{ text: '🔙 К зельям', callback_data: 'potions_inventory' }]);
              
              safeEditMessageText(chatId, messageId, message, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: buttons }
              });
            });
          });
        });
      }
      
      // Экипировать зелье
      if (data.startsWith('equip_potion_')) {
        const potionId = parseInt(data.split('_')[2]);
        
        potions.equipPotion(userId, potionId, (err) => {
          if (err) {
            return bot.answerCallbackQuery(query.id, { 
              text: `❌ ${err.message}`,
              show_alert: true
            });
          }
          
          bot.answerCallbackQuery(query.id, { text: '✅ Зелье экипировано!' });
          
          // Возвращаемся к просмотру зелья
          bot.emit('callback_query', { ...query, data: `view_potion_${potionId}` });
        });
      }
      
      // Снять зелье
      if (data.startsWith('unequip_potion')) {
        potions.unequipPotion(userId, (err) => {
          if (err) {
            return bot.answerCallbackQuery(query.id, { text: '❌ Ошибка' });
          }
          
          bot.answerCallbackQuery(query.id, { text: '✅ Зелье снято!' });
          
          // Возвращаемся к инвентарю зелий
          bot.emit('callback_query', { ...query, data: 'potions_inventory' });
        });
      }
      
      // ========== ОБРАБОТЧИКИ КЛАНОВ ==========
      
      // Навигация по кланам
      if (data.startsWith('clan_page_')) {
        const pageIndex = parseInt(data.replace('clan_page_', ''));
        
        clanManagement.getAvailableClans(50, (err, clans) => {
          if (err || !clans || clans.length === 0) {
            return bot.answerCallbackQuery(query.id, { text: '❌ Ошибка загрузки кланов' });
          }
          
          showClanCard(chatId, messageId, clans, pageIndex, userId);
        });

      }
      
      // Навигация по расам
      if (data.startsWith('race_page_')) {
        const pageIndex = parseInt(data.replace('race_page_', ''));
        
        db.all(`SELECT * FROM races ORDER BY rarity DESC, name ASC`, (err, races) => {
          if (err || !races || races.length === 0) {
            return bot.answerCallbackQuery(query.id, { text: '❌ Ошибка загрузки рас' });
          }
          
          showRaceCard(chatId, messageId, races, pageIndex, userId);
        });

      }
      
      // Обработчик недоступного рейда
      if (data === 'raid_not_ready') {
        bot.answerCallbackQuery(query.id, { 
          text: '⏰ Рейд пока недоступен. Дождитесь окончания кулдауна!', 
          show_alert: true 
        });
        return;
      }
      
      // Навигация по рейд-боссам
      if (data.startsWith('raid_boss_page_')) {
        const pageIndex = parseInt(data.replace('raid_boss_page_', ''));
        showRaidBossSelection(chatId, messageId, pageIndex, userId, query.from.username);
      }
      
      // Вступление в клан / подача заявки
      if (data.startsWith('clan_join_')) {
        const clanId = parseInt(data.replace('clan_join_', ''));
        
        clanManagement.sendJoinRequest(userId, clanId, (err, result) => {
          if (err) {
            return bot.answerCallbackQuery(query.id, { 
              text: `❌ ${err.message}`,
              show_alert: true
            });
          }
          
          if (result.type === 'joined') {
            bot.answerCallbackQuery(query.id, { 
              text: '✅ Вы вступили в клан!',
              show_alert: true
            });
            
            // Обновляем отображение
            bot.deleteMessage(chatId, messageId).catch(() => {});
            bot.sendMessage(chatId, 
              '🎉 Поздравляем!\n\n' +
              'Вы успешно вступили в клан!\n' +
              'Используйте меню "🏰 Мой клан" для управления.',
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '🏰 Мой клан', callback_data: 'clan' }],
                    [{ text: '🔙 Назад', callback_data: 'rating_menu' }]
                  ]
                }
              }
            );
          } else if (result.type === 'request_sent') {
            bot.answerCallbackQuery(query.id, { 
              text: '✅ Заявка отправлена!',
              show_alert: true
            });
            
            bot.deleteMessage(chatId, messageId).catch(() => {});
            bot.sendMessage(chatId, 
              '📝 Заявка отправлена!\n\n' +
              'Ожидайте решения лидера клана.',
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '🔙 Назад', callback_data: 'rating_menu' }]
                  ]
                }
              }
            );
          }
        });

      }
      
      // Настройки клана (только для лидера)
      if (data === 'clan_settings') {
        getOrCreatePlayer(userId, query.from.username, (err, player) => {
          if (err || !player.clan_id) {
            return bot.answerCallbackQuery(query.id, { text: '❌ Вы не в клане' });
          }
          
          clanManagement.getClanInfo(player.clan_id, (err, clan) => {
            if (err || !clan) {
              return bot.answerCallbackQuery(query.id, { text: '❌ Ошибка загрузки клана' });
            }
            
            if (clan.leader_id !== userId) {
              return bot.answerCallbackQuery(query.id, { 
                text: '❌ Только лидер может изменять настройки',
                show_alert: true
              });
            }
            
            const joinTypeIcon = clan.join_type === 'open' ? '🔓' : '🔒';
            const joinTypeText = clan.join_type === 'open' ? 'Открытый' : 'По заявкам';
            
            let message = `⚙️ Настройки клана\n\n`;
            message += `🏰 ${clan.name}\n`;
            message += `📝 Описание: ${clan.description || 'Не установлено'}\n`;
            message += `${joinTypeIcon} Тип: ${joinTypeText}\n`;
            message += `👥 Лимит: ${clan.max_members || 20}\n`;
            message += `🖼️ Аватар: ${clan.avatar_file_id ? 'Установлен' : 'Не установлен'}\n`;
            
            const buttons = [
              [{ text: '📝 Изменить описание', callback_data: 'clan_set_description' }],
              [{ text: `${joinTypeIcon} Изменить тип вступления`, callback_data: 'clan_change_join_type' }],
              [{ text: '👥 Изменить лимит участников', callback_data: 'clan_change_max_members' }],
              [{ text: '🖼️ Установить аватар', callback_data: 'clan_set_avatar' }],
              [{ text: '👢 Кикнуть игрока', callback_data: 'clan_kick_menu' }]
            ];
            
            if (clan.pending_requests > 0) {
              buttons.unshift([{ text: `📋 Заявки (${clan.pending_requests})`, callback_data: 'clan_view_requests' }]);
            }
            
            buttons.push([{ text: '🔙 Назад', callback_data: 'clan' }]);
            
            safeEditMessageText(chatId, messageId, message, {
              reply_markup: { inline_keyboard: buttons }
            });
          });
        });

      }
      
      // Просмотр заявок в клан
      if (data === 'clan_view_requests') {
        getOrCreatePlayer(userId, query.from.username, (err, player) => {
          if (err || !player.clan_id) {
            return bot.answerCallbackQuery(query.id, { text: '❌ Вы не в клане' });
          }
          
          db.get(`SELECT leader_id FROM clans WHERE id = ?`, [player.clan_id], (err, clan) => {
            if (err || !clan || clan.leader_id !== userId) {
              return bot.answerCallbackQuery(query.id, { 
                text: '❌ Только лидер может просматривать заявки',
                show_alert: true
              });
            }
            
            clanManagement.getClanRequests(player.clan_id, (err, requests) => {
              if (err || !requests || requests.length === 0) {
                return safeEditMessageText(chatId, messageId, '📋 Нет заявок', {
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: '🔙 Назад', callback_data: 'clan_settings' }]
                    ]
                  }
                });
              }
              
              let message = `📋 Заявки в клан (${requests.length})\n\n`;
              const buttons = [];
              
              requests.slice(0, 5).forEach((req, index) => {
                message += `${index + 1}. ${req.username}\n`;
                message += `   Ур. ${req.level} | ⚡ ${req.power}\n\n`;
                
                buttons.push([
                  { text: `✅ ${req.username}`, callback_data: `clan_accept_${req.id}` },
                  { text: `❌ Отклонить`, callback_data: `clan_reject_${req.id}` }
                ]);
              });
              
              buttons.push([{ text: '🔙 Назад', callback_data: 'clan_settings' }]);
              
              safeEditMessageText(chatId, messageId, message, {
                reply_markup: { inline_keyboard: buttons }
              });
            });
          });
        });

      }
      
      // Принять заявку
      if (data.startsWith('clan_accept_')) {
        const requestId = parseInt(data.replace('clan_accept_', ''));
        
        clanManagement.acceptRequest(requestId, (err, request) => {
          if (err) {
            return bot.answerCallbackQuery(query.id, { 
              text: `❌ ${err.message}`,
              show_alert: true
            });
          }
          
          bot.answerCallbackQuery(query.id, { text: '✅ Заявка принята!' });
          
          // Уведомляем игрока
          bot.sendMessage(request.player_id, 
            '🎉 Ваша заявка в клан принята!\n\n' +
            'Теперь вы можете использовать меню "🏰 Мой клан".'
          );
          
          // Обновляем список заявок
          bot.emit('callback_query', { ...query, data: 'clan_view_requests' });
        });

      }
      
      // Отклонить заявку
      if (data.startsWith('clan_reject_')) {
        const requestId = parseInt(data.replace('clan_reject_', ''));
        
        clanManagement.rejectRequest(requestId, (err) => {
          if (err) {
            return bot.answerCallbackQuery(query.id, { text: '❌ Ошибка' });
          }
          
          bot.answerCallbackQuery(query.id, { text: '✅ Заявка отклонена' });
          
          // Обновляем список заявок
          bot.emit('callback_query', { ...query, data: 'clan_view_requests' });
        });

      }
      
      // Изменить тип вступления
      if (data === 'clan_change_join_type') {
        getOrCreatePlayer(userId, query.from.username, (err, player) => {
          if (err || !player.clan_id) return;
          
          db.get(`SELECT leader_id, join_type FROM clans WHERE id = ?`, [player.clan_id], (err, clan) => {
            if (err || !clan || clan.leader_id !== userId) {
              return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав' });
            }
            
            const newType = clan.join_type === 'open' ? 'request' : 'open';
            
            clanManagement.changeJoinType(player.clan_id, newType, (err) => {
              if (err) {
                return bot.answerCallbackQuery(query.id, { text: '❌ Ошибка' });
              }
              
              const typeText = newType === 'open' ? '🔓 Открытый' : '🔒 По заявкам';
              bot.answerCallbackQuery(query.id, { 
                text: `✅ Тип изменен на: ${typeText}`,
                show_alert: true
              });
              
              // Обновляем настройки
              bot.emit('callback_query', { ...query, data: 'clan_settings' });
            });
          });
        });

      }
      
      // Изменить лимит участников
      if (data === 'clan_change_max_members') {
        getOrCreatePlayer(userId, query.from.username, (err, player) => {
          if (err || !player.clan_id) return;
          
          db.get(`SELECT leader_id FROM clans WHERE id = ?`, [player.clan_id], (err, clan) => {
            if (err || !clan || clan.leader_id !== userId) {
              return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав' });
            }
            
            adminState.set(userId, { action: 'clan_change_max_members', clanId: player.clan_id });
            
            bot.deleteMessage(chatId, messageId).catch(() => {});
            bot.sendMessage(chatId, 
              '👥 Изменение лимита участников\n\n' +
              'Введите новый лимит (от 5 до 100):',
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '❌ Отмена', callback_data: 'clan_settings' }]
                  ]
                }
              }
            );
          });
        });

      }
      
      // Установить аватар клана
      if (data === 'clan_set_avatar') {
        getOrCreatePlayer(userId, query.from.username, (err, player) => {
          if (err || !player.clan_id) return;
          
          db.get(`SELECT leader_id FROM clans WHERE id = ?`, [player.clan_id], (err, clan) => {
            if (err || !clan || clan.leader_id !== userId) {
              return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав' });
            }
            
            adminState.set(userId, { action: 'clan_set_avatar', clanId: player.clan_id });
            
            bot.deleteMessage(chatId, messageId).catch(() => {});
            bot.sendMessage(chatId, 
              '🖼️ Установка аватара клана\n\n' +
              'Отправьте изображение для аватара клана:',
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '❌ Отмена', callback_data: 'clan_settings' }]
                  ]
                }
              }
            );
          });
        });

      }
      
      // Установить описание клана
      if (data === 'clan_set_description') {
        getOrCreatePlayer(userId, query.from.username, (err, player) => {
          if (err || !player.clan_id) return;
          
          db.get(`SELECT leader_id FROM clans WHERE id = ?`, [player.clan_id], (err, clan) => {
            if (err || !clan || clan.leader_id !== userId) {
              return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав' });
            }
            
            adminState.set(userId, { action: 'clan_set_description', clanId: player.clan_id });
            console.log(`✅ Установлено состояние для userId=${userId}, action=clan_set_description, clanId=${player.clan_id}`);
            
            bot.deleteMessage(chatId, messageId).catch(() => {});
            bot.sendMessage(chatId, 
              '📝 Установка описания клана\n\n' +
              'Введите описание клана (до 200 символов):',
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '❌ Отмена', callback_data: 'clan_settings' }]
                  ]
                }
              }
            );
          });
        });

      }
      
      // Меню кика игроков
      if (data === 'clan_kick_menu') {
        getOrCreatePlayer(userId, query.from.username, (err, player) => {
          if (err || !player.clan_id) return;
          
          db.get(`SELECT leader_id FROM clans WHERE id = ?`, [player.clan_id], (err, clan) => {
            if (err || !clan || clan.leader_id !== userId) {
              return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав' });
            }
            
            db.all(`SELECT user_id, username, level, power FROM players WHERE clan_id = ? AND user_id != ?`,
              [player.clan_id, userId], (err, members) => {
                if (err || !members || members.length === 0) {
                  return safeEditMessageText(chatId, messageId, '👥 Нет участников для кика', {
                    reply_markup: {
                      inline_keyboard: [
                        [{ text: '🔙 Назад', callback_data: 'clan_settings' }]
                      ]
                    }
                  });
                }
                
                let message = '👢 Кикнуть игрока\n\n';
                message += 'Выберите игрока:\n\n';
                
                const buttons = [];
                
                members.slice(0, 10).forEach(member => {
                  message += `• ${member.username} (Ур. ${member.level})\n`;
                  buttons.push([
                    { text: `👢 ${member.username}`, callback_data: `clan_kick_confirm_${member.user_id}` }
                  ]);
                });
                
                buttons.push([{ text: '🔙 Назад', callback_data: 'clan_settings' }]);
                
                safeEditMessageText(chatId, messageId, message, {
                  reply_markup: { inline_keyboard: buttons }
                });
              });
          });
        });

      }
      
      // Подтверждение кика
      if (data.startsWith('clan_kick_confirm_')) {
        const targetUserId = parseInt(data.replace('clan_kick_confirm_', ''));
        
        getOrCreatePlayer(userId, query.from.username, (err, player) => {
          if (err || !player.clan_id) return;
          
          db.get(`SELECT leader_id FROM clans WHERE id = ?`, [player.clan_id], (err, clan) => {
            if (err || !clan || clan.leader_id !== userId) {
              return bot.answerCallbackQuery(query.id, { text: '❌ Нет прав' });
            }
            
            clanManagement.kickPlayer(player.clan_id, targetUserId, (err) => {
              if (err) {
                return bot.answerCallbackQuery(query.id, { 
                  text: `❌ ${err.message}`,
                  show_alert: true
                });
              }
              
              bot.answerCallbackQuery(query.id, { text: '✅ Игрок исключен' });
              
              // Уведомляем игрока
              bot.sendMessage(targetUserId, 
                '🚪 Вы были исключены из клана'
              );
              
              // Возвращаемся к настройкам
              bot.emit('callback_query', { ...query, data: 'clan_settings' });
            });
          });
        });
      }
  
  // Если callback не был отвечен, отвечаем пустым сообщением чтобы убрать loading
  try {
    await bot.answerCallbackQuery(query.id);
  } catch (error) {
    // Callback уже был отвечен, это нормально
    console.log('Callback уже отвечен или ошибка:', error.message);
  }
});


// VIP команды (только для админа)
bot.onText(/\/givevip (\d+)/, async (msg, match) => {
  const adminUsername = msg.from.username;
  
  if (adminUsername !== config.ADMIN_USERNAME) {
    return bot.sendMessage(msg.chat.id, '❌ Нет доступа');
  }
  
  const targetUserId = parseInt(match[1]);
  const vipDuration = 30 * 24 * 60 * 60; // 30 дней
  const vipUntil = Math.floor(Date.now() / 1000) + vipDuration;
  
  db.run(`UPDATE players SET is_vip = 1, vip_until = ?, crystals = crystals + ? WHERE user_id = ?`,
    [vipUntil, config.VIP_CRYSTAL_REWARD, targetUserId], function(err) {
      if (err || this.changes === 0) {
        return bot.sendMessage(msg.chat.id, '❌ Игрок не найден');
      }
      
      bot.sendMessage(msg.chat.id, `✅ VIP выдан игроку ${targetUserId}\n💎 +${config.VIP_CRYSTAL_REWARD} кристаллов`);
      bot.sendMessage(targetUserId, 
        `💎 VIP ПОДПИСКА АКТИВИРОВАНА!\n\n` +
        `✨ Вы получили:\n` +
        `• ${config.VIP_CRYSTAL_REWARD} кристаллов\n` +
        `• Возможность создавать кланы\n` +
        `• Кастомный ник в топе\n` +
        `• Значок 💎 в профиле\n\n` +
        `Срок: 30 дней`
      );
    });
});

bot.onText(/\/removevip (\d+)/, async (msg, match) => {
  const adminUsername = msg.from.username;
  
  if (adminUsername !== config.ADMIN_USERNAME) {
    return bot.sendMessage(msg.chat.id, '❌ Нет доступа');
  }
  
  const targetUserId = parseInt(match[1]);
  
  db.run(`UPDATE players SET is_vip = 0, vip_until = 0 WHERE user_id = ?`,
    [targetUserId], function(err) {
      if (err || this.changes === 0) {
        return bot.sendMessage(msg.chat.id, '❌ Игрок не найден');
      }
      
      bot.sendMessage(msg.chat.id, `✅ VIP удален у игрока ${targetUserId}`);
    });
});

bot.onText(/\/setnick (.+)/, async (msg, match) => {
  const userId = msg.from.id;
  const newNick = match[1].trim();
  
  // Проверяем подписку
  const isSubscribed = await requireSubscription(userId, msg.chat.id);
  if (!isSubscribed) return;
  
  if (newNick.length > 20) {
    return bot.sendMessage(userId, '❌ Ник слишком длинный (макс. 20 символов)');
  }
  
  db.get(`SELECT is_vip FROM players WHERE user_id = ?`, [userId], (err, player) => {
    if (!player || !player.is_vip) {
      return bot.sendMessage(userId, 
        `❌ Эта функция доступна только VIP\n\n` +
        `💎 Для оформления VIP напишите @${config.ADMIN_USERNAME}`
      );
    }
    
    db.run(`UPDATE players SET display_name = ? WHERE user_id = ?`, [newNick, userId], () => {
      bot.sendMessage(userId, `✅ Ваш ник изменен на: ${newNick}`);
    });
  });
});

// Админская команда для тестирования канала
bot.onText(/\/testchannel/, async (msg) => {
  const adminUsername = msg.from.username;
  
  if (adminUsername !== config.ADMIN_USERNAME) {
    return bot.sendMessage(msg.chat.id, '❌ Нет доступа');
  }
  
  bot.sendMessage(msg.chat.id, '🔍 Тестирую доступ к каналу...');
  
  const isAccessible = await testChannelAccess();
  
  if (isAccessible) {
    bot.sendMessage(msg.chat.id, 
      `✅ Канал ${config.REQUIRED_CHANNEL} доступен!\n\n` +
      `Можно включить проверку подписки.`
    );
  } else {
    bot.sendMessage(msg.chat.id, 
      `❌ Канал ${config.REQUIRED_CHANNEL} недоступен!\n\n` +
      `📋 Что нужно сделать:\n` +
      `1. Убедитесь что канал существует\n` +
      `2. Добавьте бота в канал как администратора\n` +
      `3. Дайте боту права на просмотр участников\n\n` +
      `После этого используйте /enablesubcheck для включения проверки.`
    );
  }
});

// Команда для включения проверки подписки
bot.onText(/\/enablesubcheck/, async (msg) => {
  const adminUsername = msg.from.username;
  
  if (adminUsername !== config.ADMIN_USERNAME) {
    return bot.sendMessage(msg.chat.id, '❌ Нет доступа');
  }
  
  bot.sendMessage(msg.chat.id, 
    `⚠️ Для включения проверки подписки:\n\n` +
    `1. Откройте файл bot.js\n` +
    `2. Найдите функцию checkSubscription\n` +
    `3. Раскомментируйте оригинальный код\n` +
    `4. Перезапустите бота\n\n` +
    `Или обратитесь к разработчику.`
  );
});

// Команда для проверки размеров изображений
bot.onText(/\/checkimages/, async (msg) => {
  const adminUsername = msg.from.username;
  
  if (adminUsername !== config.ADMIN_USERNAME) {
    return bot.sendMessage(msg.chat.id, '❌ Нет доступа');
  }
  
  bot.sendMessage(msg.chat.id, '🔍 Проверяю размеры изображений...');
  
  const imagesToCheck = [
    'main_menu.jpg',
    'race_gacha.jpg',
    'battle_menu.jpg',
    'inventory.jpg',
    'upgrade_menu.jpg',
    'rating_menu.jpg',
    'rewards_menu.jpg',
    'clan_menu.jpg',
    'daily_reward.jpg',
    'races/human.jpg',
    'races/elf.jpg',
    'races/dwarf.jpg',
    'races/orc.jpg',
    'races/angel.jpg'
  ];
  
  let report = '📊 Отчёт о размерах изображений:\n\n';
  let totalSize = 0;
  let problemFiles = 0;
  
  imagesToCheck.forEach(imagePath => {
    const info = checkImageSize(imagePath);
    if (info.exists) {
      const status = info.tooLarge ? '❌' : '✅';
      report += `${status} ${imagePath}: ${info.sizeMB}MB\n`;
      totalSize += parseFloat(info.sizeMB);
      if (info.tooLarge) problemFiles++;
    } else {
      report += `❓ ${imagePath}: не найдено\n`;
    }
  });
  
  report += `\n📈 Общий размер: ${totalSize.toFixed(2)}MB`;
  report += `\n⚠️ Проблемных файлов: ${problemFiles}`;
  
  if (problemFiles > 0) {
    report += `\n\n💡 Рекомендация: Сожмите изображения до <2MB каждое`;
  }
  
  bot.sendMessage(msg.chat.id, report);
});

// Обработка всех сообщений для проверки подписки
bot.on('message', async (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  
  // Пропускаем команды (они обрабатываются отдельно)
  if (msg.text && msg.text.startsWith('/')) return;
  
  // Пропускаем если у пользователя есть активное состояние (ввод данных)
  if (adminState.has(userId)) return;
  
  // Пропускаем фото (обрабатываются отдельно)
  if (msg.photo) return;
  
  // Проверяем подписку для всех остальных сообщений
  const isSubscribed = await requireSubscription(userId, chatId);
  if (!isSubscribed) return;
  
  // Если подписан, отправляем в главное меню
  bot.sendMessage(chatId, 
    '🎮 Используйте /menu для открытия главного меню или нажмите кнопки ниже:',
    getMainMenu(true)
  );
});


// Команда для тестирования реферальной системы
bot.onText(/\/testreferral/, async (msg) => {
  const adminUsername = msg.from.username;
  
  if (adminUsername !== config.ADMIN_USERNAME) {
    return bot.sendMessage(msg.chat.id, '❌ Нет доступа');
  }
  
  const userId = msg.from.id;
  
  bot.sendMessage(msg.chat.id, '🔍 Тестирую реферальную систему...');
  
  // Проверяем структуру базы данных
  db.get(`PRAGMA table_info(players)`, (err, result) => {
    if (err) {
      return bot.sendMessage(msg.chat.id, `❌ Ошибка проверки БД: ${err.message}`);
    }
    
    // Получаем все колонки
    db.all(`PRAGMA table_info(players)`, (err, columns) => {
      if (err) {
        return bot.sendMessage(msg.chat.id, `❌ Ошибка получения колонок: ${err.message}`);
      }
      
      const hasReferrerId = columns.some(col => col.name === 'referrer_id');
      const hasReferralCount = columns.some(col => col.name === 'referral_count');
      const hasReferralRewarded = columns.some(col => col.name === 'referral_rewarded');
      
      let message = `📊 *Проверка реферальной системы:*\n\n`;
      message += `🗃️ *База данных:*\n`;
      message += `${hasReferrerId ? '✅' : '❌'} referrer_id\n`;
      message += `${hasReferralCount ? '✅' : '❌'} referral_count\n`;
      message += `${hasReferralRewarded ? '✅' : '❌'} referral_rewarded\n\n`;
      
      // Проверяем текущего пользователя
      db.get(`SELECT referrer_id, referral_count, referral_rewarded FROM players WHERE user_id = ?`, [userId], (err, player) => {
        if (err) {
          message += `❌ Ошибка получения данных игрока: ${err.message}`;
        } else if (player) {
          message += `👤 *Ваши данные:*\n`;
          message += `🔗 Реферер: ${player.referrer_id || 'нет'}\n`;
          message += `👥 Приглашено: ${player.referral_count || 0}\n`;
          message += `🎁 Награжден: ${player.referral_rewarded ? 'да' : 'нет'}\n\n`;
        } else {
          message += `❌ Игрок не найден в БД\n\n`;
        }
        
        // Получаем имя бота для ссылки
        bot.getMe().then(botInfo => {
          message += `🔗 *Тестовая ссылка:*\n`;
          message += `\`https://t.me/${botInfo.username}?start=${userId}\`\n\n`;
          message += `💡 *Как тестировать:*\n`;
          message += `1. Скопируйте ссылку выше\n`;
          message += `2. Отправьте другу (или используйте другой аккаунт)\n`;
          message += `3. Друг должен перейти по ссылке и нажать /start\n`;
          message += `4. Проверьте логи в консоли\n`;
          message += `5. Проверьте что вы получили +1 кристалл`;
          
          bot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
        }).catch(err => {
          message += `❌ Ошибка получения имени бота: ${err.message}`;
          bot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
        });
      });
    });
  });
});
