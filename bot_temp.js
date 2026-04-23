const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const db = require('./database');
const races = require('./races');
const items = require('./items');
const quests = require('./quests');
const achievements = require('./achievements');
const clans = require('./clans');
const duels = require('./duels');
const skillTree = require('./skill_tree');

const bot = new TelegramBot(config.BOT_TOKEN, { polling: true });

// Обработка ошибок polling
bot.on('polling_error', (error) => {
  console.log('Polling error:', error.message);
  
  // Если конфликт с другим ботом
  if (error.message.includes('409 Conflict')) {
    console.log('Обнаружен конфликт с другим экземпляром бота.');
    console.log('Остановка текущего экземпляра...');
    
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
skillTree.initializeSkillTree();

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
        
        db.get(`SELECT * FROM players WHERE user_id = ?`, [userId], callback);
      });
  });
}

// Проверка кулдауна
function checkCooldown(lastTime, cooldownSeconds) {
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
    
    return { ready: false, remaining: timeStr };
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
          { text: '🎁 Найти предмет', callback_data: 'loot' }
        ],
        [
          { text: '🎯 Квесты', callback_data: 'quests' }
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
          { text: '🎰 Крутить расу', callback_data: 'roll_race' }
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
          { text: '🌳 Древо навыков', callback_data: 'skill_tree' }
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
    if (!isLeader) {
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

// Команды бота
bot.onText(/\/start/, async (msg) => {
  const userId = msg.from.id;
  const username = msg.from.username || msg.from.first_name;
  
  // Проверяем подписку
  const isSubscribed = await requireSubscription(userId, msg.chat.id);
  if (!isSubscribed) return;
  
  getOrCreatePlayer(userId, username, (err, player) => {
    if (err) {
      return bot.sendMessage(userId, '❌ Ошибка');
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
      
      message += `${medal} ${player.username}\n`;
      message += `   ${rarityIcon} ${player.race_name || 'Без расы'} | Ур.${player.level} | ⚡${player.power}\n`;
      message += `   🏆 ${player.wins}W/${player.losses}L\n\n`;
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
      `👑 Вы стали лидером клана\n` +
      `💰 Потрачено: ${config.CLAN_CREATE_COST} золота`,
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


// Обработка callback кнопок
bot.on('callback_query', async (query) => {
  const userId = query.from.id;
  const data = query.data;
  const messageId = query.message.message_id;
  const chatId = query.message.chat.id;
  
  // Подтверждаем нажатие кнопки
  bot.answerCallbackQuery(query.id);
  
  // Специальная обработка для проверки подписки
  if (data === 'check_subscription') {
    const isSubscribed = await checkSubscription(userId);
    
    if (isSubscribed) {
      bot.answerCallbackQuery(query.id, { text: '✅ Подписка подтверждена!' });
      
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
      bot.answerCallbackQuery(query.id, { 
        text: '❌ Вы не подписаны на канал!', 
        show_alert: true 
      });
    }
    return;
  }
  
  // Проверяем подписку для всех остальных действий
  const isSubscribed = await requireSubscription(userId, chatId);
  if (!isSubscribed) return;
  
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
        const canRollGold = player.gold >= config.RACE_ROLL_GOLD_COST;
        
        const buttons = [];
        
        if (canRollCrystal) {
          buttons.push([{
            text: `💎 ${config.RACE_ROLL_CRYSTAL_COST} кристаллов`,
            callback_data: 'roll_crystal'
          }]);
        }
        
        if (canRollGold) {
          buttons.push([{
            text: `💰 ${config.RACE_ROLL_GOLD_COST} золота`,
            callback_data: 'roll_gold'
          }]);
        }
        
        if (!canRollCrystal && !canRollGold) {
          buttons.push([{
            text: '💼 Заработать',
            callback_data: 'work'
          }]);
        }
        
        buttons.push([{ text: '🔙 Назад', callback_data: 'main_menu' }]);
        
        editImageWithText(chatId, messageId, 'race_gacha.jpg',
          `🎰 Крутка рас\n\n` +
          `💎 ${player.crystals} | 💰 ${player.gold}\n\n` +
          `⚪️ 60% | 🔵 25% | 🟣 10%\n` +
          `🔴 4% | 🟡 0.9% | ⚫️ 0.1%`,
          {
            reply_markup: { inline_keyboard: buttons }
          }
        );
      });
      break;
      
    case 'roll_crystal':
    case 'roll_gold':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err) return bot.sendMessage(userId, '❌ Ошибка');
        
        const useCrystal = data === 'roll_crystal';
        const cost = useCrystal ? config.RACE_ROLL_CRYSTAL_COST : config.RACE_ROLL_GOLD_COST;
        const currency = useCrystal ? 'crystals' : 'gold';
        const currencyIcon = useCrystal ? '💎' : '💰';
        
        if ((useCrystal && player.crystals < cost) || (!useCrystal && player.gold < cost)) {
          return bot.answerCallbackQuery(query.id, { 
            text: `❌ Недостаточно ${useCrystal ? 'кристаллов' : 'золота'}!`, 
            show_alert: true 
          });
        }
        
        races.getRandomRace((err, race) => {
          if (err) return bot.sendMessage(userId, '❌ Ошибка');
          
          const rarityIcon = config.RARITY[race.rarity].color;
          
          // Списываем валюту и обновляем расу (или добавляем в коллекцию)
          db.run(`UPDATE players SET ${currency} = ${currency} - ?, race_id = ?, power = ?, total_rolls = total_rolls + 1 WHERE user_id = ?`,
            [cost, race.id, race.base_power, userId], () => {
              
              const raceImage = getRaceImageName(race.name);
              
              sendImageWithText(userId, `races/${raceImage}`,
                `✨ НОВАЯ РАСА ✨\n\n` +
                `${rarityIcon} *${race.name}*\n` +
                `${config.RARITY[race.rarity].name}\n\n` +
                `⚡ ${race.base_power} | ❤️ ${race.base_hp}\n` +
                `🗡️ ${race.base_attack} | 🛡️ ${race.base_defense}\n\n` +
                `🎯 ${race.special_ability}`,
                {  ...getMainMenu(true) }
              );
              
              // Проверяем достижения
              achievements.checkAchievements(userId, (err, newAchs) => {
                if (newAchs && newAchs.length > 0) {
                  newAchs.forEach(ach => {
                    bot.sendMessage(userId, 
                      `${ach.icon} Достижение: ${ach.name}\n💰 +${ach.reward_gold} золота`);
                  });
                }
              });
            });
        });
      });
      break;
      
    case 'battle_menu':
      editImageWithText(chatId, messageId, 'battle_menu.jpg',
        '⚔️ *Битвы*\n\n' +
        'Выберите действие:',
        {
          
          ...getBattleMenu()
        }
      );
      break;
      
    case 'rating_menu':
      editImageWithText(chatId, messageId, 'rating_menu.jpg',
        '🏆 *Рейтинг*\n\n' +
        'Выберите категорию:',
        {
          
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
            
            ...getRewardsMenu()
          }
        );
      });
      break;
      
    case 'profile':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err) return bot.sendMessage(userId, '❌ Ошибка');
        
        if (!player.race_id) {
          return bot.editMessageText('❌ Сначала получите расу!', {
            chat_id: chatId,
            message_id: messageId,
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
          
          duels.calculatePlayerPower(userId, (err, stats) => {
            const elementsText = stats.elements.length > 0 ? `\n🌟 Элементы: ${stats.elements.join(' ')}` : '';
            
            bot.editMessageText(
              `${vipIcon}*${player.display_name || player.username}*\n\n` +
              `${rarityIcon} ${race.name} • Ур.${player.level}\n` +
              `✨ ${player.exp}/${Math.floor(expNeeded)} XP\n` +
              `💰 ${player.gold} | 💎 ${player.crystals}\n\n` +
              `⚔️ *Характеристики*\n` +
              `⚡ ${stats.power} | ❤️ ${stats.hp}\n` +
              `🗡️ ${stats.attack} | 🛡️ ${stats.defense}${elementsText}\n\n` +
              `🏆 *Статистика*\n` +
              `${player.wins}W / ${player.losses}L (${winRate}%)\n` +
              `🌟 Пробуждение: ${player.awakening_level}\n` +
              `🔮 XP пробуждения: ${player.awakening_xp}/${config.AWAKENING_XP_REQUIRED}`,
              {
                chat_id: chatId,
                message_id: messageId,
                
                ...getMainMenu(true)
              }
            );
          });
        });
      });
      break;
      
    case 'race':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err) return bot.sendMessage(userId, '❌ Ошибка');
        
        if (!player.race_id) {
          return bot.editMessageText('❌ Сначала получите расу!', {
            chat_id: chatId,
            message_id: messageId,
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
              
              ...getUpgradeMenu()
            }
          );
        });
      });
      break;
      
    case 'loot':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (err) return bot.sendMessage(userId, '❌ Ошибка');
        
        if (!player.race_id) {
          return bot.sendMessage(userId, '❌ Сначала получите расу!', getMainMenu(false));
        }
        
        const cooldown = checkCooldown(player.last_loot_time, config.LOOT_COOLDOWN);
        
        if (!cooldown.ready) {
          return bot.answerCallbackQuery(query.id, { 
            text: `⏰ Кулдаун! Осталось: ${cooldown.remaining}`, 
            show_alert: true 
          });
        }
        
        items.getRandomItem((err, item) => {
          if (err) return bot.sendMessage(userId, '❌ Ошибка');
          
          items.addItemToInventory(userId, item.id, (err) => {
            if (err) return bot.sendMessage(userId, '❌ Ошибка');
            
            const rarityIcon = config.RARITY[item.rarity].color;
            const now = Math.floor(Date.now() / 1000);
            
            db.run(`UPDATE players SET last_loot_time = ?, exp = exp + 10, awakening_xp = awakening_xp + 20 WHERE user_id = ?`, 
              [now, userId], () => {
                bot.sendMessage(userId,
                  `🎁 *Предмет найден!*\n\n` +
                  `${rarityIcon} ${item.name}\n` +
                  `${config.RARITY[item.rarity].name}\n\n` +
                  `⚡ +${item.power_bonus} | ❤️ +${item.hp_bonus}\n` +
                  `🗡️ +${item.attack_bonus} | 🛡️ +${item.defense_bonus}\n\n` +
                  `✨ +10 XP | 🔮 +20 XP пробуждения`,
                  {  ...getMainMenu(true) }
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
        db.all(`SELECT inv.*, i.name, i.slot, i.rarity FROM inventory inv
                JOIN items i ON inv.item_id = i.id
                WHERE inv.player_id = ? AND inv.equipped = 1`, [userId], (err, equipped) => {
          
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
          
          let message = '🎒 *Экипировка*\n\n';
          
          Object.entries(slots).forEach(([slot, name]) => {
            const item = equipped.find(e => e.slot === slot);
            if (item) {
              const rarityIcon = config.RARITY[item.rarity].color;
              message += `${name}: ${rarityIcon} ${item.name}\n`;
            } else {
              message += `${name}: _пусто_\n`;
            }
          });
          
          const buttons = [
            [{ text: '📦 Все предметы', callback_data: 'all_items' }],
            [{ text: '🔙 Назад', callback_data: 'main_menu' }]
          ];
          
          editImageWithText(chatId, messageId, 'inventory.jpg', message, {
            
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
          return bot.editMessageText('📦 Инвентарь пуст', {
            chat_id: chatId,
            message_id: messageId,
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
            message += `${equipped}${rarityIcon} ${item.name}\n`;
            
            buttons.push([{
              text: `${equipped}${item.name}`,
              callback_data: `equip_${item.inv_id}`
            }]);
          });
          
          message += '\n';
        });
        
        buttons.push([{ text: '🔙 К экипировке', callback_data: 'inventory' }]);
        
        bot.editMessageText(message, {
          chat_id: chatId,
          message_id: messageId,
          
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
        
        const cooldown = checkCooldown(player.last_duel_time, config.DUEL_COOLDOWN);
        
        if (!cooldown.ready) {
          return bot.answerCallbackQuery(query.id, { 
            text: `⏰ Кулдаун! Осталось: ${cooldown.remaining}`, 
            show_alert: true 
          });
        }
        
        db.get(`SELECT user_id, username FROM players WHERE user_id != ? AND race_id IS NOT NULL ORDER BY RANDOM() LIMIT 1`,
          [userId], (err, opponent) => {
            if (!opponent) {
              return bot.sendMessage(userId, '❌ Не найдено противников', getMainMenu(true));
            }
            
            duels.conductDuel(userId, opponent.user_id, (err, result) => {
              if (err) return bot.sendMessage(userId, '❌ Ошибка дуэли', getMainMenu(true));
              
              const battleText = result.battleLog.slice(0, 5).join('\n');
              const winnerText = result.winnerId === userId ? '🎉 Вы победили!' : '😢 Вы проиграли';
              const goldReward = result.winnerId === userId ? 50 : 10;
              const expReward = result.winnerId === userId ? 50 : 10;
              const awakeningXP = result.winnerId === userId ? 100 : 20;
              const now = Math.floor(Date.now() / 1000);
              
              db.run(`UPDATE players SET last_duel_time = ?, gold = gold + ?, exp = exp + ?, awakening_xp = awakening_xp + ? WHERE user_id = ?`,
                [now, goldReward, expReward, awakeningXP, userId], () => {
                  
                  bot.sendMessage(userId,
                    `⚔️ *Дуэль*\n\n` +
                    `${battleText}\n...\n\n` +
                    `${winnerText}\n` +
                    `💰 +${goldReward} | ✨ +${expReward}\n` +
                    `🔮 +${awakeningXP} XP пробуждения`,
                    {  ...getMainMenu(true) }
                  );
                  
                  checkLevelUp(userId);
                  
                  achievements.checkAchievements(result.winnerId, (err, newAchs) => {
                    if (newAchs && newAchs.length > 0) {
                      newAchs.forEach(ach => {
                        bot.sendMessage(result.winnerId, 
                          `${ach.icon} Достижение: ${ach.name}\n💰 +${ach.reward_gold} золота`);
                      });
                    }
                  });
                });
            });
          });
      });
      break;
      
    case 'top':
      duels.getTopPlayers(10, (err, players) => {
        if (err || players.length === 0) {
          return bot.editMessageText('❌ Топ пуст', {
            chat_id: chatId,
            message_id: messageId,
            ...getMainMenu(true)
          });
        }
        
        let message = '🏆 *Топ игроков*\n\n';
        
        players.forEach((player, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
          const rarityIcon = player.race_rarity ? config.RARITY[player.race_rarity].color : '⚪️';
          const vipIcon = player.is_vip ? '💎 ' : '';
          const displayName = player.display_name || player.username;
          
          message += `${medal} ${vipIcon}${displayName}\n`;
          message += `   ${rarityIcon} Ур.${player.level} | ⚡${player.power}\n\n`;
        });
        
        bot.editMessageText(message, {
          chat_id: chatId,
          message_id: messageId,
          
          ...getRatingMenu()
        });
      });
      break;
      
    case 'quests':
      quests.getAvailableQuests(userId, (err, availableQuests) => {
        if (err || availableQuests.length === 0) {
          return bot.editMessageText('📋 Нет доступных квестов', {
            chat_id: chatId,
            message_id: messageId,
            ...getBattleMenu()
          });
        }
        
        let message = '📋 *Квесты*\n\n';
        
        availableQuests.forEach(quest => {
          const daily = quest.is_daily ? '⏰ ' : '';
          message += `${daily}${quest.name}\n`;
          message += `🎁 ${quest.reward_gold}💰 ${quest.reward_exp}✨\n\n`;
        });
        
        bot.editMessageText(message, {
          chat_id: chatId,
          message_id: messageId,
          
          ...getBattleMenu()
        });
      });
      break;
      
    case 'achievements':
      achievements.getPlayerAchievements(userId, (err, playerAchs) => {
        if (err || playerAchs.length === 0) {
          return bot.editMessageText('🏅 Нет достижений', {
            chat_id: chatId,
            message_id: messageId,
            ...getRatingMenu()
          });
        }
        
        let message = '🏅 *Достижения*\n\n';
        
        playerAchs.forEach(ach => {
          message += `${ach.icon} ${ach.name}\n`;
        });
        
        bot.editMessageText(message, {
          chat_id: chatId,
          message_id: messageId,
          
          ...getRatingMenu()
        });
      });
      break;
      
    case 'clan':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (!player.clan_id) {
          bot.editMessageText(
            '🏰 *Кланы*\n\n' +
            'Вы не в клане\n\n' +
            '💎 Создание - только VIP\n' +
            `Напишите @${config.ADMIN_USERNAME}`,
            {
              chat_id: chatId,
              message_id: messageId,
              
              ...getClanMenu(false, false)
            }
          );
        } else {
          clans.getClanInfo(player.clan_id, (err, clan) => {
            if (err) return bot.sendMessage(userId, '❌ Ошибка');
            
            const isLeader = clan.leader_id === userId;
            
            bot.editMessageText(
              `🏰 *${clan.name}*\n\n` +
              `📊 Уровень: ${clan.level}\n` +
              `👥 ${clan.member_count}/${config.CLAN_MAX_MEMBERS}\n` +
              `⚡ ${clan.total_power || 0}\n` +
              `${isLeader ? '👑 Вы лидер' : ''}`,
              {
                chat_id: chatId,
                message_id: messageId,
                
                ...getClanMenu(true, isLeader)
              }
            );
          });
        }
      });
      break;
      
    case 'clantop':
      clans.getTopClans(10, (err, topClans) => {
        if (err || topClans.length === 0) {
          return bot.editMessageText('🏰 Нет кланов', {
            chat_id: chatId,
            message_id: messageId,
            ...getRatingMenu()
          });
        }
        
        let message = '🏆 *Топ кланов*\n\n';
        
        topClans.forEach((clan, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
          message += `${medal} ${clan.name}\n`;
          message += `   👥 ${clan.member_count} | ⚡ ${clan.total_power || 0}\n\n`;
        });
        
        bot.editMessageText(message, {
          chat_id: chatId,
          message_id: messageId,
          
          ...getRatingMenu()
        });
      });
      break;
      
    case 'upgrade_menu':
      editImageWithText(chatId, messageId, 'upgrade_menu.jpg',
        '🔮 *Развитие*\n\n' +
        'Выберите действие:',
        {
          
          ...getUpgradeMenu()
        }
      );
      break;
      
    case 'skill_tree':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        skillTree.getAvailableSkills(userId, (err, skills) => {
          if (err || skills.length === 0) {
            return bot.editMessageText('🌳 Нет доступных навыков', {
              chat_id: chatId,
              message_id: messageId,
              ...getUpgradeMenu()
            });
          }
          
          let message = `🌳 *Древо навыков*\n\n💰 Золото: ${player.gold}\n\n`;
          const buttons = [];
          
          skills.slice(0, 8).forEach(skill => {
            message += `📜 ${skill.name}\n`;
            message += `   ${skill.description}\n`;
            message += `   💰 ${skill.cost} | Ур.${skill.required_level}\n\n`;
            
            buttons.push([{
              text: `📜 ${skill.name} (${skill.cost}💰)`,
              callback_data: `learn_skill_${skill.id}`
            }]);
          });
          
          buttons.push([{ text: '📊 Мои навыки', callback_data: 'my_skills' }]);
          buttons.push([{ text: '🔙 Назад', callback_data: 'upgrade_menu' }]);
          
          bot.editMessageText(message, {
            chat_id: chatId,
            message_id: messageId,
            
            reply_markup: { inline_keyboard: buttons }
          });
        });
      });
      break;
      
    case 'my_skills':
      skillTree.getPlayerSkills(userId, (err, skills) => {
        if (err || skills.length === 0) {
          return bot.editMessageText('📊 У вас нет навыков', {
            chat_id: chatId,
            message_id: messageId,
            ...getUpgradeMenu()
          });
        }
        
        let message = '📊 *Изученные навыки*\n\n';
        
        skills.forEach(skill => {
          message += `✅ ${skill.name}\n`;
          message += `   ${skill.description}\n\n`;
        });
        
        bot.editMessageText(message, {
          chat_id: chatId,
          message_id: messageId,
          
          ...getUpgradeMenu()
        });
      });
      break;
      
    case 'upgrade_race':
      getOrCreatePlayer(userId, query.from.username, (err, player) => {
        if (!player.race_id) {
          return bot.sendMessage(userId, '❌ Сначала получите расу!', getMainMenu(false));
        }
        
        const cost = 100 * (player.level + 1);
        
        if (player.gold < cost) {
          return bot.sendMessage(userId, `❌ Недостаточно золота! Нужно: ${cost}💰`, getMainMenu());
        }
        
        db.run(`UPDATE players SET gold = gold - ?, power = power + 20 WHERE user_id = ?`,
          [cost, userId], () => {
            bot.sendMessage(userId, 
              `✅ Раса прокачана!\n\n` +
              `⚡ +20 к силе\n` +
              `💰 -${cost} золота`,
              getMainMenu()
            );
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
              {  ...getMainMenu(true) }
            );
          });
      });
      break;
      
    case 'help':
      bot.editMessageText(
        `📋 Как играть:\n\n` +
        `🎮 Используйте кнопки меню для навигации\n\n` +
        `💡 Советы:\n` +
        `• Выполняйте квесты для опыта\n` +
        `• Собирайте и экипируйте предметы\n` +
        `• Участвуйте в дуэлях\n` +
        `• Прокачивайте расу\n` +
        `• Вступайте в кланы`,
        {
          chat_id: chatId,
          message_id: messageId,
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
          return bot.answerCallbackQuery(query.id, { 
            text: `⏰ Кулдаун! Осталось: ${cooldown.remaining}`, 
            show_alert: true 
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
          return bot.answerCallbackQuery(query.id, { 
            text: `⏰ Ежедневная награда уже получена! Осталось: ${cooldown.remaining}`, 
            show_alert: true 
          });
        }
        
        const goldReward = 200;
        const crystalReward = 5;
        const expReward = 100;
        const now = Math.floor(Date.now() / 1000);
        
        db.run(`UPDATE players SET last_daily_reward = ?, gold = gold + ?, crystals = crystals + ?, exp = exp + ? WHERE user_id = ?`,
          [now, goldReward, crystalReward, expReward, userId], () => {
            bot.sendMessage(userId,
              `🎁 Ежедневная награда!\n\n` +
              `💰 +${goldReward} золота\n` +
              `💎 +${crystalReward} кристаллов\n` +
              `✨ +${expReward} опыта\n\n` +
              `⏰ Следующая награда через: 24 часа`,
              getMainMenu(true)
            );
            
            checkLevelUp(userId);
          });
      });
      break;
      
    default:
      // Обработка изучения навыков
      if (data.startsWith('learn_skill_')) {
        const skillId = parseInt(data.split('_')[2]);
        
        skillTree.learnSkill(userId, skillId, (err, skill) => {
          if (err) {
            return bot.answerCallbackQuery(query.id, { 
              text: `❌ ${err.message}`, 
              show_alert: true 
            });
          }
          
          bot.answerCallbackQuery(query.id, { text: `✅ Навык изучен!` });
          
          bot.sendMessage(userId,
            `📜 Навык изучен!\n\n` +
            `✨ ${skill.name}\n` +
            `${skill.description}\n\n` +
            `💰 -${skill.cost} золота`,
            {  ...getUpgradeMenu() }
          );
        });
        break;
      }
      
      // Обработка экипировки предметов
      if (data.startsWith('equip_')) {
        const inventoryId = parseInt(data.split('_')[1]);
        
        items.equipItem(userId, inventoryId, (err) => {
          if (err) {
            return bot.answerCallbackQuery(query.id, { text: `❌ ${err.message}`, show_alert: true });
          }
          
          bot.answerCallbackQuery(query.id, { text: '✅ Предмет экипирован!' });
          
          // Обновляем инвентарь
          bot.emit('callback_query', { ...query, data: 'inventory' });
        });
      }
      break;
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

// Безопасное редактирование сообщений
function safeEditMessage(chatId, messageId, text, options = {}) {
  const safeText = text.replace(/\*([^*]*)\*/g, '$1');
  
  // Проверяем что текст не пустой
  if (!safeText || safeText.trim().length === 0) {
    console.log('Попытка отредактировать пустое сообщение, отправляем новое');
    safeSendMessage(chatId, '📸 Меню обновлено', options);
    return;
  }
  
  bot.editMessageText(safeText, {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: options.reply_markup
  }).catch(error => {
    console.log('Ошибка редактирования сообщения:', error.message);
    
    // Если сообщение нельзя отредактировать, отправляем новое
    if (error.message.includes('there is no text in the message to edit') ||
        error.message.includes('message to edit not found') ||
        error.message.includes('message is not modified')) {
      safeSendMessage(chatId, safeText, options);
    }
  });
}
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
  const safeText = text.replace(/\*([^*]*)\*/g, '$1');
  
  // Для редактирования медиа в Telegram нужно отправлять новое сообщение
  // так как editMessageMedia работает только с URL, а не с локальными файлами
  console.log(`Попытка редактирования медиа ${imagePath}, отправляем новое сообщение`);
  sendImageWithText(chatId, imagePath, safeText, options);
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
    'Древний': 'ancient.jpg'
  };
  
  return raceMap[raceName] || 'human.jpg';
}
// Обработка всех сообщений для проверки подписки
bot.on('message', async (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  
  // Пропускаем команды (они обрабатываются отдельно)
  if (msg.text && msg.text.startsWith('/')) return;
  
  // Проверяем подписку для всех остальных сообщений
  const isSubscribed = await requireSubscription(userId, chatId);
  if (!isSubscribed) return;
  
  // Если подписан, отправляем в главное меню
  bot.sendMessage(chatId, 
    '🎮 Используйте /menu для открытия главного меню или нажмите кнопки ниже:',
    getMainMenu(true)
  );
});
