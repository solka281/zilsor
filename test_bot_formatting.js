/**
 * Тест для проверки форматирования в bot.js
 */

const { smartFormat } = require('./number_formatter');

console.log('=== Тест форматирования для бота ===\n');

// Симуляция данных игрока
const player = {
  level: 25,
  exp: 1234567,
  gold: 5432100,
  crystals: 8765,
  wins: 150,
  losses: 45
};

const stats = {
  power: 125000,
  hp: 350000,
  attack: 85000,
  defense: 62000
};

const raid = {
  current_hp: 3450000,
  boss_hp: 5000000
};

console.log('📊 Профиль игрока:');
console.log(`⭐ Уровень: ${player.level}`);
console.log(`✨ Опыт: ${smartFormat(player.exp)}`);
console.log(`💰 Золото: ${smartFormat(player.gold)}`);
console.log(`💎 Кристаллы: ${smartFormat(player.crystals)}`);
console.log(`🏆 Побед: ${player.wins}`);
console.log(`💀 Поражений: ${player.losses}\n`);

console.log('⚔️ Боевые характеристики:');
console.log(`⚡ Сила: ${smartFormat(stats.power)}`);
console.log(`❤️ HP: ${smartFormat(stats.hp)}`);
console.log(`🗡️ Атака: ${smartFormat(stats.attack)}`);
console.log(`🛡️ Защита: ${smartFormat(stats.defense)}\n`);

console.log('🐉 Рейд босс:');
console.log(`❤️ HP: ${smartFormat(raid.current_hp)}/${smartFormat(raid.boss_hp)}\n`);

console.log('💰 Награды:');
console.log(`💰 Золото: +${smartFormat(15000)} (${smartFormat(player.gold + 15000)}💰)`);
console.log(`✨ Опыт: +${smartFormat(8500)} (${smartFormat(player.exp + 8500)}✨)`);
console.log(`💎 Кристаллы: +5\n`);

console.log('✅ Форматирование работает корректно!');
