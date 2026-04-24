// Система пошаговых боев
const raceAbilities = require('./race_abilities');
const speedSystem = require('./speed_system');
const elementalSystem = require('./elemental_system');

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
      burnTurns: 0,
      berserkMode: false,
      immortalChance: 0
    }
  };
  
  activeBattles.set(userId, battle);
  return battle;
}

// Создать новый PvP бой
function createPvPBattle(player1Id, player1Stats, player2Id, player2Stats) {
  const battleId = `${player1Id}_vs_${player2Id}_${Date.now()}`;
  
  // Проверяем есть ли уже рассчитанная скорость
  if (!player1Stats.speed) {
    // Рассчитываем скорость только если её нет
    const p1Speed = speedSystem.calculatePlayerSpeed(player1Stats, player1Stats.itemEffects);
    player1Stats.speed = p1Speed.totalSpeed;
  }
  
  if (!player2Stats.speed) {
    // Рассчитываем скорость только если её нет
    const p2Speed = speedSystem.calculatePlayerSpeed(player2Stats, player2Stats.itemEffects);
    player2Stats.speed = p2Speed.totalSpeed;
  }
  
  console.log('🏃 Финальные скорости в PvP бою:');
  console.log(`  - ${player1Stats.username}: ${player1Stats.speed}`);
  console.log(`  - ${player2Stats.username}: ${player2Stats.speed}`);
  
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
      specialReady: false,
      battleContext: {
        phoenixRevived: false,
        godShield: 0,
        burnDamage: 0,
        burnTurns: 0,
        freezeTurns: 0,
        stunTurns: 0,
        curseTurns: 0,
        curseEffect: 0,
        berserkMode: false,
        immortalChance: 0
      }
    },
    player2: {
      id: player2Id,
      hp: player2Stats.hp,
      maxHP: player2Stats.hp,
      stats: player2Stats,
      action: null,
      username: player2Stats.username,
      specialEnergy: 0,
      specialReady: false,
      battleContext: {
        phoenixRevived: false,
        godShield: 0,
        burnDamage: 0,
        burnTurns: 0,
        freezeTurns: 0,
        stunTurns: 0,
        curseTurns: 0,
        curseEffect: 0,
        berserkMode: false,
        immortalChance: 0
      }
    },
    round: 1,
    startTime: Date.now()
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
    winnerId: null,
    statusEffects: []
  };
  
  // Применяем эффекты состояний в начале раунда
  const p1StatusResult = elementalSystem.applyStatusEffects(p1.stats, p1.battleContext);
  const p2StatusResult = elementalSystem.applyStatusEffects(p2.stats, p2.battleContext);
  
  if (p1StatusResult.effects.length > 0) {
    result.statusEffects.push(`${p1.username}: ${p1StatusResult.effects.join(', ')}`);
  }
  if (p2StatusResult.effects.length > 0) {
    result.statusEffects.push(`${p2.username}: ${p2StatusResult.effects.join(', ')}`);
  }
  
  // Проверяем смерть от эффектов
  if (p1.hp <= 0) {
    result.battleOver = true;
    result.winnerId = p2.id;
    return result;
  }
  if (p2.hp <= 0) {
    result.battleOver = true;
    result.winnerId = p1.id;
    return result;
  }
  
  // Определяем порядок ходов на основе скорости
  const p1Speed = p1.stats.speed || 100;
  const p2Speed = p2.stats.speed || 100;
  
  const firstPlayer = speedSystem.determineTurnOrder(p1Speed, p2Speed);
  
  // Выполняем действия в порядке скорости
  const actions = firstPlayer === 'player1' ? 
    [{ player: p1, opponent: p2, resultKey: 'player1Action' }, 
     { player: p2, opponent: p1, resultKey: 'player2Action' }] :
    [{ player: p2, opponent: p1, resultKey: 'player2Action' }, 
     { player: p1, opponent: p2, resultKey: 'player1Action' }];
  
  for (const { player, opponent, resultKey } of actions) {
    // Проверяем может ли игрок действовать (не заморожен/оглушен)
    const canAct = player === p1 ? p1StatusResult.canAct : p2StatusResult.canAct;
    
    if (!canAct) {
      result[resultKey] = { text: `❄️⚡ ${player.username} не может действовать!` };
      continue;
    }
    
    // Применяем проклятие к характеристикам
    const modifiedStats = elementalSystem.applyCurseEffect(player.stats, player.battleContext);
    
    if (player.action === 'attack') {
      const attackResult = performAttack(modifiedStats, opponent.stats, player.battleContext);
      if (attackResult.dodged) {
        result[resultKey] = { text: `💨 ${opponent.username} уклонился от атаки ${player.username}!` };
      } else {
        let totalDamage = attackResult.totalDamage || attackResult.damage;
        opponent.hp -= totalDamage;
        
        // Формируем детализацию урона
        let damageDetails = [];
        const breakdown = attackResult.damageBreakdown;
        
        if (breakdown) {
          if (breakdown.base > 0) damageDetails.push(`Атака ${breakdown.base}`);
          if (breakdown.critical > 0) damageDetails.push(`Крит ${breakdown.critical}`);
          if (breakdown.ability.damage > 0) damageDetails.push(`${breakdown.ability.name} ${breakdown.ability.damage}`);
          if (breakdown.elemental.damage > 0) damageDetails.push(`${breakdown.elemental.name} ${breakdown.elemental.damage}`);
          if (breakdown.items && breakdown.items.length > 0) {
            breakdown.items.forEach(item => {
              if (item.damageBonus > 0) {
                damageDetails.push(`${item.name} ${item.damageBonus}`);
              }
            });
          }
        }
        
        let text = `⚔️ ${player.username}: ${totalDamage} урона`;
        if (damageDetails.length > 0) {
          text += ` (${damageDetails.join(' + ')})`;
        }
        
        if (attackResult.critical) text += ` 💥 КРИТ!`;
        if (attackResult.doubleAttack) text += ` ⚡⚡ ДВОЙНАЯ АТАКА!`;
        if (attackResult.special) text += ` ✨`;
        if (attackResult.abilityMessage) text += `\n${attackResult.abilityMessage}`;
        if (attackResult.elementalMessage) text += `\n${attackResult.elementalMessage}`;
        
        result[resultKey] = { text: text, damage: totalDamage };
        
        // Применяем элементальные эффекты к противнику
        if (player.battleContext && player.battleContext.opponentEffects) {
          const opponentContext = opponent.battleContext;
          const effects = player.battleContext.opponentEffects;
          
          if (effects.burnDamage) {
            opponentContext.burnDamage = effects.burnDamage;
            opponentContext.burnTurns = effects.burnTurns;
          }
          if (effects.freezeTurns) {
            opponentContext.freezeTurns = effects.freezeTurns;
          }
          if (effects.stunTurns) {
            opponentContext.stunTurns = effects.stunTurns;
          }
          if (effects.curseTurns) {
            opponentContext.curseTurns = effects.curseTurns;
            opponentContext.curseEffect = effects.curseEffect;
          }
          
          // Очищаем временные эффекты
          player.battleContext.opponentEffects = {};
        }
      }
      // Накапливаем энергию
      player.specialEnergy++;
      if (player.specialEnergy >= 3) player.specialReady = true;
      
    } else if (player.action === 'defend') {
      player.defending = true;
      result[resultKey] = { text: `🛡 ${player.username} принял защитную стойку!` };
      // Защита тоже дает энергию
      player.specialEnergy++;
      if (player.specialEnergy >= 3) player.specialReady = true;
      
    } else if (player.action === 'special') {
      // Проверяем доступность
      if (!player.specialReady) {
        result[resultKey] = { text: `❌ Спец. атака ${player.username} не готова! (${player.specialEnergy}/3)` };
      } else {
        // Спец атака: x2 урона, 20% промах, игнорирует 50% защиты
        if (Math.random() < 0.2) {
          result[resultKey] = { text: `❌ Спец. атака ${player.username} промахнулась!` };
        } else {
          const specialStats = {
            ...modifiedStats,
            attack: modifiedStats.attack * 2
          };
          const specialDefense = {
            ...opponent.stats,
            defense: opponent.stats.defense * 0.5
          };
          
          const specialAttack = performAttack(specialStats, specialDefense, player.battleContext);
          if (specialAttack.dodged) {
            result[resultKey] = { text: `💨 ${opponent.username} уклонился от спец. атаки!` };
          } else {
            let totalDamage = specialAttack.totalDamage || specialAttack.damage;
            if (player.defending) {
              totalDamage = Math.floor(totalDamage * 0.5);
              player.defending = false;
            }
            opponent.hp -= totalDamage;
            
            // Формируем детализацию урона для спецатаки
            let damageDetails = [];
            const breakdown = specialAttack.damageBreakdown;
            
            if (breakdown) {
              if (breakdown.base > 0) damageDetails.push(`Спец.атака ${breakdown.base}`);
              if (breakdown.critical > 0) damageDetails.push(`Крит ${breakdown.critical}`);
              if (breakdown.ability.damage > 0) damageDetails.push(`${breakdown.ability.name} ${breakdown.ability.damage}`);
              if (breakdown.elemental.damage > 0) damageDetails.push(`${breakdown.elemental.name} ${breakdown.elemental.damage}`);
              if (breakdown.items && breakdown.items.length > 0) {
                breakdown.items.forEach(item => {
                  if (item.damageBonus > 0) {
                    damageDetails.push(`${item.name} ${item.damageBonus}`);
                  }
                });
              }
            }
            
            let text = `✨ ${player.username}: ${totalDamage} урона!`;
            if (damageDetails.length > 0) {
              text += ` (${damageDetails.join(' + ')})`;
            }
            
            if (specialAttack.doubleAttack) text += ` ⚡⚡ ДВОЙНАЯ СПЕЦ. АТАКА!`;
            if (specialAttack.abilityMessage) text += `\n${specialAttack.abilityMessage}`;
            if (specialAttack.elementalMessage) text += `\n${specialAttack.elementalMessage}`;
            
            result[resultKey] = { text: text, damage: totalDamage };
            
            // Применяем элементальные эффекты к противнику
            if (player.battleContext && player.battleContext.opponentEffects) {
              const opponentContext = opponent.battleContext;
              const effects = player.battleContext.opponentEffects;
              
              if (effects.burnDamage) {
                opponentContext.burnDamage = effects.burnDamage;
                opponentContext.burnTurns = effects.burnTurns;
              }
              if (effects.freezeTurns) {
                opponentContext.freezeTurns = effects.freezeTurns;
              }
              if (effects.stunTurns) {
                opponentContext.stunTurns = effects.stunTurns;
              }
              if (effects.curseTurns) {
                opponentContext.curseTurns = effects.curseTurns;
                opponentContext.curseEffect = effects.curseEffect;
              }
              
              // Очищаем временные эффекты
              player.battleContext.opponentEffects = {};
            }
          }
        }
        // Сбрасываем энергию
        player.specialEnergy = 0;
        player.specialReady = false;
      }
    }
    
    // Проверка победы после каждого действия
    if (opponent.hp <= 0) {
      result.battleOver = true;
      result.winnerId = player.id;
      result[resultKey === 'player1Action' ? 'player2Action' : 'player1Action'] = 
        { text: `💀 ${opponent.username} повержен!` };
      return result;
    }
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
  // Рассчитываем скорости для критов и уклонений
  const attackerSpeed = attacker.speed || 100;
  const defenderSpeed = defender.speed || 100;
  
  // Модифицируем шанс уклонения с учетом скорости
  let dodgeChance = speedSystem.calculateDodgeChance(defenderSpeed, attackerSpeed);
  if (defender.itemEffects && defender.itemEffects.length > 0) {
    dodgeChance = raceAbilities.modifyDodgeWithItems(dodgeChance, defender.itemEffects);
  }
  
  if (Math.random() < dodgeChance) {
    return { dodged: true, damage: 0 };
  }
  
  // Базовый урон
  let baseDamage = attacker.attack - (defender.defense * 0.3);
  baseDamage = Math.max(5, baseDamage);
  
  // Детализация урона с названиями источников
  let damageBreakdown = {
    base: Math.floor(baseDamage),
    critical: 0,
    ability: { damage: 0, name: '' },
    elemental: { damage: 0, name: '' },
    items: [],  // Массив для детального описания предметов
    total: 0
  };
  
  let totalDamage = baseDamage;
  
  // Шанс критического удара с учетом скорости
  const critChance = speedSystem.calculateCritChance(attackerSpeed, defenderSpeed);
  const isCritical = Math.random() < critChance;
  if (isCritical) {
    const critDamage = baseDamage; // x2 урона = +100% = +baseDamage
    damageBreakdown.critical = Math.floor(critDamage);
    totalDamage += critDamage;
  }
  
  // Проверяем двойную атаку
  const isDoubleAttack = speedSystem.checkDoubleAttack(attackerSpeed, defenderSpeed);
  if (isDoubleAttack) {
    totalDamage = speedSystem.modifyDamageBySpeed(totalDamage, attackerSpeed, defenderSpeed, true);
  }
  
  // Создаем результат атаки
  let attackResult = {
    damage: Math.floor(totalDamage),
    damageBreakdown: damageBreakdown,
    critical: isCritical,
    doubleAttack: isDoubleAttack,
    special: false,
    specialName: '',
    dodged: false
  };
  
  // Применяем способности расы атакующего
  if (attacker.specialAbility) {
    const originalDamage = attackResult.damage;
    
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
    
    // Рассчитываем урон от способности
    const abilityDamage = attackResult.damage - originalDamage;
    if (abilityDamage > 0) {
      damageBreakdown.ability.damage = abilityDamage;
      damageBreakdown.ability.name = attacker.raceName || 'Расовая способность';
    }
    
    // Обновляем HP атакующего если способность его лечила
    if (attacker.hp !== undefined) {
      attacker.hp = attackerForAbility.currentHP;
    } else if (attacker.currentHP !== undefined) {
      attacker.currentHP = attackerForAbility.currentHP;
    }
  }
  
  // Применяем модификацию урона от рун и предметов атакующего
  if (attacker.itemEffects && attacker.itemEffects.length > 0) {
    const originalDamage = attackResult.damage;
    
    const runeResult = raceAbilities.modifyDamageWithItems(attackResult.damage, attacker.itemEffects, true);
    attackResult.damage = runeResult.damage;
    
    // Рассчитываем урон от предметов после применения эффектов
    const totalItemDamage = attackResult.damage - originalDamage;
    if (totalItemDamage > 0) {
      // Распределяем урон между предметами пропорционально их эффектам
      const itemDamageDetails = calculateItemDamageBreakdownAfterEffects(originalDamage, totalItemDamage, attacker.itemEffects, runeResult.message);
      if (itemDamageDetails.length > 0) {
        damageBreakdown.items = itemDamageDetails;
      }
    }
    
    if (runeResult.message) {
      attackResult.abilityMessage = (attackResult.abilityMessage || '') + '\n' + runeResult.message;
    }
  }
  
  // Применяем элементальные эффекты
  if (attacker.itemEffects && attacker.itemEffects.length > 0) {
    const originalDamage = attackResult.damage;
    attackResult = elementalSystem.applyElementalEffect(
      attacker, 
      defender, 
      attackResult, 
      battleContext, 
      attacker.itemEffects
    );
    
    // Рассчитываем урон от элементов
    const elementalDamage = attackResult.damage - originalDamage;
    if (elementalDamage > 0) {
      // Определяем какой элемент сработал
      const elementName = getTriggeredElementName(attacker.itemEffects, attackResult.elementalMessage);
      damageBreakdown.elemental.damage = elementalDamage;
      damageBreakdown.elemental.name = elementName;
    }
  }
  
  // Разброс урона
  const variance = 0.9 + Math.random() * 0.2;
  attackResult.damage = Math.floor(attackResult.damage * variance);
  
  // Обновляем итоговый урон в детализации
  damageBreakdown.total = attackResult.damage;
  attackResult.damageBreakdown = damageBreakdown;
  
  // Если двойная атака - наносим урон дважды
  if (isDoubleAttack) {
    attackResult.secondDamage = attackResult.damage;
    attackResult.totalDamage = attackResult.damage * 2;
  } else {
    attackResult.totalDamage = attackResult.damage;
  }
  
  return attackResult;
}

