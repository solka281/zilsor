// Система способностей рас
const db = require('./database_simple');

// Проверка и активация пассивных способностей расы
function applyRaceAbility(attacker, defender, attackResult, battleContext) {
  if (!attacker.specialAbility) return attackResult;
  
  const ability = attacker.specialAbility.toLowerCase();
  let abilityTriggered = false;
  let abilityMessage = '';
  
  // Ангел - Божественная защита: Восстановление HP
  if (ability.includes('божественная защита') || ability.includes('восстановление hp')) {
    // 20% шанс восстановить 15% HP после атаки
    if (Math.random() < 0.20) {
      const healAmount = Math.floor(attacker.maxHP * 0.15);
      attacker.currentHP = Math.min(attacker.maxHP, attacker.currentHP + healAmount);
      abilityTriggered = true;
      abilityMessage = `✨ Божественная защита! +${healAmount} HP`;
    }
  }
  
  // Вампир - Кровопийство: Восстановление HP от урона
  else if (ability.includes('кровопийство') || ability.includes('восстановление hp от урона')) {
    // Восстанавливает 25% от нанесенного урона
    const healAmount = Math.floor(attackResult.damage * 0.25);
    attacker.currentHP = Math.min(attacker.maxHP, attacker.currentHP + healAmount);
    abilityTriggered = true;
    abilityMessage = `🩸 Кровопийство! +${healAmount} HP`;
    console.log(`[VAMPIRE] Кровопийство сработало: урон=${attackResult.damage}, лечение=${healAmount}`);
  }
  
  // Феникс - Возрождение: Воскрешение после смерти
  // Проверяется отдельно в checkPhoenixRevive при смерти
  else if (ability.includes('возрождение') || ability.includes('воскрешение')) {
    // Способность обрабатывается в checkPhoenixRevive
  }
  
  // Орк - Ярость: +15% к атаке при низком HP
  else if (ability.includes('ярость') && ability.includes('низком hp')) {
    if (attacker.currentHP < attacker.maxHP * 0.3) {
      attackResult.damage = Math.floor(attackResult.damage * 1.15);
      abilityTriggered = true;
      abilityMessage = `😡 Ярость орка! Урон увеличен!`;
    }
  }
  
  // Эльф - Меткость: +10% к атаке
  else if (ability.includes('меткость')) {
    if (Math.random() < 0.25) { // 25% шанс
      attackResult.damage = Math.floor(attackResult.damage * 1.10);
      abilityTriggered = true;
      abilityMessage = `🎯 Меткий выстрел!`;
    }
  }
  
  // Дварф - Стойкость: +15% к защите
  else if (ability.includes('стойкость')) {
    // Применяется при получении урона (обрабатывается в calculateDamage)
  }
  
  // Темный Эльф - Теневой удар: 20% шанс критического урона
  else if (ability.includes('теневой удар') || ability.includes('критического урона')) {
    if (Math.random() < 0.20) {
      attackResult.damage = Math.floor(attackResult.damage * 1.5);
      attackResult.critical = true;
      abilityTriggered = true;
      abilityMessage = `🌑 Теневой удар!`;
    }
  }
  
  // Драконорожденный - Драконье дыхание
  else if (ability.includes('драконье дыхание') || ability.includes('дракон')) {
    if (Math.random() < 0.15) {
      attackResult.damage = Math.floor(attackResult.damage * 1.8);
      abilityTriggered = true;
      abilityMessage = `🐉 Драконье дыхание!`;
    }
  }
  
  // Демон - Адское пламя: Урон со временем
  else if (ability.includes('адское пламя') || ability.includes('адск')) {
    if (Math.random() < 0.20) {
      const burnDamage = Math.floor(attackResult.damage * 0.3);
      if (battleContext) {
        battleContext.burnDamage = burnDamage;
        battleContext.burnTurns = 2;
      }
      abilityTriggered = true;
      abilityMessage = `🔥 Адское пламя! Противник горит (${burnDamage} урона/ход)`;
    }
  }
  
  // Титан - Титаническая мощь: Удваивает силу атаки
  else if (ability.includes('титаническая мощь') || ability.includes('удваивает')) {
    if (Math.random() < 0.10) { // 10% шанс для баланса
      attackResult.damage = Math.floor(attackResult.damage * 2);
      abilityTriggered = true;
      abilityMessage = `⚡ ТИТАНИЧЕСКАЯ МОЩЬ! Урон удвоен!`;
    }
  }
  
  // Бог Войны - Божественная ярость
  else if (ability.includes('божественная ярость') || ability.includes('неуязвимость')) {
    if (Math.random() < 0.08 && battleContext) { // 8% шанс
      // Устанавливаем щит для атакующего (самого себя)
      battleContext.godShield = 2; // 2 хода неуязвимости
      abilityTriggered = true;
      abilityMessage = `⚔️ БОЖЕСТВЕННАЯ ЯРОСТЬ! Неуязвимость на 2 хода!`;
      console.log('[GOD_SHIELD] Щит активирован для атакующего, ходов:', battleContext.godShield);
    }
  }
  
  // Древний - Первородная сила
  else if (ability.includes('первородная сила') || ability.includes('контроль')) {
    if (Math.random() < 0.15) {
      attackResult.damage = Math.floor(attackResult.damage * 2.5);
      const healAmount = Math.floor(attacker.maxHP * 0.2);
      attacker.currentHP = Math.min(attacker.maxHP, attacker.currentHP + healAmount);
      abilityTriggered = true;
      abilityMessage = `🌌 ПЕРВОРОДНАЯ СИЛА! Урон x2.5 и +${healAmount} HP!`;
    }
  }
  
  // Кентавр - Скоростная атака: 25% шанс двойного удара
  else if (ability.includes('скоростная атака') || ability.includes('двойного удара')) {
    if (Math.random() < 0.25) {
      attackResult.damage = Math.floor(attackResult.damage * 2);
      abilityTriggered = true;
      abilityMessage = `🏹 Скоростная атака! Двойной удар!`;
    }
  }
  
  // Минотавр - Бычий натиск: +30% урона при полном HP
  else if (ability.includes('бычий натиск') || ability.includes('полном hp')) {
    if (attacker.currentHP === attacker.maxHP) {
      attackResult.damage = Math.floor(attackResult.damage * 1.30);
      abilityTriggered = true;
      abilityMessage = `🐂 Бычий натиск! Полная сила!`;
    }
  }
  
  // Элементаль - Стихийная мощь: Случайный элементальный урон
  else if (ability.includes('стихийная мощь') || ability.includes('элементальный')) {
    if (Math.random() < 0.30) {
      const elements = ['🔥 Огонь', '❄️ Лед', '⚡ Молния', '🌪️ Ветер'];
      const element = elements[Math.floor(Math.random() * elements.length)];
      const multiplier = 1.2 + Math.random() * 0.6; // 1.2-1.8x
      attackResult.damage = Math.floor(attackResult.damage * multiplier);
      abilityTriggered = true;
      abilityMessage = `${element} Стихийная мощь! x${multiplier.toFixed(1)}`;
    }
  }
  
  // Нежить - Нежизнь: Иммунитет к ядам и болезням
  else if (ability.includes('нежизнь') || ability.includes('иммунитет')) {
    // Пассивная способность, обрабатывается при получении урона
    if (Math.random() < 0.15) {
      attackResult.damage = Math.floor(attackResult.damage * 1.1);
      abilityTriggered = true;
      abilityMessage = `💀 Сила нежизни!`;
    }
  }
  
  // Оборотень - Лунная ярость: +50% урона ночью
  else if (ability.includes('лунная ярость') || ability.includes('ночью')) {
    const hour = new Date().getHours();
    const isNight = hour >= 20 || hour <= 6; // 20:00 - 06:00
    if (isNight && Math.random() < 0.40) {
      attackResult.damage = Math.floor(attackResult.damage * 1.50);
      abilityTriggered = true;
      abilityMessage = `🌙 Лунная ярость! Сила ночи!`;
    }
  }
  
  // Дракон - Драконья магия: Мощные заклинания
  else if (ability.includes('драконья магия') || ability.includes('заклинания')) {
    if (Math.random() < 0.12) {
      const spells = [
        { name: 'Метеор', multiplier: 2.2, emoji: '☄️' },
        { name: 'Ледяная буря', multiplier: 1.8, emoji: '🌨️' },
        { name: 'Цепная молния', multiplier: 2.0, emoji: '⚡' }
      ];
      const spell = spells[Math.floor(Math.random() * spells.length)];
      attackResult.damage = Math.floor(attackResult.damage * spell.multiplier);
      abilityTriggered = true;
      abilityMessage = `${spell.emoji} ${spell.name}! Драконья магия!`;
    }
  }
  
  // Лич - Некромантия: Призыв мертвых союзников
  else if (ability.includes('некромантия') || ability.includes('призыв')) {
    if (Math.random() < 0.18) {
      attackResult.damage = Math.floor(attackResult.damage * 1.6);
      const healAmount = Math.floor(attacker.maxHP * 0.1);
      attacker.currentHP = Math.min(attacker.maxHP, attacker.currentHP + healAmount);
      abilityTriggered = true;
      abilityMessage = `💀 Некромантия! Мертвые восстают! +${healAmount} HP`;
    }
  }
  
  // Джинн - Исполнение желаний: Случайный мощный эффект
  else if (ability.includes('исполнение желаний') || ability.includes('случайный')) {
    if (Math.random() < 0.10) {
      const wishes = [
        { effect: 'damage', value: 2.5, message: '💫 Желание силы! Урон x2.5!' },
        { effect: 'heal', value: 0.3, message: '✨ Желание исцеления! +30% HP!' },
        { effect: 'shield', value: 3, message: '🛡️ Желание защиты! Щит на 3 хода!' }
      ];
      const wish = wishes[Math.floor(Math.random() * wishes.length)];
      
      if (wish.effect === 'damage') {
        attackResult.damage = Math.floor(attackResult.damage * wish.value);
      } else if (wish.effect === 'heal') {
        const healAmount = Math.floor(attacker.maxHP * wish.value);
        attacker.currentHP = Math.min(attacker.maxHP, attacker.currentHP + healAmount);
      } else if (wish.effect === 'shield' && battleContext) {
        battleContext.geniShield = wish.value;
      }
      
      abilityTriggered = true;
      abilityMessage = wish.message;
    }
  }
  
  // Человек - Адаптация: +5% к получению опыта (обрабатывается при получении опыта)
  // Полуорк - Гибридная сила: +10% ко всем характеристикам (применяется при расчете статов)
  // Гном - Инженерия: +20% к эффективности предметов (применяется при расчете бонусов)
  
  if (abilityTriggered) {
    attackResult.abilityMessage = abilityMessage;
  }
  
  return attackResult;
}

