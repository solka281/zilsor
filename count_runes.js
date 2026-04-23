const items = require('./items.js');

console.log('📊 СТАТИСТИКА РУН В ИГРЕ:');
console.log('');

const runes = items.BASE_ITEMS.filter(item => item.name.includes('Руна'));
const runesByRarity = {};
let total = 0;

runes.forEach(rune => {
  if (!runesByRarity[rune.rarity]) {
    runesByRarity[rune.rarity] = [];
  }
  runesByRarity[rune.rarity].push(rune);
  total++;
});

const rarityData = {
  'COMMON': { emoji: '⚪️', name: 'Обычные' },
  'RARE': { emoji: '🔵', name: 'Редкие' },
  'EPIC': { emoji: '🟣', name: 'Эпические' },
  'MYTHIC': { emoji: '🔴', name: 'Мистические' },
  'LEGENDARY': { emoji: '🟡', name: 'Легендарные' },
  'SECRET': { emoji: '⚫️', name: 'Секретные' }
};

Object.entries(runesByRarity).forEach(([rarity, runeList]) => {
  const info = rarityData[rarity] || { emoji: '❓', name: rarity };
  console.log(`${info.emoji} ${info.name} (${runeList.length}):`);
  runeList.forEach(rune => {
    console.log(`   🔮 ${rune.name}`);
    console.log(`      📝 ${rune.description}`);
    console.log(`      ⚡ Сила: +${rune.power_bonus} | ❤️ HP: +${rune.hp_bonus} | ⚔️ Атака: +${rune.attack_bonus} | 🛡️ Защита: +${rune.defense_bonus}`);
    if (rune.special_effect) {
      console.log(`      ✨ Эффект: ${rune.special_effect}`);
    }
    console.log('');
  });
});

console.log(`🎯 ВСЕГО РУН: ${total}`);

// Показываем все эффекты рун
console.log('');
console.log('🔮 ЭФФЕКТЫ РУН:');
const effects = [...new Set(runes.filter(r => r.special_effect).map(r => r.special_effect))];
effects.forEach(effect => {
  console.log(`   ✨ ${effect}`);
});

process.exit(0);