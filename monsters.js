const db = require('./database_simple');

// Локации леса (каждые 10 уровней)
const LOCATIONS = {
  1: { name: 'Болотистая Топь', image: 'locations/location_swamp.jpg', levels: [1, 10] },
  2: { name: 'Темный Лес', image: 'locations/location_dark_forest.jpg', levels: [11, 20] },
  3: { name: 'Горные Пещеры', image: 'locations/location_caves.jpg', levels: [21, 30] },
  4: { name: 'Проклятые Руины', image: 'locations/location_ruins.jpg', levels: [31, 40] },
  5: { name: 'Вулканические Земли', image: 'locations/location_volcano.jpg', levels: [41, 50] },
  6: { name: 'Ледяные Пустоши', image: 'locations/location_ice.jpg', levels: [51, 60] },
  7: { name: 'Драконье Логово', image: 'locations/location_dragon_lair.jpg', levels: [61, 70] },
  8: { name: 'Царство Теней', image: 'locations/location_shadow.jpg', levels: [71, 80] },
  9: { name: 'Адские Врата', image: 'locations/location_hell.jpg', levels: [81, 90] },
  10: { name: 'Храм Хаоса', image: 'locations/location_chaos.jpg', levels: [91, 100] },
  11: { name: 'Земли Титанов', image: 'locations/location_titans.jpg', levels: [101, 110] },
  12: { name: 'Бездна', image: 'locations/location_abyss.jpg', levels: [111, 120] }
};

