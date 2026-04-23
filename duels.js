const db = require('./database_simple');
const config = require('./config');
const raceAbilities = require('./race_abilities');
const characteristics = require('./characteristics');

// Рассчитать силу игрока
function calculatePlayerPower(playerId, callback) {
  db.get(`SELECT p.*, r.base_power, r.base_hp, r.base_attack, r.base_defense, r.name as race_name, r.special_ability
          FROM players p
          LEFT JOIN races r ON p.race_id = r.id
          WHERE p.user_id = ?`, [playerId], (err, player) => {
    if (err || !player) return callback(err);
    
    // Базовые характеристики расы
    let totalPower = player.base_power || 100;
    let totalHP = player.base_hp || 100;
    let totalAttack = player.base_attack || 20;
    let totalDefense = player.base_defense || 15;
    
    // Бонусы от уровня
    totalPower += player.level * 10;
    totalAttack += player.level * 2;
    totalDefense += player.level * 1.5;
    totalHP += player.level * 5;
    
    // Бонусы от пробуждения
    const awakeningBonus = 1 + (player.awakening_level * 0.1);
    totalPower *= awakeningBonus;
    totalAttack *= awakeningBonus;
    
    // Получаем бонусы от экипированных предметов
    db.all(`SELECT i.* FROM inventory inv
            JOIN items i ON inv.item_id = i.id
            WHERE inv.player_id = ? AND inv.equipped = 1`, [playerId], (err, items) => {
      if (err) {
        console.error('Ошибка загрузки предметов:', err);
        items = [];
      }
      
      // Добавляем бонусы от предметов
      items.forEach(item => {
        let powerBonus = item.power_bonus || 0;
        let hpBonus = item.hp_bonus || 0;
        let attackBonus = item.attack_bonus || 0;
        let defenseBonus = item.defense_bonus || 0;
        
        // Применяем бонус Инженерии (Гном)
        if (player.special_ability) {
          powerBonus = raceAbilities.applyItemBonus({ specialAbility: player.special_ability }, powerBonus);
          hpBonus = raceAbilities.applyItemBonus({ specialAbility: player.special_ability }, hpBonus);
          attackBonus = raceAbilities.applyItemBonus({ specialAbility: player.special_ability }, attackBonus);
          defenseBonus = raceAbilities.applyItemBonus({ specialAbility: player.special_ability }, defenseBonus);
        }
        
        totalPower += powerBonus;
        totalHP += hpBonus;
        totalAttack += attackBonus;
        totalDefense += defenseBonus;
      });
      
      // Получаем бонусы от прокачанных характеристик
      characteristics.getCharacteristicBonuses(playerId, (err, charBonuses) => {
        if (err) {
          console.error('Ошибка получения бонусов характеристик:', err);
          charBonuses = { hp: 0, attack: 0, defense: 0 };
        }
        
        // Добавляем бонусы от характеристик
        totalHP += charBonuses.hp;
        totalAttack += charBonuses.attack;
        totalDefense += charBonuses.defense;
        
        // Элементы и эффекты предметов
        const elements = [];
        const itemEffects = [];
        items.forEach(item => {
          if (item.special_effect) {
            // Добавляем эффект в список
            itemEffects.push(item.special_effect);
            
            // Элементы для отображения
            if (item.special_effect.includes('fire_element')) elements.push('🔥');
            if (item.special_effect.includes('ice_element')) elements.push('❄️');
            if (item.special_effect.includes('lightning_element')) elements.push('⚡');
            if (item.special_effect.includes('dark_element')) elements.push('🌑');
            if (item.special_effect.includes('all_elements')) elements.push('🌈');
          }
        });
        
        // Применяем бонусы расы к характеристикам (Полуорк)
        let stats = {
          power: Math.floor(totalPower),
          hp: Math.floor(totalHP),
          maxHP: Math.floor(totalHP),
          attack: Math.floor(totalAttack),
          defense: Math.floor(totalDefense),
          specialAbility: player.special_ability
        };
        
        stats = raceAbilities.applyStatBonus(stats);
        
        callback(null, {
          power: stats.power,
          hp: stats.hp,
          maxHP: stats.maxHP,
          attack: stats.attack,
          defense: stats.defense,
          elements: elements,
          itemEffects: itemEffects, // Добавляем эффекты предметов
          raceName: player.race_name,
          specialAbility: player.special_ability,
          username: player.username || 'Игрок',
          level: player.level
        });
      });
    });
  });
}