// Применить защитные способности при получении урона
function applyDefensiveAbility(defender, incomingDamage, battleContext) {
  if (!defender.specialAbility) return incomingDamage;
  
  const ability = defender.specialAbility.toLowerCase();
  let damageReduction = 0;
  let abilityMessage = '';
  
  // Дварф - Стойкость: +15% к защите
  if (ability.includes('стойкость')) {
    if (Math.random() < 0.30) { // 30% шанс
      damageReduction = Math.floor(incomingDamage * 0.15);
      abilityMessage = `🛡️ Стойкость дварфа! -${damageReduction} урона`;
      console.log(`[DWARF] Стойкость сработала: входящий урон=${incomingDamage}, снижение=${damageReduction}`);
    }
  }
  
  // Бог Войны - проверка неуязвимости
  if (battleContext && battleContext.godShield > 0) {
    console.log('[GOD_SHIELD] Проверка щита защищающегося:', {
      godShield: battleContext.godShield,
      incomingDamage: incomingDamage,
      defenderAbility: defender.specialAbility
    });
    damageReduction = incomingDamage;
    abilityMessage = `⚔️ Неуязвимость! Урон заблокирован! (${battleContext.godShield} хода осталось)`;
    battleContext.godShield--;
  }
  
  // Джинн - щит желаний
  else if (battleContext && battleContext.geniShield > 0) {
    damageReduction = Math.floor(incomingDamage * 0.5);
    abilityMessage = `🛡️ Щит желаний! -50% урона (${battleContext.geniShield} хода осталось)`;
    battleContext.geniShield--;
  }
  
  // Нежить - иммунитет к ядам и эффектам
  else if (defender.specialAbility && defender.specialAbility.toLowerCase().includes('иммунитет')) {
    if (Math.random() < 0.20) {
      damageReduction = Math.floor(incomingDamage * 0.25);
      abilityMessage = `💀 Нежизнь! Сопротивление урону!`;
    }
  }
  
  const finalDamage = Math.max(0, incomingDamage - damageReduction);
  
  return {
    damage: finalDamage,
    abilityMessage: abilityMessage
  };
}