// Рассчитать детализацию урона от предметов после применения эффектов
function calculateItemDamageBreakdownAfterEffects(baseDamage, totalItemDamage, itemEffects, effectMessage) {
  const itemDetails = [];
  
  if (!itemEffects || itemEffects.length === 0 || totalItemDamage <= 0) return itemDetails;
  
  // Анализируем какие эффекты сработали по сообщению
  const messageLines = effectMessage ? effectMessage.split('\n') : [];
  
  itemEffects.forEach(effect => {
    if (!effect) return;
    
    let itemName = 'Неизвестный предмет';
    let damageBonus = 0;
    
    if (effect === 'fire_damage_25') {
      itemName = 'Пламенный клинок';
      // Проверяем сработал ли огненный урон
      if (messageLines.some(line => line.includes('Пламенный клинок'))) {
        damageBonus = Math.floor(baseDamage * 0.25);
      }
    } else if (effect === 'holy_damage_50') {
      itemName = 'Экскалибур';
      // Проверяем сработал ли святой урон
      if (messageLines.some(line => line.includes('Экскалибур'))) {
        damageBonus = Math.floor(baseDamage * 0.50);
      }
    } else if (effect === 'berserk_mode') {
      itemName = 'Руна берсерка';
      // Проверяем сработал ли берсерк
      if (messageLines.some(line => line.includes('Берсерк'))) {
        damageBonus = Math.floor(baseDamage * 0.50);
      }
    } else if (effect === 'shadow_strike') {
      itemName = 'Клинок теней';
      // Проверяем сработал ли удар из тени
      if (messageLines.some(line => line.includes('Удар из тени'))) {
        damageBonus = Math.floor(baseDamage * 0.50);
      }
    }
    
    if (damageBonus > 0) {
      itemDetails.push({ name: itemName, damageBonus: damageBonus });
    }
  });
  
  return itemDetails;
}