// Монстры по локациям
const MONSTERS_BY_LOCATION = {
  // Локация 1: Болотистая Топь (1-10)
  1: [
    {
      name: 'Слизень',
      emoji: '🟢',
      hp: 25,
      attack: 8,
      defense: 3,
      goldReward: [10, 25],
      expReward: [15, 30],
      specialAbility: 'Липкая атака'
    },
    {
      name: 'Большой Слизень',
      emoji: '🟢',
      hp: 28,
      attack: 9,
      defense: 3,
      goldReward: [12, 27],
      expReward: [17, 32],
      specialAbility: 'Ядовитая слизь'
    },
    {
      name: 'Гигантский Слизень',
      emoji: '🟢',
      hp: 30,
      attack: 10,
      defense: 4,
      goldReward: [15, 30],
      expReward: [20, 35],
      specialAbility: 'Поглощение'
    }
  ],
  
  // Локация 2: Темный Лес (11-20)
  2: [
    {
      name: 'Лесной Волк',
      emoji: '🐺',
      hp: 45,
      attack: 15,
      defense: 8,
      goldReward: [25, 50],
      expReward: [30, 55],
      specialAbility: 'Укус'
    },
    {
      name: 'Серый Волк',
      emoji: '🐺',
      hp: 48,
      attack: 16,
      defense: 9,
      goldReward: [27, 52],
      expReward: [32, 57],
      specialAbility: 'Свирепый укус'
    },
    {
      name: 'Дикий Волк',
      emoji: '🐺',
      hp: 50,
      attack: 17,
      defense: 10,
      goldReward: [30, 55],
      expReward: [35, 60],
      specialAbility: 'Разрывающий укус'
    }
  ],
  
  // Локация 3: Горные Пещеры (21-30)
  3: [
    {
      name: 'Орк',
      emoji: '👹',
      hp: 70,
      attack: 22,
      defense: 12,
      goldReward: [50, 90],
      expReward: [60, 95],
      specialAbility: 'Мощный удар'
    },
    {
      name: 'Орк-Воин',
      emoji: '👹',
      hp: 73,
      attack: 23,
      defense: 13,
      goldReward: [52, 92],
      expReward: [62, 97],
      specialAbility: 'Боевой топор'
    },
    {
      name: 'Орк-Берсерк',
      emoji: '👹',
      hp: 75,
      attack: 24,
      defense: 14,
      goldReward: [55, 95],
      expReward: [65, 100],
      specialAbility: 'Ярость берсерка'
    }
  ],
  
  // Локация 4: Проклятые Руины (31-40)
  4: [
    {
      name: 'Скелет-Воин',
      emoji: '💀',
      hp: 95,
      attack: 32,
      defense: 18,
      goldReward: [80, 130],
      expReward: [90, 135],
      specialAbility: 'Костяной удар'
    },
    {
      name: 'Скелет-Рыцарь',
      emoji: '💀',
      hp: 98,
      attack: 33,
      defense: 19,
      goldReward: [83, 133],
      expReward: [93, 138],
      specialAbility: 'Мертвая хватка'
    },
    {
      name: 'Скелет-Чемпион',
      emoji: '💀',
      hp: 100,
      attack: 34,
      defense: 20,
      goldReward: [90, 145],
      expReward: [100, 150],
      specialAbility: 'Проклятый меч'
    }
  ],
  
  // Локация 5: Вулканические Земли (41-50)
  5: [
    {
      name: 'Огненный Элементаль',
      emoji: '🔥',
      hp: 120,
      attack: 48,
      defense: 28,
      goldReward: [110, 170],
      expReward: [120, 175],
      specialAbility: 'Огненный шар'
    },
    {
      name: 'Пылающий Элементаль',
      emoji: '🔥',
      hp: 123,
      attack: 49,
      defense: 29,
      goldReward: [113, 173],
      expReward: [123, 178],
      specialAbility: 'Огненная волна'
    },
    {
      name: 'Инферно Элементаль',
      emoji: '🔥',
      hp: 125,
      attack: 50,
      defense: 30,
      goldReward: [120, 185],
      expReward: [130, 190],
      specialAbility: 'Адское пламя'
    }
  ],
  
  // Локация 6: Ледяные Пустоши (51-60)
  6: [
    {
      name: 'Ледяной Элементаль',
      emoji: '❄️',
      hp: 150,
      attack: 68,
      defense: 40,
      goldReward: [140, 210],
      expReward: [150, 215],
      specialAbility: 'Ледяной шип'
    },
    {
      name: 'Морозный Элементаль',
      emoji: '❄️',
      hp: 153,
      attack: 69,
      defense: 41,
      goldReward: [143, 213],
      expReward: [153, 218],
      specialAbility: 'Ледяная буря'
    },
    {
      name: 'Кристальный Элементаль',
      emoji: '❄️',
      hp: 155,
      attack: 70,
      defense: 42,
      goldReward: [150, 225],
      expReward: [160, 230],
      specialAbility: 'Морозное дыхание'
    }
  ],
  
  // Локация 7: Драконье Логово (61-70)
  7: [
    {
      name: 'Молодой Дракон',
      emoji: '🐉',
      hp: 180,
      attack: 95,
      defense: 55,
      goldReward: [170, 250],
      expReward: [180, 255],
      specialAbility: 'Огненное дыхание'
    },
    {
      name: 'Красный Дракон',
      emoji: '🐉',
      hp: 183,
      attack: 96,
      defense: 56,
      goldReward: [175, 255],
      expReward: [185, 260],
      specialAbility: 'Драконья ярость'
    },
    {
      name: 'Боевой Дракон',
      emoji: '🐉',
      hp: 185,
      attack: 97,
      defense: 57,
      goldReward: [180, 265],
      expReward: [190, 270],
      specialAbility: 'Пламенный вихрь'
    }
  ],
  
  // Локация 8: Царство Теней (71-80)
  8: [
    {
      name: 'Теневой Убийца',
      emoji: '🥷',
      hp: 220,
      attack: 125,
      defense: 70,
      goldReward: [200, 290],
      expReward: [210, 295],
      specialAbility: 'Удар из тени'
    },
    {
      name: 'Теневой Ассасин',
      emoji: '🥷',
      hp: 223,
      attack: 126,
      defense: 71,
      goldReward: [205, 295],
      expReward: [215, 300],
      specialAbility: 'Теневая магия'
    },
    {
      name: 'Мастер Теней',
      emoji: '🥷',
      hp: 225,
      attack: 127,
      defense: 72,
      goldReward: [210, 305],
      expReward: [220, 310],
      specialAbility: 'Кошмарное видение'
    }
  ],
  
  // Локация 9: Адские Врата (81-90)
  9: [
    {
      name: 'Архидемон',
      emoji: '👿',
      hp: 260,
      attack: 155,
      defense: 88,
      goldReward: [230, 330],
      expReward: [240, 335],
      specialAbility: 'Огненный укус'
    },
    {
      name: 'Демон-Воин',
      emoji: '👿',
      hp: 263,
      attack: 156,
      defense: 89,
      goldReward: [235, 335],
      expReward: [245, 340],
      specialAbility: 'Темная магия'
    },
    {
      name: 'Демон-Лорд',
      emoji: '👿',
      hp: 265,
      attack: 157,
      defense: 90,
      goldReward: [240, 345],
      expReward: [250, 350],
      specialAbility: 'Адский огонь'
    }
  ],
  
  // Локация 10: Храм Хаоса (91-100)
  10: [
    {
      name: 'Аватар Хаоса',
      emoji: '☠️',
      hp: 300,
      attack: 185,
      defense: 105,
      goldReward: [260, 370],
      expReward: [270, 375],
      specialAbility: 'Магия хаоса'
    },
    {
      name: 'Жрец Хаоса',
      emoji: '☠️',
      hp: 303,
      attack: 186,
      defense: 106,
      goldReward: [265, 375],
      expReward: [275, 380],
      specialAbility: 'Конец света'
    },
    {
      name: 'Вестник Хаоса',
      emoji: '☠️',
      hp: 305,
      attack: 187,
      defense: 107,
      goldReward: [270, 385],
      expReward: [280, 390],
      specialAbility: 'Хаотический взрыв'
    }
  ],
  
  // Локация 11: Земли Титанов (101-110)
  11: [
    {
      name: 'Каменный Титан',
      emoji: '🗿',
      hp: 350,
      attack: 215,
      defense: 120,
      goldReward: [290, 410],
      expReward: [300, 415],
      specialAbility: 'Удар титана'
    },
    {
      name: 'Боевой Титан',
      emoji: '🗿',
      hp: 353,
      attack: 216,
      defense: 121,
      goldReward: [295, 415],
      expReward: [305, 420],
      specialAbility: 'Разрушительная волна'
    },
    {
      name: 'Древний Титан',
      emoji: '🗿',
      hp: 355,
      attack: 217,
      defense: 122,
      goldReward: [300, 425],
      expReward: [310, 430],
      specialAbility: 'Землетрясение'
    }
  ],
  
  // Локация 12: Бездна (111-120)
  12: [
    {
      name: 'Страж Бездны',
      emoji: '👁️',
      hp: 400,
      attack: 245,
      defense: 140,
      goldReward: [320, 450],
      expReward: [330, 455],
      specialAbility: 'Взгляд бездны'
    },
    {
      name: 'Ужас Бездны',
      emoji: '👁️',
      hp: 403,
      attack: 246,
      defense: 141,
      goldReward: [325, 455],
      expReward: [335, 460],
      specialAbility: 'Бездна поглощает все'
    },
    {
      name: 'Древнее Зло',
      emoji: '👁️',
      hp: 405,
      attack: 247,
      defense: 142,
      goldReward: [330, 465],
      expReward: [340, 470],
      specialAbility: 'Абсолютная тьма'
    }
  ]
};

