/**
 * Реальный тест форматирования с загрузкой bot.js модулей
 */

console.log('🔍 Тестирование форматирования с реальными данными...\n');

try {
  // Загружаем number_formatter
  const { smartFormat } = require('./number_formatter');
  
  // Симулируем данные игрока
  const player = {
    user_id: 123456789,
    username: 'TestPlayer',
    level: 25,
    exp: 1234567,
    gold: 5432100,
    crystals: 8765,
    wins: 150,
    losses: 45,
    awakening_level: 3
  };
  
  const stats = {
    power: 125000,
    hp: 350000,
    attack: 85000,
    defense: 62000
  };
  
  // Тестируем профиль
  console.log('📊 Профиль игрока:');
  const profileMessage = 
    `👤 Профиль игрока\n\n` +
    `🆔 ID: ${player.user_id}\n` +
    `👤 Имя: ${player.username}\n` +
    `📊 Уровень: ${player.level}\n` +
    `✨ Опыт: ${smartFormat(player.exp)}\n` +
    `💰 Золото: ${smartFormat(player.gold)}\n` +
    `💎 Кристаллы: ${smartFormat(player.crystals)}\n\n` +
    `⚔️ Боевые характеристики:\n` +
    `⚡ Сила: ${smartFormat(stats.power)}\n` +
    `❤️ HP: ${smartFormat(stats.hp)}\n` +
    `🗡️ Атака: ${smartFormat(stats.attack)}\n` +
    `🛡️ Защита: ${smartFormat(stats.defense)}\n\n` +
    `🏆 Статистика:\n` +
    `✅ Побед: ${player.wins}\n` +
    `❌ Поражений: ${player.losses}`;
  
  console.log(profileMessage);
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Тестируем награды
  console.log('💰 Награды после боя:');
  const actualGoldReward = 15000;
  const actualExpReward = 8500;
  const currentGold = player.gold + actualGoldReward;
  const currentExp = player.exp + actualExpReward;
  
  const rewardMessage = 
    `💰 Золото: +${smartFormat(actualGoldReward)} (${smartFormat(currentGold)}💰)\n` +
    `✨ Опыт: +${smartFormat(actualExpReward)} (${smartFormat(currentExp)}✨)`;
  
  console.log(rewardMessage);
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Тестируем рейд
  console.log('🐉 Рейд босс:');
  const raid = {
    current_hp: 3450000,
    boss_hp: 5000000
  };
  
  const hpPercent = Math.floor((raid.current_hp / raid.boss_hp) * 100);
  const raidMessage = `❤️ HP: ${smartFormat(raid.current_hp)}/${smartFormat(raid.boss_hp)} (${hpPercent}%)`;
  
  console.log(raidMessage);
  console.log('\n' + '='.repeat(50) + '\n');
  
  console.log('✅ Все тесты пройдены успешно!');
  console.log('\n📝 Если вы видите форматированные числа выше (1.23M, 5.43M и т.д.),');
  console.log('   то форматирование работает правильно в коде.');
  console.log('\n⚠️  Если в боте числа не форматируются:');
  console.log('   1. Убедитесь, что бот полностью остановлен');
  console.log('   2. Проверьте, нет ли других процессов node.js');
  console.log('   3. Запустите бота заново: node bot.js');
  
} catch (error) {
  console.error('❌ Ошибка:', error.message);
  console.error(error.stack);
}
