const db = require('./database_simple');
const config = require('./config');

// Базовые расы
const BASE_RACES = [
  // Обычные расы
  { name: 'Человек', description: 'Сбалансированная раса', rarity: 'COMMON', base_power: 100, base_hp: 100, base_attack: 20, base_defense: 15, special_ability: 'Адаптация: +5% к получению опыта', is_legendary: 0 },
  { name: 'Эльф', description: 'Быстрая и ловкая раса', rarity: 'COMMON', base_power: 90, base_hp: 80, base_attack: 25, base_defense: 10, special_ability: 'Меткость: +10% к атаке', is_legendary: 0 },
  { name: 'Дварф', description: 'Крепкая и выносливая раса', rarity: 'COMMON', base_power: 110, base_hp: 120, base_attack: 18, base_defense: 25, special_ability: 'Стойкость: +15% к защите', is_legendary: 0 },
  { name: 'Орк', description: 'Сильная и агрессивная раса', rarity: 'COMMON', base_power: 120, base_hp: 110, base_attack: 30, base_defense: 12, special_ability: 'Ярость: +15% к атаке при низком HP', is_legendary: 0 },
  
  // Редкие расы
  { name: 'Темный Эльф', description: 'Мастера теневой магии', rarity: 'RARE', base_power: 140, base_hp: 100, base_attack: 35, base_defense: 20, special_ability: 'Теневой удар: 20% шанс критического урона', is_legendary: 0 },
  { name: 'Полуорк', description: 'Гибрид силы и разума', rarity: 'RARE', base_power: 150, base_hp: 130, base_attack: 32, base_defense: 22, special_ability: 'Гибридная сила: +10% ко всем характеристикам', is_legendary: 0 },
  { name: 'Гном', description: 'Мастера изобретений', rarity: 'RARE', base_power: 130, base_hp: 90, base_attack: 28, base_defense: 18, special_ability: 'Инженерия: +20% к эффективности предметов', is_legendary: 0 },
  { name: 'Кентавр', description: 'Быстрые лучники-всадники', rarity: 'RARE', base_power: 145, base_hp: 110, base_attack: 38, base_defense: 16, special_ability: 'Скоростная атака: 25% шанс двойного удара', is_legendary: 0 },
  { name: 'Минотавр', description: 'Могучие воины-быки', rarity: 'RARE', base_power: 160, base_hp: 140, base_attack: 40, base_defense: 28, special_ability: 'Бычий натиск: +30% урона при полном HP', is_legendary: 0 },
  
  // Эпические расы
  { name: 'Драконорожденный', description: 'Потомки древних драконов', rarity: 'EPIC', base_power: 200, base_hp: 180, base_attack: 50, base_defense: 40, special_ability: 'Драконье дыхание: Мощная атака по области', is_legendary: 0 },
  { name: 'Демон', description: 'Существа из преисподней', rarity: 'EPIC', base_power: 220, base_hp: 160, base_attack: 60, base_defense: 35, special_ability: 'Адское пламя: Урон со временем', is_legendary: 0 },
  { name: 'Ангел', description: 'Небесные воины света', rarity: 'EPIC', base_power: 210, base_hp: 170, base_attack: 55, base_defense: 45, special_ability: 'Божественная защита: Восстановление HP', is_legendary: 0 },
  { name: 'Элементаль', description: 'Воплощение стихий', rarity: 'EPIC', base_power: 230, base_hp: 150, base_attack: 65, base_defense: 30, special_ability: 'Стихийная мощь: Случайный элементальный урон', is_legendary: 0 },
  { name: 'Нежить', description: 'Восставшие из мертвых', rarity: 'EPIC', base_power: 190, base_hp: 200, base_attack: 45, base_defense: 50, special_ability: 'Нежизнь: Иммунитет к ядам и болезням', is_legendary: 0 },
  { name: 'Оборотень', description: 'Дети луны', rarity: 'EPIC', base_power: 240, base_hp: 160, base_attack: 70, base_defense: 25, special_ability: 'Лунная ярость: +50% урона ночью', is_legendary: 0 },
  
  // Мистические расы
  { name: 'Феникс', description: 'Бессмертная огненная птица', rarity: 'MYTHIC', base_power: 300, base_hp: 200, base_attack: 80, base_defense: 60, special_ability: 'Возрождение: Воскрешение после смерти', is_legendary: 0 },
  { name: 'Вампир', description: 'Повелители ночи', rarity: 'MYTHIC', base_power: 280, base_hp: 180, base_attack: 85, base_defense: 55, special_ability: 'Кровопийство: Восстановление HP от урона', is_legendary: 0 },
  { name: 'Дракон', description: 'Древние повелители магии', rarity: 'MYTHIC', base_power: 350, base_hp: 250, base_attack: 90, base_defense: 70, special_ability: 'Драконья магия: Мощные заклинания', is_legendary: 0 },
  { name: 'Лич', description: 'Бессмертный некромант', rarity: 'MYTHIC', base_power: 320, base_hp: 180, base_attack: 95, base_defense: 65, special_ability: 'Некромантия: Призыв мертвых союзников', is_legendary: 0 },
  { name: 'Джинн', description: 'Повелитель желаний', rarity: 'MYTHIC', base_power: 310, base_hp: 190, base_attack: 88, base_defense: 62, special_ability: 'Исполнение желаний: Случайный мощный эффект', is_legendary: 0 },
  
  // Легендарные расы
  { name: 'Титан', description: 'Древние гиганты невероятной силы', rarity: 'LEGENDARY', base_power: 500, base_hp: 400, base_attack: 120, base_defense: 100, special_ability: 'Титаническая мощь: Удваивает силу атаки', is_legendary: 1 },
  { name: 'Бог Войны', description: 'Воплощение битвы', rarity: 'LEGENDARY', base_power: 550, base_hp: 380, base_attack: 150, base_defense: 90, special_ability: 'Божественная ярость: Неуязвимость на 2 хода', is_legendary: 1 },
  
  // Секретные расы
  { name: 'Древний', description: 'Первородная сущность', rarity: 'SECRET', base_power: 800, base_hp: 600, base_attack: 200, base_defense: 150, special_ability: 'Первородная сила: Контроль над реальностью', is_legendary: 1 }
];