// Боссы каждые 10 уровней (по локациям)
const BOSSES = {
  10: {
    name: 'Король Слизней',
    emoji: '👑',
    hp: 35,
    attack: 12,
    defense: 5,
    goldReward: 200,
    expReward: 150,
    crystalReward: [1, 1],
    itemDropChance: 0.4,
    specialAbility: 'Ядовитый взрыв'
  },
  20: {
    name: 'Альфа Волк',
    emoji: '🐺',
    hp: 60,
    attack: 20,
    defense: 12,
    goldReward: 350,
    expReward: 200,
    crystalReward: [1, 2],
    itemDropChance: 0.5,
    specialAbility: 'Вой стаи'
  },
  30: {
    name: 'Вожак Орков',
    emoji: '👹',
    hp: 85,
    attack: 28,
    defense: 16,
    goldReward: 500,
    expReward: 300,
    crystalReward: [1, 2],
    itemDropChance: 0.5,
    specialAbility: 'Боевая ярость'
  },
  40: {
    name: 'Лич',
    emoji: '☠️',
    hp: 110,
    attack: 38,
    defense: 22,
    goldReward: 750,
    expReward: 400,
    crystalReward: [1, 2],
    itemDropChance: 0.6,
    specialAbility: 'Некромантия'
  },
  50: {
    name: 'Огненный Дракон',
    emoji: '🐉',
    hp: 140,
    attack: 55,
    defense: 32,
    goldReward: 1000,
    expReward: 500,
    crystalReward: [1, 2],
    itemDropChance: 0.6,
    specialAbility: 'Огненное дыхание'
  },
  60: {
    name: 'Ледяной Колосс',
    emoji: '🧊',
    hp: 170,
    attack: 75,
    defense: 45,
    goldReward: 1500,
    expReward: 700,
    crystalReward: [1, 2],
    itemDropChance: 0.7,
    specialAbility: 'Ледяная буря'
  },
  70: {
    name: 'Древний Дракон',
    emoji: '🐲',
    hp: 200,
    attack: 100,
    defense: 60,
    goldReward: 2000,
    expReward: 900,
    crystalReward: [2, 2],
    itemDropChance: 0.7,
    specialAbility: 'Драконья ярость'
  },
  80: {
    name: 'Повелитель Теней',
    emoji: '🌑',
    hp: 240,
    attack: 130,
    defense: 75,
    goldReward: 3000,
    expReward: 1200,
    crystalReward: [2, 2],
    itemDropChance: 0.8,
    specialAbility: 'Теневая магия'
  },
  90: {
    name: 'Повелитель Демонов',
    emoji: '😱',
    hp: 280,
    attack: 160,
    defense: 92,
    goldReward: 4000,
    expReward: 1500,
    crystalReward: [2, 2],
    itemDropChance: 0.8,
    specialAbility: 'Темная магия'
  },
  100: {
    name: 'Бог Хаоса',
    emoji: '💀',
    hp: 320,
    attack: 190,
    defense: 110,
    goldReward: 6000,
    expReward: 2000,
    crystalReward: [2, 3],
    itemDropChance: 0.9,
    specialAbility: 'Конец света'
  },
  110: {
    name: 'Титан Разрушения',
    emoji: '⚡',
    hp: 370,
    attack: 220,
    defense: 125,
    goldReward: 8000,
    expReward: 2500,
    crystalReward: [2, 3],
    itemDropChance: 0.9,
    specialAbility: 'Удар титана'
  },
  120: {
    name: 'Владыка Бездны',
    emoji: '🌀',
    hp: 420,
    attack: 250,
    defense: 145,
    goldReward: 10000,
    expReward: 3000,
    crystalReward: [3, 3],
    itemDropChance: 1.0,
    specialAbility: 'Бездна поглощает все'
  }
};

