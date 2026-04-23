// Система пошаговых боев
const raceAbilities = require('./race_abilities');

const activeBattles = new Map(); // userId -> battleState
const pvpBattles = new Map(); // battleId -> pvpBattleState
const playerWaitingForTurn = new Map(); // userId -> battleId

// Создать новый PvE бой
function createBattle(userId, playerStats, enemy) {
  const battle = {
    userId: userId,
    type: 'pve',
    playerHP: playerStats.hp,
    playerMaxHP: playerStats.hp,
    playerStats: playerStats,
    enemyHP: enemy.hp,
    enemyMaxHP: enemy.hp,
    enemy: enemy,
    round: 1,
    battleLog: [],
    startTime: Date.now(),
    specialEnergy: 0, // Счетчик энергии для спец атаки (нужно 3)
    specialReady: false,
    // Контекст для способностей рас
    battleContext: {
      phoenixRevived: false,
      godShield: 0,
      burnDamage: 0,
      burnTurns: 0
    }
  };
  
  activeBattles.set(userId, battle);
  return battle;
}

// Создать новый PvP бой
function createPvPBattle(player1Id, player1Stats, player2Id, player2Stats) {
  const battleId = `${player1Id}_vs_${player2Id}_${Date.now()}`;
  
  const battle = {
    battleId: battleId,
    type: 'pvp',
    player1: {
      id: player1Id,
      hp: player1Stats.hp,
      maxHP: player1Stats.hp,
      stats: player1Stats,
      action: null,
      username: player1Stats.username,
      specialEnergy: 0,
      specialReady: false
    },
    player2: {
      id: player2Id,
      hp: player2Stats.hp,
      maxHP: player2Stats.hp,
      stats: player2Stats,
      action: null,
      username: player2Stats.username,
      specialEnergy: 0,
      specialReady: false
    },
    round: 1,
    startTime: Date.now(),
    // Контекст для способностей рас
    battleContext: {
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
    }
  };
  
  pvpBattles.set(battleId, battle);
  activeBattles.set(player1Id, { type: 'pvp', battleId: battleId });
  activeBattles.set(player2Id, { type: 'pvp', battleId: battleId });
  
  return battle;
}

// Получить PvP бой
function getPvPBattle(battleId) {
  return pvpBattles.get(battleId);
}

// Получить активный бой игрока
function getBattle(userId) {
  const battle = activeBattles.get(userId);
  if (!battle) return null;
  
  if (battle.type === 'pvp') {
    return getPvPBattle(battle.battleId);
  }
  
  return battle;
}

// Удалить бой
function deleteBattle(userId) {
  const battle = activeBattles.get(userId);
  if (battle && battle.type === 'pvp') {
    const pvpBattle = getPvPBattle(battle.battleId);
    if (pvpBattle) {
      activeBattles.delete(pvpBattle.player1.id);
      activeBattles.delete(pvpBattle.player2.id);
      pvpBattles.delete(battle.battleId);
      playerWaitingForTurn.delete(pvpBattle.player1.id);
      playerWaitingForTurn.delete(pvpBattle.player2.id);
    }
  } else {
    activeBattles.delete(userId);
  }
}

// Установить действие игрока в PvP
function setPvPAction(userId, action) {
  const battleRef = activeBattles.get(userId);
  if (!battleRef || battleRef.type !== 'pvp') return null;
  
  const battle = getPvPBattle(battleRef.battleId);
  if (!battle) return null;
  
  // Устанавливаем действие
  if (battle.player1.id === userId) {
    battle.player1.action = action;
  } else if (battle.player2.id === userId) {
    battle.player2.action = action;
  }
  
  // Проверяем готовы ли оба игрока
  if (battle.player1.action && battle.player2.action) {
    // Проверяем, не обработан ли уже этот раунд
    if (battle.roundProcessed) {
      return { alreadyProcessed: true };
    }
    battle.roundProcessed = true;
    const result = executePvPRound(battle);
    battle.roundProcessed = false;
    return result;
  }
  
  // Один игрок выбрал, ждем второго
  playerWaitingForTurn.set(userId, battleRef.battleId);
  return { waiting: true };
}