// Провести дуэль с покемон-механикой
function conductDuel(player1Id, player2Id, callback) {
  calculatePlayerPower(player1Id, (err, p1Stats) => {
    if (err) return callback(err);
    
    calculatePlayerPower(player2Id, (err, p2Stats) => {
      if (err) return callback(err);
      
      // Начальные HP
      let p1HP = p1Stats.hp;
      let p2HP = p2Stats.hp;
      const p1MaxHP = p1Stats.hp;
      const p2MaxHP = p2Stats.hp;
      
      // Контекст боя для способностей рас
      const battleContext = {
        player1: {
          phoenixRevived: false,
          godShield: 0,
          burnDamage: 0,
          burnTurns: 0
        },
        player2: {
          phoenixRevived: false,
          godShield: 0,
          burnDamage: 0,
          burnTurns: 0
        }
      };
      
      const battleLog = [];
      let round = 1;
      
      // Заголовок боя
      battleLog.push(`⚔️ ${p1Stats.username} (${p1Stats.raceName}) VS ${p2Stats.username} (${p2Stats.raceName})`);
      battleLog.push(`❤️ ${p1HP}/${p1MaxHP} HP | ⚔️ ${p1Stats.attack} ATK | 🛡 ${p1Stats.defense} DEF`);
      battleLog.push(`❤️ ${p2HP}/${p2MaxHP} HP | ⚔️ ${p2Stats.attack} ATK | 🛡 ${p2Stats.defense} DEF`);
      battleLog.push(`━━━━━━━━━━━━━━━━━━━━`);
      
      while (p1HP > 0 && p2HP > 0 && round <= 15) {
        battleLog.push(`\n🔸 Раунд ${round}`);
        
        // Применяем эффекты в начале хода
        const p1Effects = raceAbilities.applyTurnEffects(
          { currentHP: p1HP, maxHP: p1MaxHP }, 
          battleContext.player1
        );
        const p2Effects = raceAbilities.applyTurnEffects(
          { currentHP: p2HP, maxHP: p2MaxHP }, 
          battleContext.player2
        );
        
        if (p1Effects.length > 0) {
          p1Effects.forEach(effect => battleLog.push(effect));
        }
        if (p2Effects.length > 0) {
          p2Effects.forEach(effect => battleLog.push(effect));
        }
        
        // ХОД ИГРОКА 1
        p1Stats.hp = p1HP; // Обновляем текущее HP для способностей
        const p1Action = performAttack(p1Stats, p2Stats, 1, battleContext.player1);
        p1HP = p1Stats.hp; // Получаем обновленное HP (если была регенерация)
        
        if (p1Action.dodged) {
          battleLog.push(`💨 ${p2Stats.username} уклонился от атаки!`);
        } else {
          // Применяем защитные способности игрока 2
          const defenseResult = raceAbilities.applyDefensiveAbility(
            { specialAbility: p2Stats.specialAbility },
            p1Action.damage,
            battleContext.player2
          );
          
          const finalDamage = defenseResult.damage;
          p2HP -= finalDamage;
          
          let attackMsg = `⚔️ ${p1Stats.username}: ${finalDamage} урона`;
          if (p1Action.critical) attackMsg += ` 💥 КРИТ!`;
          if (p1Action.special) attackMsg += ` ✨ ${p1Action.specialName}`;
          battleLog.push(attackMsg);
          
          if (p1Action.abilityMessage) battleLog.push(`   ${p1Action.abilityMessage}`);
          if (defenseResult.abilityMessage) battleLog.push(`   ${defenseResult.abilityMessage}`);
          
          battleLog.push(`   ${p2Stats.username}: ${Math.max(0, p2HP)}/${p2MaxHP} HP`);
        }
        
        if (p2HP <= 0) {
          // Проверяем возрождение Феникса для игрока 2
          const p2ForRevive = {
            specialAbility: p2Stats.specialAbility,
            currentHP: p2HP,
            maxHP: p2MaxHP
          };
          
          if (raceAbilities.checkPhoenixRevive(p2ForRevive, battleContext.player2)) {
            p2HP = p2ForRevive.currentHP;
            battleLog.push(`🔥 ВОЗРОЖДЕНИЕ! ${p2Stats.username} восстал из пепла с ${p2HP} HP!`);
          } else {
            battleLog.push(`\n🏆 ${p1Stats.username} победил!`);
            break;
          }
        }
        
        // ХОД ИГРОКА 2
        p2Stats.hp = p2HP; // Обновляем текущее HP для способностей
        const p2Action = performAttack(p2Stats, p1Stats, 2, battleContext.player2);
        p2HP = p2Stats.hp; // Получаем обновленное HP (если была регенерация)
        
        if (p2Action.dodged) {
          battleLog.push(`💨 ${p1Stats.username} уклонился от атаки!`);
        } else {
          // Применяем защитные способности игрока 1
          const defenseResult = raceAbilities.applyDefensiveAbility(
            { specialAbility: p1Stats.specialAbility },
            p2Action.damage,
            battleContext.player1
          );
          
          const finalDamage = defenseResult.damage;
          p1HP -= finalDamage;
          
          let attackMsg = `⚔️ ${p2Stats.username}: ${finalDamage} урона`;
          if (p2Action.critical) attackMsg += ` 💥 КРИТ!`;
          if (p2Action.special) attackMsg += ` ✨ ${p2Action.specialName}`;
          battleLog.push(attackMsg);
          
          if (p2Action.abilityMessage) battleLog.push(`   ${p2Action.abilityMessage}`);
          if (defenseResult.abilityMessage) battleLog.push(`   ${defenseResult.abilityMessage}`);
          
          battleLog.push(`   ${p1Stats.username}: ${Math.max(0, p1HP)}/${p1MaxHP} HP`);
        }
        
        if (p1HP <= 0) {
          // Проверяем возрождение Феникса для игрока 1
          const p1ForRevive = {
            specialAbility: p1Stats.specialAbility,
            currentHP: p1HP,
            maxHP: p1MaxHP
          };
          
          if (raceAbilities.checkPhoenixRevive(p1ForRevive, battleContext.player1)) {
            p1HP = p1ForRevive.currentHP;
            battleLog.push(`🔥 ВОЗРОЖДЕНИЕ! ${p1Stats.username} восстал из пепла с ${p1HP} HP!`);
          } else {
            battleLog.push(`\n🏆 ${p2Stats.username} победил!`);
            break;
          }
        }
        
        round++;
      }
      
      // Определяем победителя
      const winnerId = p1HP > p2HP ? player1Id : player2Id;
      const loserId = winnerId === player1Id ? player2Id : player1Id;
      const winnerStats = winnerId === player1Id ? p1Stats : p2Stats;
      const loserStats = loserId === player1Id ? p1Stats : p2Stats;
      
      // Применяем бонусы к опыту от способностей рас
      let winnerExp = 50;
      let loserExp = 10;
      
      winnerExp = raceAbilities.applyExpBonus(
        { specialAbility: winnerStats.specialAbility },
        winnerExp
      );
      
      loserExp = raceAbilities.applyExpBonus(
        { specialAbility: loserStats.specialAbility },
        loserExp
      );
      
      // Обновляем статистику
      db.run(`UPDATE players SET wins = wins + 1, exp = exp + ? WHERE user_id = ?`, [winnerExp, winnerId]);
      db.run(`UPDATE players SET losses = losses + 1, exp = exp + ? WHERE user_id = ?`, [loserExp, loserId]);
      
      callback(null, {
        winnerId,
        loserId,
        battleLog,
        p1Stats,
        p2Stats,
        rounds: round
      });
    });
  });
}