// Получить локацию по уровню леса
function getLocationByLevel(forestLevel) {
  for (let locId in LOCATIONS) {
    const loc = LOCATIONS[locId];
    if (forestLevel >= loc.levels[0] && forestLevel <= loc.levels[1]) {
      return { id: parseInt(locId), ...loc };
    }
  }
  // Если уровень выше 120, возвращаем последнюю локацию
  return { id: 12, ...LOCATIONS[12] };
}

// Получить случайного монстра для уровня леса
function getRandomMonster(forestLevel) {
  const location = getLocationByLevel(forestLevel);
  const monsters = MONSTERS_BY_LOCATION[location.id];
  
  if (!monsters || monsters.length === 0) {
    // Fallback на последнюю локацию
    const lastMonsters = MONSTERS_BY_LOCATION[12];
    return lastMonsters[Math.floor(Math.random() * lastMonsters.length)];
  }
  
  return monsters[Math.floor(Math.random() * monsters.length)];
}

// Проверить доступен ли босс
function checkBossAvailable(forestLevel) {
  const bossLevels = Object.keys(BOSSES).map(Number);
  for (let bossLevel of bossLevels) {
    if (forestLevel === bossLevel) {
      return { available: true, boss: BOSSES[bossLevel], level: bossLevel };
    }
  }
  return { available: false };
}