// Выполнить раунд PvP
function executePvPRound(battle) {
  const p1 = battle.player1;
  const p2 = battle.player2;
  
  let result = {
    player1Action: null,
    player2Action: null,
    battleOver: false,
    winnerId: null
  };
  
  // Обрабатываем действия обоих игроков одновременно
  
  // Действие игрока 1
  if (p1.action === 'attack') {
    const attackResult = performAttack(p1.stats, p2.stats);
    if (attackResult.dodged) {
      result.player1Action = { text: `💨 ${p2.username} уклонился от вашей атаки!` };
    } else {
      p2.hp -= attackResult.damage;
      let text = `⚔️ ${p1.username}: ${attackResult.damage} урона`;
      if (attackResult.critical) text += ` 💥 КРИТ!`;
      if (attackResult.special) text += ` ✨`;
      result.player1Action = { text: text, damage: attackResult.damage };
    }
    // Накапливаем энергию
    p1.specialEnergy++;
    if (p1.specialEnergy >= 3) p1.specialReady = true;
    
  } else if (p1.action === 'defend') {
    p1.defending = true;
    result.player1Action = { text: `🛡 ${p1.username} принял защитную стойку!` };
    // Защита тоже дает энергию
    p1.specialEnergy++;
    if (p1.specialEnergy >= 3) p1.specialReady = true;
    
  } else if (p1.action === 'special') {
    // Проверяем доступность
    if (!p1.specialReady) {
      result.player1Action = { text: `❌ Спец. атака ${p1.username} не готова! (${p1.specialEnergy}/3)` };
    } else {
      // Спец атака: x2 урона, 20% промах, игнорирует 50% защиты
      if (Math.random() < 0.2) {
        result.player1Action = { text: `❌ Спец. атака ${p1.username} промахнулась!` };
      } else {
        const specialAttack = performAttack(
          { ...p1.stats, attack: p1.stats.attack * 2 },
          { ...p2.stats, defense: p2.stats.defense * 0.5 }
        );
        if (specialAttack.dodged) {
          result.player1Action = { text: `💨 ${p2.username} уклонился от спец. атаки!` };
        } else {
          p2.hp -= specialAttack.damage;
          result.player1Action = { text: `✨ ${p1.username}: ${specialAttack.damage} урона!`, damage: specialAttack.damage };
        }
      }
      // Сбрасываем энергию
      p1.specialEnergy = 0;
      p1.specialReady = false;
    }
  }
  
  // Проверка победы
  if (p2.hp <= 0) {
    result.battleOver = true;
    result.winnerId = p1.id;
    result.player2Action = { text: `💀 ${p2.username} повержен!` };
    return result;
  }
  
  // Действие игрока 2
  if (p2.action === 'attack') {
    const attackResult = performAttack(p2.stats, p1.stats);
    if (attackResult.dodged) {
      result.player2Action = { text: `💨 ${p1.username} уклонился от вашей атаки!` };
    } else {
      let damage = attackResult.damage;
      if (p1.defending) {
        damage = Math.floor(damage * 0.5);
        p1.defending = false;
      }
      p1.hp -= damage;
      let text = `⚔️ ${p2.username}: ${damage} урона`;
      if (attackResult.critical) text += ` 💥 КРИТ!`;
      if (attackResult.special) text += ` ✨`;
      result.player2Action = { text: text, damage: damage };
    }
    // Накапливаем энергию
    p2.specialEnergy++;
    if (p2.specialEnergy >= 3) p2.specialReady = true;
    
  } else if (p2.action === 'defend') {
    p2.defending = true;
    result.player2Action = { text: `🛡 ${p2.username} принял защитную стойку!` };
    // Защита тоже дает энергию
    p2.specialEnergy++;
    if (p2.specialEnergy >= 3) p2.specialReady = true;
    
  } else if (p2.action === 'special') {
    // Проверяем доступность
    if (!p2.specialReady) {
      result.player2Action = { text: `❌ Спец. атака ${p2.username} не готова! (${p2.specialEnergy}/3)` };
    } else {
      // Спец атака: x2 урона, 20% промах, игнорирует 50% защиты
      if (Math.random() < 0.2) {
        result.player2Action = { text: `❌ Спец. атака ${p2.username} промахнулась!` };
      } else {
        const specialAttack = performAttack(
          { ...p2.stats, attack: p2.stats.attack * 2 },
          { ...p1.stats, defense: p1.stats.defense * 0.5 }
        );
        if (specialAttack.dodged) {
          result.player2Action = { text: `💨 ${p1.username} уклонился от спец. атаки!` };
        } else {
          let damage = specialAttack.damage;
          if (p1.defending) {
            damage = Math.floor(damage * 0.5);
            p1.defending = false;
          }
          p1.hp -= damage;
          result.player2Action = { text: `✨ ${p2.username}: ${damage} урона!`, damage: damage };
        }
      }
      // Сбрасываем энергию
      p2.specialEnergy = 0;
      p2.specialReady = false;
    }
  }
  
  // Проверка победы
  if (p1.hp <= 0) {
    result.battleOver = true;
    result.winnerId = p2.id;
    return result;
  }
  
  // Сбрасываем действия и увеличиваем раунд
  p1.action = null;
  p2.action = null;
  
  // Сбрасываем флаг defending если он не был использован
  if (p1.defending) p1.defending = false;
  if (p2.defending) p2.defending = false;
  
  battle.round++;
  
  return result;
}