// Выполнить атаку с механикой покемонов
function performAttack(attacker, defender, playerNum, battleContext = null) {
  // Шанс уклонения (5% базовый + бонус от защиты)
  const dodgeChance = 0.05 + (defender.defense / 1000);
  if (Math.random() < dodgeChance) {
    return { dodged: true, damage: 0 };
  }
  
  // Базовый урон
  let damage = attacker.attack - (defender.defense * 0.3);
  damage = Math.max(5, damage); // Минимум 5 урона
  
  // Шанс критического удара (10% базовый + бонус от атаки)
  const critChance = 0.10 + (attacker.attack / 500);
  const isCritical = Math.random() < critChance;
  if (isCritical) {
    damage *= 2;
  }
  
  // Создаем результат атаки
  let attackResult = {
    damage: Math.floor(damage),
    critical: isCritical,
    special: false,
    specialName: '',
    dodged: false
  };
  
  // Применяем способности расы атакующего
  if (attacker.specialAbility) {
    // Подготавливаем объекты для системы способностей
    const attackerForAbility = {
      specialAbility: attacker.specialAbility,
      currentHP: attacker.hp,
      maxHP: attacker.maxHP,
      power: attacker.power,
      attack: attacker.attack,
      defense: attacker.defense
    };
    
    const defenderForAbility = {
      specialAbility: defender.specialAbility,
      currentHP: defender.hp,
      maxHP: defender.maxHP
    };
    
    // Применяем способность расы
    attackResult = raceAbilities.applyRaceAbility(
      attackerForAbility, 
      defenderForAbility, 
      attackResult, 
      battleContext
    );
    
    // Обновляем HP атакующего если способность его лечила
    attacker.hp = attackerForAbility.currentHP;
  }
  
  // Случайный разброс урона ±10%
  const variance = 0.9 + Math.random() * 0.2;
  attackResult.damage = Math.floor(attackResult.damage * variance);
  
  return attackResult;
}

// Получить топ игроков
function getTopPlayers(limit, callback) {
  db.all(`SELECT p.user_id, p.username, p.display_name, p.level, p.mmr, p.forest_level, p.power, p.gold, p.wins, p.losses, p.is_vip,
          r.name as race_name, r.rarity as race_rarity
          FROM players p
          LEFT JOIN races r ON p.race_id = r.id
          WHERE p.race_id IS NOT NULL AND p.username != ?
          ORDER BY p.forest_level DESC, p.power DESC, p.gold DESC
          LIMIT ?`, [config.ADMIN_USERNAME, limit], callback);
}

module.exports = {
  calculatePlayerPower,
  conductDuel,
  getTopPlayers
};
