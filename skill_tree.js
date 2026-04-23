const db = require('./database_simple');

// Древо навыков
const SKILL_TREE = [
  // Базовые навыки (уровень 1)
  { id: 1, name: 'Сила воина', description: '+10 к атаке', required_level: 1, cost: 100, parent_skill_id: null, bonus_type: 'attack', bonus_value: 10 },
  { id: 2, name: 'Стойкость', description: '+20 к HP', required_level: 1, cost: 100, parent_skill_id: null, bonus_type: 'hp', bonus_value: 20 },
  { id: 3, name: 'Защитник', description: '+5 к защите', required_level: 1, cost: 100, parent_skill_id: null, bonus_type: 'defense', bonus_value: 5 },
  
  // Продвинутые навыки (уровень 5)
  { id: 4, name: 'Мастер клинка', description: '+20 к атаке', required_level: 5, cost: 300, parent_skill_id: 1, bonus_type: 'attack', bonus_value: 20 },
  { id: 5, name: 'Железная воля', description: '+50 к HP', required_level: 5, cost: 300, parent_skill_id: 2, bonus_type: 'hp', bonus_value: 50 },
  { id: 6, name: 'Крепкая броня', description: '+15 к защите', required_level: 5, cost: 300, parent_skill_id: 3, bonus_type: 'defense', bonus_value: 15 },
  
  // Экспертные навыки (уровень 10)
  { id: 7, name: 'Берсерк', description: '+30 к атаке, +10% критический урон', required_level: 10, cost: 500, parent_skill_id: 4, bonus_type: 'attack_crit', bonus_value: 30 },
  { id: 8, name: 'Регенерация', description: '+100 к HP, восстановление в бою', required_level: 10, cost: 500, parent_skill_id: 5, bonus_type: 'hp_regen', bonus_value: 100 },
  { id: 9, name: 'Отражение', description: '+25 к защите, 10% отражение урона', required_level: 10, cost: 500, parent_skill_id: 6, bonus_type: 'defense_reflect', bonus_value: 25 },
  
  // Мастерские навыки (уровень 15)
  { id: 10, name: 'Ярость дракона', description: '+50 к атаке, огненный урон', required_level: 15, cost: 800, parent_skill_id: 7, bonus_type: 'fire_attack', bonus_value: 50 },
  { id: 11, name: 'Бессмертие', description: '+200 к HP, воскрешение', required_level: 15, cost: 800, parent_skill_id: 8, bonus_type: 'immortal', bonus_value: 200 },
  { id: 12, name: 'Неуязвимость', description: '+50 к защите, иммунитет к дебаффам', required_level: 15, cost: 800, parent_skill_id: 9, bonus_type: 'immunity', bonus_value: 50 },
  
  // Легендарные навыки (уровень 20)
  { id: 13, name: 'Божественная сила', description: 'Удваивает все характеристики', required_level: 20, cost: 1500, parent_skill_id: 10, bonus_type: 'double_stats', bonus_value: 100 },
  { id: 14, name: 'Вечная жизнь', description: 'Бесконечное HP', required_level: 20, cost: 1500, parent_skill_id: 11, bonus_type: 'infinite_hp', bonus_value: 1000 },
  { id: 15, name: 'Абсолютная защита', description: 'Полная неуязвимость', required_level: 20, cost: 1500, parent_skill_id: 12, bonus_type: 'absolute_defense', bonus_value: 100 }
];

// Инициализация древа навыков
function initializeSkillTree() {
  // Проверяем тип базы данных
  if (db.prepare) {
    // SQLite
    const stmt = db.prepare(`INSERT OR IGNORE INTO skill_tree 
      (id, name, description, required_level, cost, parent_skill_id, bonus_type, bonus_value) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    
    SKILL_TREE.forEach(skill => {
      stmt.run(skill.id, skill.name, skill.description, skill.required_level, 
               skill.cost, skill.parent_skill_id, skill.bonus_type, skill.bonus_value);
    });
    
    stmt.finalize();
  } else {
    // PostgreSQL
    SKILL_TREE.forEach(skill => {
      db.run(`INSERT INTO skill_tree 
        (id, name, description, required_level, cost, parent_skill_id, bonus_type, bonus_value) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING`,
        [skill.id, skill.name, skill.description, skill.required_level, 
         skill.cost, skill.parent_skill_id, skill.bonus_type, skill.bonus_value]);
    });
  }
  
  console.log('Древо навыков инициализировано');
}

// Получить доступные навыки для игрока
function getAvailableSkills(playerId, callback) {
  db.get(`SELECT level FROM players WHERE user_id = ?`, [playerId], (err, player) => {
    if (err) return callback(err);
    
    // Получаем изученные навыки
    db.all(`SELECT skill_id FROM player_skills WHERE player_id = ?`, [playerId], (err, learnedSkills) => {
      if (err) return callback(err);
      
      const learnedIds = learnedSkills.map(s => s.skill_id);
      
      // Получаем доступные навыки
      db.all(`SELECT * FROM skill_tree WHERE required_level <= ? ORDER BY required_level, cost`, 
        [player.level], (err, allSkills) => {
          if (err) return callback(err);
          
          const availableSkills = allSkills.filter(skill => {
            // Уже изучен
            if (learnedIds.includes(skill.id)) return false;
            
            // Нет родительского навыка - доступен
            if (!skill.parent_skill_id) return true;
            
            // Родительский навык изучен - доступен
            return learnedIds.includes(skill.parent_skill_id);
          });
          
          callback(null, availableSkills);
        });
    });
  });
}

// Изучить навык
function learnSkill(playerId, skillId, callback) {
  db.get(`SELECT * FROM skill_tree WHERE id = ?`, [skillId], (err, skill) => {
    if (err || !skill) return callback(err || new Error('Навык не найден'));
    
    db.get(`SELECT level, gold FROM players WHERE user_id = ?`, [playerId], (err, player) => {
      if (err || !player) return callback(err || new Error('Игрок не найден'));
      
      // Проверки
      if (player.level < skill.required_level) {
        return callback(new Error(`Нужен ${skill.required_level} уровень`));
      }
      
      if (player.gold < skill.cost) {
        return callback(new Error(`Нужно ${skill.cost} золота`));
      }
      
      // Проверяем родительский навык
      if (skill.parent_skill_id) {
        db.get(`SELECT * FROM player_skills WHERE player_id = ? AND skill_id = ?`, 
          [playerId, skill.parent_skill_id], (err, parentSkill) => {
            if (!parentSkill) {
              return callback(new Error('Сначала изучите предыдущий навык'));
            }
            
            learnSkillFinal();
          });
      } else {
        learnSkillFinal();
      }
      
      function learnSkillFinal() {
        // Списываем золото
        db.run(`UPDATE players SET gold = gold - ? WHERE user_id = ?`, [skill.cost, playerId], (err) => {
          if (err) return callback(err);
          
          // Добавляем навык
          db.run(`INSERT INTO player_skills (player_id, skill_id) VALUES (?, ?)`, 
            [playerId, skillId], (err) => {
              callback(err, skill);
            });
        });
      }
    });
  });
}

// Получить изученные навыки игрока
function getPlayerSkills(playerId, callback) {
  db.all(`SELECT st.*, ps.level as skill_level FROM skill_tree st
          JOIN player_skills ps ON st.id = ps.skill_id
          WHERE ps.player_id = ?
          ORDER BY st.required_level`, [playerId], callback);
}

module.exports = {
  initializeSkillTree,
  getAvailableSkills,
  learnSkill,
  getPlayerSkills,
  SKILL_TREE
};