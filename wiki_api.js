// API для Wiki энциклопедии
const express = require('express');
const db = require('./database_simple');
const races = require('./races');
const items = require('./items');
const potions = require('./potions');

const router = express.Router();

// Получить все расы
router.get('/races', (req, res) => {
  db.all(`SELECT * FROM races ORDER BY rarity, name`, (err, raceData) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка получения рас' });
    }
    
    // Группируем расы по редкости
    const racesByRarity = {};
    raceData.forEach(race => {
      if (!racesByRarity[race.rarity]) {
        racesByRarity[race.rarity] = [];
      }
      racesByRarity[race.rarity].push({
        id: race.id,
        name: race.name,
        description: race.description,
        rarity: race.rarity,
        basePower: race.base_power,
        baseHP: race.base_hp,
        baseAttack: race.base_attack,
        baseDefense: race.base_defense,
        specialAbility: race.special_ability,
        cost: race.cost
      });
    });
    
    res.json({
      success: true,
      data: racesByRarity,
      total: raceData.length
    });
  });
});

// Получить расы по редкости
router.get('/races/:rarity', (req, res) => {
  const rarity = req.params.rarity.toUpperCase();
  
  db.all(`SELECT * FROM races WHERE rarity = ? ORDER BY name`, [rarity], (err, raceData) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка получения рас' });
    }
    
    const races = raceData.map(race => ({
      id: race.id,
      name: race.name,
      description: race.description,
      rarity: race.rarity,
      basePower: race.base_power,
      baseHP: race.base_hp,
      baseAttack: race.base_attack,
      baseDefense: race.base_defense,
      specialAbility: race.special_ability,
      cost: race.cost
    }));
    
    res.json({
      success: true,
      data: races,
      rarity: rarity
    });
  });
});

// Получить все предметы
router.get('/items', (req, res) => {
  db.all(`SELECT * FROM items ORDER BY rarity, slot, name`, (err, itemData) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка получения предметов' });
    }
    
    // Группируем предметы по типу
    const itemsByType = {};
    itemData.forEach(item => {
      const type = getItemType(item.slot);
      if (!itemsByType[type]) {
        itemsByType[type] = [];
      }
      itemsByType[type].push({
        id: item.id,
        name: item.name,
        description: item.description,
        rarity: item.rarity,
        slot: item.slot,
        powerBonus: item.power_bonus,
        hpBonus: item.hp_bonus,
        attackBonus: item.attack_bonus,
        defenseBonus: item.defense_bonus,
        specialEffect: item.special_effect
      });
    });
    
    res.json({
      success: true,
      data: itemsByType,
      total: itemData.length
    });
  });
});

// Получить предметы по типу
router.get('/items/:type', (req, res) => {
  const type = req.params.type;
  let slots = [];
  
  switch (type) {
    case 'weapon':
      slots = ['weapon'];
      break;
    case 'armor':
      slots = ['helmet', 'chestplate', 'leggings', 'boots'];
      break;
    case 'artifact':
      slots = ['artifact_1', 'artifact_2'];
      break;
    case 'rune':
      slots = ['rune'];
      break;
    default:
      return res.status(400).json({ error: 'Неизвестный тип предмета' });
  }
  
  const placeholders = slots.map(() => '?').join(',');
  db.all(`SELECT * FROM items WHERE slot IN (${placeholders}) ORDER BY rarity, name`, slots, (err, itemData) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка получения предметов' });
    }
    
    const items = itemData.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      rarity: item.rarity,
      slot: item.slot,
      powerBonus: item.power_bonus,
      hpBonus: item.hp_bonus,
      attackBonus: item.attack_bonus,
      defenseBonus: item.defense_bonus,
      specialEffect: item.special_effect
    }));
    
    res.json({
      success: true,
      data: items,
      type: type
    });
  });
});

// Получить зелья
router.get('/potions', (req, res) => {
  db.all(`SELECT * FROM potions ORDER BY name`, (err, potionData) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка получения зелий' });
    }
    
    const potions = potionData.map(potion => ({
      id: potion.id,
      name: potion.name,
      description: potion.description,
      effect: potion.effect,
      duration: potion.duration,
      cost: potion.cost
    }));
    
    res.json({
      success: true,
      data: potions
    });
  });
});

// Получить статистику игры
router.get('/stats', (req, res) => {
  const stats = {};
  
  // Количество рас
  db.get(`SELECT COUNT(*) as count FROM races`, (err, raceCount) => {
    if (err) raceCount = { count: 0 };
    stats.races = raceCount.count;
    
    // Количество предметов
    db.get(`SELECT COUNT(*) as count FROM items`, (err, itemCount) => {
      if (err) itemCount = { count: 0 };
      stats.items = itemCount.count;
      
      // Количество зелий
      db.get(`SELECT COUNT(*) as count FROM potions`, (err, potionCount) => {
        if (err) potionCount = { count: 0 };
        stats.potions = potionCount.count;
        
        // Количество игроков
        db.get(`SELECT COUNT(*) as count FROM players WHERE race_id IS NOT NULL`, (err, playerCount) => {
          if (err) playerCount = { count: 0 };
          stats.players = playerCount.count;
          
          res.json({
            success: true,
            data: stats
          });
        });
      });
    });
  });
});

// Поиск по всем данным
router.get('/search/:query', (req, res) => {
  const query = req.params.query.toLowerCase();
  const results = {
    races: [],
    items: [],
    potions: []
  };
  
  // Поиск рас
  db.all(`SELECT * FROM races WHERE LOWER(name) LIKE ? OR LOWER(description) LIKE ?`, 
    [`%${query}%`, `%${query}%`], (err, raceData) => {
    if (!err && raceData) {
      results.races = raceData.map(race => ({
        id: race.id,
        name: race.name,
        description: race.description,
        rarity: race.rarity,
        type: 'race'
      }));
    }
    
    // Поиск предметов
    db.all(`SELECT * FROM items WHERE LOWER(name) LIKE ? OR LOWER(description) LIKE ?`, 
      [`%${query}%`, `%${query}%`], (err, itemData) => {
      if (!err && itemData) {
        results.items = itemData.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          rarity: item.rarity,
          slot: item.slot,
          type: 'item'
        }));
      }
      
      // Поиск зелий
      db.all(`SELECT * FROM potions WHERE LOWER(name) LIKE ? OR LOWER(description) LIKE ?`, 
        [`%${query}%`, `%${query}%`], (err, potionData) => {
        if (!err && potionData) {
          results.potions = potionData.map(potion => ({
            id: potion.id,
            name: potion.name,
            description: potion.description,
            type: 'potion'
          }));
        }
        
        const totalResults = results.races.length + results.items.length + results.potions.length;
        
        res.json({
          success: true,
          data: results,
          query: query,
          total: totalResults
        });
      });
    });
  });
});

// Вспомогательные функции
function getItemType(slot) {
  if (slot === 'weapon') return 'weapon';
  if (['helmet', 'chestplate', 'leggings', 'boots'].includes(slot)) return 'armor';
  if (['artifact_1', 'artifact_2'].includes(slot)) return 'artifact';
  if (slot === 'rune') return 'rune';
  return 'other';
}

module.exports = router;