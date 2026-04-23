const races = require('./races.js');

const racesByRarity = {};
let total = 0;

races.BASE_RACES.forEach(race => {
  if (!racesByRarity[race.rarity]) {
    racesByRarity[race.rarity] = [];
  }
  racesByRarity[race.rarity].push(race.name);
  total++;
});

console.log('📊 СТАТИСТИКА РАС В ИГРЕ:');
console.log('');

const rarityData = {
  'COMMON': { emoji: '⚪️', name: 'Обычные' },
  'RARE': { emoji: '🔵', name: 'Редкие' },
  'EPIC': { emoji: '🟣', name: 'Эпические' },
  'MYTHIC': { emoji: '🔴', name: 'Мистические' },
  'LEGENDARY': { emoji: '🟡', name: 'Легендарные' },
  'SECRET': { emoji: '⚫️', name: 'Секретные' }
};

Object.entries(racesByRarity).forEach(([rarity, raceList]) => {
  const info = rarityData[rarity] || { emoji: '❓', name: rarity };
  console.log(`${info.emoji} ${info.name} (${raceList.length}):`);
  raceList.forEach(name => console.log(`   • ${name}`));
  console.log('');
});

console.log(`🎯 ВСЕГО РАС: ${total}`);
process.exit(0);