// Применить эффекты в начале хода (горение, яды и т.д.)
function applyTurnEffects(target, battleContext) {
  const effects = [];
  
  // Горение от Адского пламени
  if (battleContext && battleContext.burnDamage && battleContext.burnTurns > 0) {
    target.currentHP -= battleContext.burnDamage;
    effects.push(`🔥 Горение: -${battleContext.burnDamage} HP`);
    battleContext.burnTurns--;
    
    if (battleContext.burnTurns === 0) {
      battleContext.burnDamage = 0;
    }
  }
  
  return effects;
}

// Проверить возрождение Феникса
function checkPhoenixRevive(player, battleContext) {
  console.log('[PHOENIX] Проверка возрождения:', {
    hasAbility: !!player.specialAbility,
    ability: player.specialAbility,
    hasContext: !!battleContext,
    phoenixRevived: battleContext ? battleContext.phoenixRevived : 'no context'
  });
  
  if (!player.specialAbility) return false;
  
  const ability = player.specialAbility.toLowerCase();
  
  if ((ability.includes('возрождение') || ability.includes('воскрешение')) && 
      battleContext && !battleContext.phoenixRevived) {
    // Феникс возрождается с 50% HP
    player.currentHP = Math.floor(player.maxHP * 0.5);
    battleContext.phoenixRevived = true;
    console.log('[PHOENIX] ✅ Возрождение активировано! HP:', player.currentHP);
    return true;
  }
  
  console.log('[PHOENIX] ❌ Возрождение не сработало');
  return false;
}