// Рассчитать детализацию урона от предметов с учетом процентных бонусов
// Получить детальную информацию о предметах
function getItemEffectDetails(itemEffects) {
  const itemMap = {
    'fire_damage_25': { name: 'Пламенный клинок', damageBonus: 0 }, // Процентный бонус, не фиксированный
    'shadow_strike': { name: 'Клинок теней', damageBonus: 0 }, // Случайный эффект
    'holy_damage_50': { name: 'Экскалибур', damageBonus: 0 }, // Процентный бонус, не фиксированный
    'berserk_mode': { name: 'Руна берсерка', damageBonus: 0 }, // Процентный бонус, не фиксированный
    'exp_boost_30': { name: 'Руна мастера', damageBonus: 0 }
  };
  
  return itemEffects.map(effect => {
    return itemMap[effect] || { name: 'Неизвестный предмет', damageBonus: 0 };
  });
}

// Определить какой элемент сработал
function getTriggeredElementName(itemEffects, elementalMessage) {
  if (!elementalMessage) return '';
  
  if (elementalMessage.includes('🔥')) return 'Амулет огня';
  if (elementalMessage.includes('❄️')) return 'Амулет льда';
  if (elementalMessage.includes('⚡')) return 'Амулет молний';
  if (elementalMessage.includes('🌑')) return 'Амулет тьмы';
  if (elementalMessage.includes('🌈')) return 'Око Вечности';
  
  return 'Элементальный эффект';
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
  
  // Применяем эффекты предметов в начале хода (регенерация)
  const itemEffectMsg = raceAbilities.applyItemEffects(
    { currentHP: battle.playerHP, maxHP: battle.playerMaxHP },
    battle.playerStats.itemEffects || [],
    battle.battleContext
  );
  
  if (itemEffectMsg) {
    result.itemEffects = itemEffectMsg;
  }
  
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
      
      let finalDamage = defenseResult.damage;
      
      // Применяем модификацию урона от рун (защита врага)
      if (battle.enemy.itemEffects && battle.enemy.itemEffects.length > 0) {
        const runeResult = raceAbilities.modifyDamageWithItems(finalDamage, battle.enemy.itemEffects, false);
        finalDamage = runeResult.damage;
        if (runeResult.message) {
          attackResult.abilityMessage = (attackResult.abilityMessage || '') + '\n' + runeResult.message;
        }
      }
      
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
    
    // Применяем модификацию урона от рун игрока (защита)
    if (battle.playerStats.itemEffects && battle.playerStats.itemEffects.length > 0) {
      const runeResult = raceAbilities.modifyDamageWithItems(damage, battle.playerStats.itemEffects, false);
      damage = runeResult.damage;
      if (runeResult.message) {
        enemyAttack.abilityMessage = (enemyAttack.abilityMessage || '') + '\n' + runeResult.message;
      }
    }
    
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
    // Проверяем руну бессмертия
    const playerForImmortal = {
      currentHP: battle.playerHP,
      maxHP: battle.playerMaxHP
    };
    
    if (raceAbilities.checkImmortalityRune(playerForImmortal, battle.playerStats.itemEffects || [])) {
      battle.playerHP = 1;
      
      // Добавляем сообщение о срабатывании руны
      if (result.enemyAction) {
        result.enemyAction.text += `\n🔮 РУНА БЕССМЕРТИЯ! Вы выжили с 1 HP!`;
      }
    } else {
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
  executePvPRound,
  getBattleStatus,
  performAttack
};