// Инициализация рас в базе данных
function initializeRaces() {
  // Проверяем тип базы данных
  if (db.prepare) {
    // SQLite
    const stmt = db.prepare(`INSERT OR IGNORE INTO races 
      (name, description, rarity, base_power, base_hp, base_attack, base_defense, special_ability, is_legendary) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    
    BASE_RACES.forEach(race => {
      stmt.run(race.name, race.description, race.rarity, race.base_power, race.base_hp, 
               race.base_attack, race.base_defense, race.special_ability, race.is_legendary);
    });
    
    stmt.finalize();
  } else {
    // PostgreSQL
    BASE_RACES.forEach(race => {
      db.run(`INSERT INTO races 
        (name, description, rarity, base_power, base_hp, base_attack, base_defense, special_ability, is_legendary) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (name) DO NOTHING`,
        [race.name, race.description, race.rarity, race.base_power, race.base_hp, 
         race.base_attack, race.base_defense, race.special_ability, race.is_legendary]);
    });
  }
  
  console.log('Расы инициализированы');
}

// Получить случайную расу по редкости
function getRandomRace(callback) {
  const rand = Math.random() * 100;
  let selectedRarity = 'COMMON';
  
  let cumulative = 0;
  for (const [rarity, data] of Object.entries(config.RARITY)) {
    cumulative += data.chance;
    if (rand <= cumulative) {
      selectedRarity = rarity;
      break;
    }
  }
  
  db.get(`SELECT * FROM races WHERE rarity = ? ORDER BY RANDOM() LIMIT 1`, 
    [selectedRarity], callback);
}

// Скрещивание рас
function crossbreedRaces(race1Id, race2Id, callback) {
  db.all(`SELECT * FROM races WHERE id IN (?, ?)`, [race1Id, race2Id], (err, races) => {
    if (err || races.length !== 2) return callback(err);
    
    const [parent1, parent2] = races;
    
    // Проверяем, существует ли уже такая гибридная раса
    db.get(`SELECT * FROM races WHERE parent_race_1 = ? AND parent_race_2 = ?`, 
      [race1Id, race2Id], (err, existing) => {
        if (existing) return callback(null, existing);
        
        // Создаем новую гибридную расу
        const hybridName = `${parent1.name}-${parent2.name}`;
        const hybridPower = Math.floor((parent1.base_power + parent2.base_power) * 1.2);
        const hybridHP = Math.floor((parent1.base_hp + parent2.base_hp) * 1.15);
        const hybridAttack = Math.floor((parent1.base_attack + parent2.base_attack) * 1.2);
        const hybridDefense = Math.floor((parent1.base_defense + parent2.base_defense) * 1.15);
        
        // Определяем редкость гибрида
        const rarities = ['COMMON', 'RARE', 'EPIC', 'MYTHIC', 'LEGENDARY', 'SECRET'];
        const maxRarityIndex = Math.max(
          rarities.indexOf(parent1.rarity),
          rarities.indexOf(parent2.rarity)
        );
        const hybridRarity = rarities[Math.min(maxRarityIndex + 1, rarities.length - 1)];
        
        db.run(`INSERT INTO races 
          (name, description, rarity, base_power, base_hp, base_attack, base_defense, special_ability, is_legendary, parent_race_1, parent_race_2)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [hybridName, `Гибрид ${parent1.name} и ${parent2.name}`, hybridRarity, 
           hybridPower, hybridHP, hybridAttack, hybridDefense,
           `${parent1.special_ability} + ${parent2.special_ability}`, 
           parent1.is_legendary || parent2.is_legendary ? 1 : 0,
           race1Id, race2Id],
          function(err) {
            if (err) return callback(err);
            db.get(`SELECT * FROM races WHERE id = ?`, [this.lastID], callback);
          });
      });
  });
}

module.exports = {
  initializeRaces,
  getRandomRace,
  crossbreedRaces,
  BASE_RACES
};