// Создать экземпляр монстра с масштабированием под уровень леса
function createMonsterInstance(monsterTemplate, forestLevel) {
  // Масштабирование: +40% за уровень леса
  const levelMultiplier = 1 + (forestLevel * 0.4);
  
  // Шанс выпадения предмета с обычных мобов (увеличивается с уровнем)
  const baseDropChance = 0.05; // 5% базовый шанс
  const levelBonus = forestLevel * 0.002; // +0.2% за уровень
  const itemDropChance = Math.min(0.25, baseDropChance + levelBonus); // максимум 25%
  
  return {
    name: monsterTemplate.name,
    emoji: monsterTemplate.emoji,
    hp: Math.floor(monsterTemplate.hp * levelMultiplier),
    maxHP: Math.floor(monsterTemplate.hp * levelMultiplier),
    attack: Math.floor(monsterTemplate.attack * levelMultiplier),
    defense: Math.floor(monsterTemplate.defense * levelMultiplier),
    goldReward: Math.floor(monsterTemplate.goldReward[0] + Math.random() * (monsterTemplate.goldReward[1] - monsterTemplate.goldReward[0])),
    expReward: Math.floor(monsterTemplate.expReward[0] + Math.random() * (monsterTemplate.expReward[1] - monsterTemplate.expReward[0])),
    specialAbility: monsterTemplate.specialAbility,
    level: forestLevel,
    itemDropChance: itemDropChance, // Добавляем шанс дропа для обычных мобов
    isBoss: false
  };
}

// Создать экземпляр босса с масштабированием
function createBossInstance(bossTemplate, bossLevel, forestLevel) {
  // Боссы получают такое же масштабирование как мобы: +40% за уровень
  const levelMultiplier = 1 + (bossLevel * 0.4);
  
  const crystalReward = bossTemplate.crystalReward[0] + Math.floor(Math.random() * (bossTemplate.crystalReward[1] - bossTemplate.crystalReward[0] + 1));
  
  return {
    name: bossTemplate.name,
    emoji: bossTemplate.emoji,
    hp: Math.floor(bossTemplate.hp * levelMultiplier),
    maxHP: Math.floor(bossTemplate.hp * levelMultiplier),
    attack: Math.floor(bossTemplate.attack * levelMultiplier),
    defense: Math.floor(bossTemplate.defense * levelMultiplier),
    goldReward: Math.floor(bossTemplate.goldReward * levelMultiplier),
    expReward: Math.floor(bossTemplate.expReward * levelMultiplier),
    crystalReward: crystalReward,
    itemDropChance: bossTemplate.itemDropChance,
    specialAbility: bossTemplate.specialAbility,
    level: bossLevel,
    isBoss: true
  };
}