// Применить бонусы к опыту (для способностей типа Адаптация)
function applyExpBonus(player, baseExp) {
  if (!player.specialAbility) return baseExp;
  
  const ability = player.specialAbility.toLowerCase();
  
  // Человек - Адаптация: +5% к получению опыта
  if (ability.includes('адаптация') && ability.includes('опыт')) {
    return Math.floor(baseExp * 1.05);
  }
  
  return baseExp;
}

// Применить бонусы к характеристикам (для способностей типа Гибридная сила)
function applyStatBonus(player) {
  if (!player.specialAbility) return player;
  
  const ability = player.specialAbility.toLowerCase();
  
  // Полуорк - Гибридная сила: +10% ко всем характеристикам
  if (ability.includes('гибридная сила') && ability.includes('характеристикам')) {
    player.power = Math.floor(player.power * 1.10);
    player.maxHP = Math.floor(player.maxHP * 1.10);
    player.attack = Math.floor(player.attack * 1.10);
    player.defense = Math.floor(player.defense * 1.10);
  }
  
  return player;
}

// Применить бонусы к предметам (для способностей типа Инженерия)
function applyItemBonus(player, itemBonus) {
  if (!player.specialAbility) return itemBonus;
  
  const ability = player.specialAbility.toLowerCase();
  
  // Гном - Инженерия: +20% к эффективности предметов
  if (ability.includes('инженерия') && ability.includes('предметов')) {
    return Math.floor(itemBonus * 1.20);
  }
  
  return itemBonus;
}

module.exports = {
  applyRaceAbility,
  applyDefensiveAbility,
  applyTurnEffects,
  checkPhoenixRevive,
  applyExpBonus,
  applyStatBonus,
  applyItemBonus
};
