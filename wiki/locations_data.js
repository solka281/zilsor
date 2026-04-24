// Данные о локациях Темного Леса (ТОЛЬКО то что показывается в боте)
const LOCATIONS_DATA = {
    1: {
        id: 1,
        name: 'Болотистая Топь',
        levels: [1, 10],
        description: 'Мрачные болота, населенные слизнями.',
        image: 'locations/location_swamp.jpg',
        mobs: [
            { name: 'Слизень', emoji: '🟢', hp: 50, attack: 15, defense: 5, goldReward: [10, 25], expReward: [15, 30] },
            { name: 'Большой Слизень', emoji: '🟢', hp: 60, attack: 17, defense: 6, goldReward: [12, 27], expReward: [17, 32] },
            { name: 'Гигантский Слизень', emoji: '🟢', hp: 70, attack: 20, defense: 8, goldReward: [15, 30], expReward: [20, 35] }
        ],
        boss: { level: 10, name: 'Король Слизней', emoji: '👑', hp: 800, attack: 100, defense: 60, goldReward: 200, expReward: 150, crystalReward: [1, 1], itemDropChance: 0.4 }
    },
    2: {
        id: 2,
        name: 'Темный Лес',
        levels: [11, 20],
        description: 'Густой лес, где солнечный свет едва пробивается сквозь кроны деревьев.',
        image: 'locations/location_dark_forest.jpg',
        mobs: [
            { name: 'Лесной Волк', emoji: '🐺', hp: 100, attack: 30, defense: 15, goldReward: [25, 50], expReward: [30, 55] },
            { name: 'Серый Волк', emoji: '🐺', hp: 110, attack: 32, defense: 16, goldReward: [27, 52], expReward: [32, 57] },
            { name: 'Дикий Волк', emoji: '🐺', hp: 120, attack: 35, defense: 18, goldReward: [30, 55], expReward: [35, 60] }
        ],
        boss: { level: 20, name: 'Альфа Волк', emoji: '🐺', hp: 1200, attack: 150, defense: 90, goldReward: 350, expReward: 200, crystalReward: [1, 2], itemDropChance: 0.5 }
    },
    3: {
        id: 3,
        name: 'Горные Пещеры',
        levels: [21, 30],
        description: 'Темные пещеры в горах, где обитают орки.',
        image: 'locations/location_caves.jpg',
        mobs: [
            { name: 'Орк', emoji: '👹', hp: 180, attack: 50, defense: 25, goldReward: [50, 90], expReward: [60, 95] },
            { name: 'Орк-Воин', emoji: '👹', hp: 190, attack: 52, defense: 26, goldReward: [52, 92], expReward: [62, 97] },
            { name: 'Орк-Берсерк', emoji: '👹', hp: 200, attack: 55, defense: 28, goldReward: [55, 95], expReward: [65, 100] }
        ],
        boss: { level: 30, name: 'Вожак Орков', emoji: '👹', hp: 1800, attack: 200, defense: 120, goldReward: 500, expReward: 300, crystalReward: [1, 2], itemDropChance: 0.5 }
    },
    4: {
        id: 4,
        name: 'Проклятые Руины',
        levels: [31, 40],
        description: 'Древние руины, населенные нежитью.',
        image: 'locations/location_ruins.jpg',
        mobs: [
            { name: 'Скелет-Воин', emoji: '💀', hp: 250, attack: 70, defense: 35, goldReward: [80, 130], expReward: [90, 135] },
            { name: 'Скелет-Рыцарь', emoji: '💀', hp: 260, attack: 73, defense: 37, goldReward: [83, 133], expReward: [93, 138] },
            { name: 'Скелет-Чемпион', emoji: '💀', hp: 280, attack: 80, defense: 40, goldReward: [90, 145], expReward: [100, 150] }
        ],
        boss: { level: 40, name: 'Лич', emoji: '☠️', hp: 2500, attack: 260, defense: 160, goldReward: 750, expReward: 400, crystalReward: [1, 2], itemDropChance: 0.6 }
    },
    5: {
        id: 5,
        name: 'Вулканические Земли',
        levels: [41, 50],
        description: 'Раскаленные земли с активными вулканами.',
        image: 'locations/location_volcano.jpg',
        mobs: [
            { name: 'Огненный Элементаль', emoji: '🔥', hp: 320, attack: 95, defense: 45, goldReward: [110, 170], expReward: [120, 175] },
            { name: 'Пылающий Элементаль', emoji: '🔥', hp: 340, attack: 98, defense: 47, goldReward: [113, 173], expReward: [123, 178] },
            { name: 'Инферно Элементаль', emoji: '🔥', hp: 350, attack: 100, defense: 50, goldReward: [120, 185], expReward: [130, 190] }
        ],
        boss: { level: 50, name: 'Огненный Дракон', emoji: '🐉', hp: 3500, attack: 320, defense: 200, goldReward: 1000, expReward: 500, crystalReward: [1, 2], itemDropChance: 0.6 }
    },
    6: {
        id: 6,
        name: 'Ледяные Пустоши',
        levels: [51, 60],
        description: 'Замерзшие земли, покрытые вечным льдом.',
        image: 'locations/location_ice.jpg',
        mobs: [
            { name: 'Ледяной Элементаль', emoji: '❄️', hp: 420, attack: 115, defense: 60, goldReward: [140, 210], expReward: [150, 215] },
            { name: 'Морозный Элементаль', emoji: '❄️', hp: 440, attack: 118, defense: 62, goldReward: [143, 213], expReward: [153, 218] },
            { name: 'Кристальный Элементаль', emoji: '❄️', hp: 450, attack: 125, defense: 70, goldReward: [150, 225], expReward: [160, 230] }
        ],
        boss: { level: 60, name: 'Ледяной Колосс', emoji: '🧊', hp: 4800, attack: 400, defense: 250, goldReward: 1500, expReward: 700, crystalReward: [1, 2], itemDropChance: 0.7 }
    },
    7: {
        id: 7,
        name: 'Драконье Логово',
        levels: [61, 70],
        description: 'Опасное логово драконов в горных вершинах.',
        image: 'locations/location_dragon_lair.jpg',
        mobs: [
            { name: 'Молодой Дракон', emoji: '🐉', hp: 520, attack: 140, defense: 75, goldReward: [170, 250], expReward: [180, 255] },
            { name: 'Красный Дракон', emoji: '🐉', hp: 540, attack: 145, defense: 78, goldReward: [175, 255], expReward: [185, 260] },
            { name: 'Боевой Дракон', emoji: '🐉', hp: 560, attack: 150, defense: 80, goldReward: [180, 265], expReward: [190, 270] }
        ],
        boss: { level: 70, name: 'Древний Дракон', emoji: '🐲', hp: 6500, attack: 480, defense: 300, goldReward: 2000, expReward: 900, crystalReward: [2, 2], itemDropChance: 0.7 }
    },
    8: {
        id: 8,
        name: 'Царство Теней',
        levels: [71, 80],
        description: 'Мрачное царство, где правят тени.',
        image: 'locations/location_shadow.jpg',
        mobs: [
            { name: 'Теневой Убийца', emoji: '🥷', hp: 580, attack: 165, defense: 85, goldReward: [200, 290], expReward: [210, 295] },
            { name: 'Теневой Ассасин', emoji: '🥷', hp: 600, attack: 170, defense: 88, goldReward: [205, 295], expReward: [215, 300] },
            { name: 'Мастер Теней', emoji: '🥷', hp: 620, attack: 175, defense: 90, goldReward: [210, 305], expReward: [220, 310] }
        ],
        boss: { level: 80, name: 'Повелитель Теней', emoji: '🌑', hp: 8500, attack: 560, defense: 360, goldReward: 3000, expReward: 1200, crystalReward: [2, 2], itemDropChance: 0.8 }
    },
    9: {
        id: 9,
        name: 'Адские Врата',
        levels: [81, 90],
        description: 'Врата в преисподнюю, охраняемые демонами.',
        image: 'locations/location_hell.jpg',
        mobs: [
            { name: 'Архидемон', emoji: '👿', hp: 680, attack: 190, defense: 95, goldReward: [230, 330], expReward: [240, 335] },
            { name: 'Демон-Воин', emoji: '👿', hp: 700, attack: 195, defense: 98, goldReward: [235, 335], expReward: [245, 340] },
            { name: 'Демон-Лорд', emoji: '👿', hp: 720, attack: 200, defense: 100, goldReward: [240, 345], expReward: [250, 350] }
        ],
        boss: { level: 90, name: 'Повелитель Демонов', emoji: '😱', hp: 11000, attack: 640, defense: 420, goldReward: 4000, expReward: 1500, crystalReward: [2, 2], itemDropChance: 0.8 }
    },
    10: {
        id: 10,
        name: 'Храм Хаоса',
        levels: [91, 100],
        description: 'Древний храм, где правит первозданный хаос.',
        image: 'locations/location_chaos.jpg',
        mobs: [
            { name: 'Аватар Хаоса', emoji: '☠️', hp: 780, attack: 215, defense: 105, goldReward: [260, 370], expReward: [270, 375] },
            { name: 'Жрец Хаоса', emoji: '☠️', hp: 800, attack: 220, defense: 108, goldReward: [265, 375], expReward: [275, 380] },
            { name: 'Вестник Хаоса', emoji: '☠️', hp: 820, attack: 225, defense: 110, goldReward: [270, 385], expReward: [280, 390] }
        ],
        boss: { level: 100, name: 'Бог Хаоса', emoji: '💀', hp: 14000, attack: 760, defense: 500, goldReward: 6000, expReward: 2000, crystalReward: [2, 3], itemDropChance: 0.9 }
    },
    11: {
        id: 11,
        name: 'Земли Титанов',
        levels: [101, 110],
        description: 'Земли, где обитают древние титаны.',
        image: 'locations/location_titans.jpg',
        mobs: [
            { name: 'Каменный Титан', emoji: '🗿', hp: 880, attack: 240, defense: 115, goldReward: [290, 410], expReward: [300, 415] },
            { name: 'Боевой Титан', emoji: '🗿', hp: 900, attack: 245, defense: 118, goldReward: [295, 415], expReward: [305, 420] },
            { name: 'Древний Титан', emoji: '🗿', hp: 920, attack: 250, defense: 120, goldReward: [300, 425], expReward: [310, 430] }
        ],
        boss: { level: 110, name: 'Титан Разрушения', emoji: '⚡', hp: 18000, attack: 900, defense: 600, goldReward: 8000, expReward: 2500, crystalReward: [2, 3], itemDropChance: 0.9 }
    },
    12: {
        id: 12,
        name: 'Бездна',
        levels: [111, 120],
        description: 'Бесконечная бездна, где обитает древнее зло.',
        image: 'locations/location_abyss.jpg',
        mobs: [
            { name: 'Страж Бездны', emoji: '👁️', hp: 980, attack: 265, defense: 125, goldReward: [320, 450], expReward: [330, 455] },
            { name: 'Ужас Бездны', emoji: '👁️', hp: 1000, attack: 270, defense: 128, goldReward: [325, 455], expReward: [335, 460] },
            { name: 'Древнее Зло', emoji: '👁️', hp: 1020, attack: 275, defense: 130, goldReward: [330, 465], expReward: [340, 470] }
        ],
        boss: { level: 120, name: 'Владыка Бездны', emoji: '🌀', hp: 25000, attack: 1100, defense: 750, goldReward: 10000, expReward: 3000, crystalReward: [3, 3], itemDropChance: 1.0 }
    }
};

// Рейдовые боссы
const RAID_BOSSES = {
    'Повелитель ветра': {
        name: 'Повелитель ветра',
        level: 1,
        hp: 75000,
        image: 'raids/raid_wind_lord.jpg',
        description: 'Древний повелитель стихии ветра',
        rewards: { total_gold: 1000, total_crystals: 20, total_exp: 1000 },
        cooldown_hours: 2,
        requirements: null
    },
    'Владыка тьмы': {
        name: 'Владыка тьмы',
        level: 2,
        hp: 175000,
        image: 'raids/dark_lord.jpg',
        description: 'Повелитель темных сил и теней',
        rewards: { total_gold: 2000, total_crystals: 30, total_exp: 4000 },
        cooldown_hours: 5,
        requirements: { min_race_level: 10, required_raid_participation: 'Повелитель ветра' },
        special_rewards: { top_1_guaranteed_item: 'Амулет тьмы' }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LOCATIONS_DATA, RAID_BOSSES };
}