// Выполнить атаку (как в дуэлях)
function performAttack(attacker, defender) {
  // Шанс уклонения
  const dodgeChance = 0.05 + (defender.defense / 1000);
  if (Math.random() < dodgeChance) {
    return { dodged: true, damage: 0 };
  }
  
  // Базовый урон
  let damage = attacker.attack - (defender.defense * 0.3);
  damage = Math.max(5, damage);
  
  // Шанс критического удара
  const critChance = 0.10 + (attacker.attack / 500);
  const isCritical = Math.random() < critChance;
  if (isCritical) {
    damage *= 2;
  }
  
  // Специальная способность (15% шанс)
  let isSpecial = false;
  let specialName = '';
  if (Math.random() < 0.15 && attacker.specialAbility) {
    isSpecial = true;
    specialName = attacker.specialAbility;
    damage *= 1.5;
  }
  
  // Разброс урона
  const variance = 0.9 + Math.random() * 0.2;
  damage *= variance;
  
  return {
    damage: Math.floor(damage),
    critical: isCritical,
    special: isSpecial,
    specialName: specialName,
    dodged: false
  };
}

// Провести бой с монстром
function fightMonster(playerStats, monster) {
  let playerHP = playerStats.hp;
  let monsterHP = monster.hp;
  
  const battleLog = [];
  let round = 1;
  
  // Заголовок
  battleLog.push(`${monster.emoji} *${monster.name}* (Ур. ${monster.level})`);
  battleLog.push(`❤️ ${monsterHP}/${monster.maxHP} HP | ⚔️ ${monster.attack} ATK | 🛡 ${monster.defense} DEF`);
  battleLog.push(`━━━━━━━━━━━━━━━━━━━━`);
  
  while (playerHP > 0 && monsterHP > 0 && round <= 20) {
    battleLog.push(`\n🔸 Раунд ${round}`);
    
    // Ход игрока
    const playerAction = performAttack(playerStats, monster);
    
    if (playerAction.dodged) {
      battleLog.push(`💨 ${monster.name} уклонился!`);
    } else {
      monsterHP -= playerAction.damage;
      
      let msg = `⚔️ Вы: ${playerAction.damage} урона`;
      if (playerAction.critical) msg += ` 💥 КРИТ!`;
      if (playerAction.special) msg += ` ✨ ${playerAction.specialName}`;
      battleLog.push(msg);
      battleLog.push(`   ${monster.emoji} ${Math.max(0, monsterHP)}/${monster.maxHP} HP`);
    }
    
    if (monsterHP <= 0) {
      battleLog.push(`\n🎉 Вы победили!`);
      break;
    }
    
    // Ход монстра
    const monsterAction = performAttack(monster, playerStats);
    
    if (monsterAction.dodged) {
      battleLog.push(`💨 Вы уклонились!`);
    } else {
      playerHP -= monsterAction.damage;
      
      let msg = `${monster.emoji} ${monster.name}: ${monsterAction.damage} урона`;
      if (monsterAction.critical) msg += ` 💥 КРИТ!`;
      if (monsterAction.special) msg += ` ✨ ${monsterAction.specialName}`;
      battleLog.push(msg);
      battleLog.push(`   ❤️ Вы: ${Math.max(0, playerHP)}/${playerStats.hp} HP`);
    }
    
    if (playerHP <= 0) {
      battleLog.push(`\n💀 Вы проиграли...`);
      break;
    }
    
    round++;
  }
  
  const victory = playerHP > 0;
  
  return {
    victory,
    battleLog,
    rounds: round,
    goldReward: victory ? monster.goldReward : Math.floor(monster.goldReward * 0.2),
    expReward: victory ? monster.expReward : Math.floor(monster.expReward * 0.2),
    crystalReward: victory && monster.isBoss ? monster.crystalReward : 0
  };
}

module.exports = {
  getRandomMonster,
  getLocationByLevel,
  checkBossAvailable,
  createMonsterInstance,
  createBossInstance,
  fightMonster,
  LOCATIONS,
  MONSTERS_BY_LOCATION,
  BOSSES
};