// Выполнить атаку
function performAttack(attacker, defender, battleContext = null) {
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
      currentHP: attacker.hp || attacker.currentHP,
      maxHP: attacker.maxHP || attacker.hp,
      power: attacker.power,
      attack: attacker.attack,
      defense: attacker.defense
    };
    
    const defenderForAbility = {
      specialAbility: defender.specialAbility,
      currentHP: defender.hp || defender.currentHP,
      maxHP: defender.maxHP || defender.hp
    };
    
    // Применяем способность расы
    attackResult = raceAbilities.applyRaceAbility(
      attackerForAbility, 
      defenderForAbility, 
      attackResult, 
      battleContext
    );
    
    // Обновляем HP атакующего если способность его лечила
    if (attacker.hp !== undefined) {
      attacker.hp = attackerForAbility.currentHP;
    } else if (attacker.currentHP !== undefined) {
      attacker.currentHP = attackerForAbility.currentHP;
    }
  }
  
  // Разброс урона
  const variance = 0.9 + Math.random() * 0.2;
  attackResult.damage = Math.floor(attackResult.damage * variance);
  
  return attackResult;
}

// Выполнить ход игрока
function playerTurn(userId, action) {
  const battle = getBattle(userId);
  if (!battle) return null;
  
  let result = {
    playerAction: null,
    enemyAction: null,
    battleOver: false,
    victory: false
  };
  
  // Применяем эффекты в начале хода (горение, яды и т.д.)
  const playerEffects = raceAbilities.applyTurnEffects(
    { currentHP: battle.playerHP, maxHP: battle.playerMaxHP }, 
    battle.battleContext
  );
  
  const enemyEffects = raceAbilities.applyTurnEffects(
    { currentHP: battle.enemyHP, maxHP: battle.enemyMaxHP }, 
    battle.battleContext
  );
  
  // Обновляем HP после эффектов
  if (playerEffects.length > 0) {
    battle.playerHP = Math.max(0, battle.playerHP);
  }
  if (enemyEffects.length > 0) {
    battle.enemyHP = Math.max(0, battle.enemyHP);
  }
  
  // Действие игрока
  if (action === 'attack') {
    const attackResult = performAttack(battle.playerStats, battle.enemy, battle.battleContext);
    
    if (attackResult.dodged) {
      result.playerAction = {
        type: 'attack',
        text: `💨 ${battle.enemy.name} уклонился от вашей атаки!`
      };
    } else {
      // Применяем защитные способности врага
      const defenseResult = raceAbilities.applyDefensiveAbility(
        { specialAbility: battle.enemy.specialAbility },
        attackResult.damage,
        battle.battleContext
      );
      
      const finalDamage = defenseResult.damage;
      battle.enemyHP -= finalDamage;
      
      let text = `⚔️ Вы атакуете: ${finalDamage} урона`;
      if (attackResult.critical) text += ` 💥 КРИТ!`;
      if (attackResult.special) text += ` ✨ ${attackResult.specialName}`;
      if (attackResult.abilityMessage) text += `\n${attackResult.abilityMessage}`;
      if (defenseResult.abilityMessage) text += `\n${defenseResult.abilityMessage}`;
      
      result.playerAction = {
        type: 'attack',
        text: text,
        damage: finalDamage
      };
    }
    
    // Накапливаем энергию за обычную атаку
    battle.specialEnergy++;
    if (battle.specialEnergy >= 3) {
      battle.specialReady = true;
    }
    
  } else if (action === 'defend') {
    // Защита - уменьшает урон следующей атаки на 50%
    battle.defending = true;
    result.playerAction = {
      type: 'defend',
      text: `🛡 Вы приняли защитную стойку!`
    };
    
    // Защита тоже дает энергию
    battle.specialEnergy++;
    if (battle.specialEnergy >= 3) {
      battle.specialReady = true;
    }
    
  } else if (action === 'special') {
    // Проверяем доступность спец атаки
    if (!battle.specialReady) {
      result.playerAction = {
        type: 'special',
        text: `❌ Спец. атака не готова! (${battle.specialEnergy}/3)`
      };
      // Не тратим ход, возвращаем ошибку
      return result;
    }
    
    // Специальная атака - x2 урона, 20% шанс промаха, игнорирует 50% защиты врага
    const specialStats = {
      ...battle.playerStats,
      attack: battle.playerStats.attack * 2
    };
    
    const enemyStatsReduced = {
      ...battle.enemy,
      defense: battle.enemy.defense * 0.5
    };
    
    if (Math.random() < 0.2) {
      // Промах
      result.playerAction = {
        type: 'special',
        text: `❌ Специальная атака промахнулась!`
      };
    } else {
      const specialAttack = performAttack(specialStats, enemyStatsReduced);
      
      if (specialAttack.dodged) {
        result.playerAction = {
          type: 'special',
          text: `💨 ${battle.enemy.name} уклонился от спец. атаки!`
        };
      } else {
        battle.enemyHP -= specialAttack.damage;
        result.playerAction = {
          type: 'special',
          text: `✨ Специальная атака: ${specialAttack.damage} урона!`,
          damage: specialAttack.damage
        };
      }
    }
    
    // Сбрасываем энергию после использования спец атаки
    battle.specialEnergy = 0;
    battle.specialReady = false;
  }
  
  // Проверка победы
  if (battle.enemyHP <= 0) {
    console.log(`✅ Враг побежден! HP врага: ${battle.enemyHP}`);
    result.battleOver = true;
    result.victory = true;
    // НЕ удаляем бой здесь - удалим в handleBattleEnd
    return result;
  }
  
  console.log(`⚔️ После атаки игрока: Враг ${battle.enemyHP}/${battle.enemyMaxHP} HP`);
  
  // Ход врага
  const enemyAttack = performAttack(battle.enemy, battle.playerStats, battle.battleContext);
  
  if (enemyAttack.dodged) {
    result.enemyAction = {
      text: `💨 Вы уклонились от атаки ${battle.enemy.name}!`
    };
  } else {
    // Применяем защитные способности игрока
    const defenseResult = raceAbilities.applyDefensiveAbility(
      { specialAbility: battle.playerStats.specialAbility },
      enemyAttack.damage,
      battle.battleContext
    );
    
    let damage = defenseResult.damage;
    
    // Если игрок защищался, урон уменьшается
    if (battle.defending) {
      damage = Math.floor(damage * 0.5);
      battle.defending = false;
    }
    
    battle.playerHP -= damage;
    
    let text = `${battle.enemy.emoji} ${battle.enemy.name} атакует: ${damage} урона`;
    if (enemyAttack.critical) text += ` 💥 КРИТ!`;
    if (enemyAttack.special) text += ` ✨ ${enemyAttack.specialName}`;
    if (enemyAttack.abilityMessage) text += `\n${enemyAttack.abilityMessage}`;
    if (defenseResult.abilityMessage) text += `\n${defenseResult.abilityMessage}`;
    
    result.enemyAction = {
      text: text,
      damage: damage
    };
  }
  
  // Проверка поражения
  if (battle.playerHP <= 0) {
    // Проверяем возрождение Феникса
    const playerForRevive = {
      specialAbility: battle.playerStats.specialAbility,
      currentHP: battle.playerHP,
      maxHP: battle.playerMaxHP
    };
    
    if (raceAbilities.checkPhoenixRevive(playerForRevive, battle.battleContext)) {
      battle.playerHP = playerForRevive.currentHP;
      
      // Добавляем сообщение о возрождении
      if (result.enemyAction) {
        result.enemyAction.text += `\n🔥 ВОЗРОЖДЕНИЕ! Феникс восстал из пепла с ${battle.playerHP} HP!`;
      } else {
        result.enemyAction = {
          text: `🔥 ВОЗРОЖДЕНИЕ! Феникс восстал из пепла с ${battle.playerHP} HP!`
        };
      }
    } else {
      result.battleOver = true;
      result.victory = false;
      // НЕ удаляем бой здесь - удалим в handleBattleEnd
      return result;
    }
  }
  
  // Увеличиваем раунд
  battle.round++;
  
  // ВАЖНО: Обновляем бой в Map
  activeBattles.set(userId, battle);
  
  return result;
}

// Получить статус боя для отображения
function getBattleStatus(userId) {
  const battleRef = activeBattles.get(userId);
  if (!battleRef) return null;
  
  if (battleRef.type === 'pvp') {
    const battle = getPvPBattle(battleRef.battleId);
    if (!battle) return null;
    
    const isPlayer1 = battle.player1.id === userId;
    const player = isPlayer1 ? battle.player1 : battle.player2;
    const opponent = isPlayer1 ? battle.player2 : battle.player1;
    
    return {
      type: 'pvp',
      round: battle.round,
      playerHP: player.hp,
      playerMaxHP: player.maxHP,
      playerHPPercent: Math.floor((player.hp / player.maxHP) * 100),
      enemyHP: opponent.hp,
      enemyMaxHP: opponent.maxHP,
      enemyHPPercent: Math.floor((opponent.hp / opponent.maxHP) * 100),
      enemyName: opponent.username,
      enemyEmoji: '👤',
      enemyLevel: opponent.stats.level,
      waitingForOpponent: player.action !== null && opponent.action === null,
      specialEnergy: player.specialEnergy || 0,
      specialReady: player.specialReady || false
    };
  }
  
  // PvE бой
  const battle = battleRef;
  const playerHPPercent = Math.floor((battle.playerHP / battle.playerMaxHP) * 100);
  const enemyHPPercent = Math.floor((battle.enemyHP / battle.enemyMaxHP) * 100);
  
  return {
    type: 'pve',
    round: battle.round,
    playerHP: battle.playerHP,
    playerMaxHP: battle.playerMaxHP,
    playerHPPercent: playerHPPercent,
    enemyHP: battle.enemyHP,
    enemyMaxHP: battle.enemyMaxHP,
    enemyHPPercent: enemyHPPercent,
    enemyName: battle.enemy.name,
    enemyEmoji: battle.enemy.emoji,
    enemyLevel: battle.enemy.level,
    specialEnergy: battle.specialEnergy || 0,
    specialReady: battle.specialReady || false
  };
}

module.exports = {
  createBattle,
  createPvPBattle,
  getBattle,
  getPvPBattle,
  deleteBattle,
  playerTurn,
  setPvPAction,
  getBattleStatus
};
