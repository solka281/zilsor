// Система способностей рас
const db = require('./database_simple');

// Проверка и активация пассивных способностей расы
function applyRaceAbility(attacker, defender, attackResult, battleContext) {
  if (!attacker.specialAbility) return attackResult;
  
  const ability = attacker.specialAbility.toLowerCase();
  let abilityTriggered = false;
  let abilityMessage = '';
  
  // Ангел - Божественная защита: +15% к защите
  if (ability.includes('божественная защита') || ability.includes('к защите')) {
    // Пассивная способность, обрабатывается при получении урона
  }
  
  // Вампир - Кровопийство: +15% к атаке и HP
  else if (ability.includes('кровопийство') || ability.includes('к атаке и hp')) {
    if (Math.random() < 0.15) {
      attackResult.damage = Math.floor(attackResult.damage * 1.15);
      const healAmount = Math.floor(attackResult.damage * 0.15);
      attacker.currentHP = Math.min(attacker.maxHP, attacker.currentHP + healAmount);
      abilityTriggered = true;
      abilityMessage = `🩸 Кровопийство! +15% урона и +${healAmount} HP`;
    }
  }
  
  // Феникс - Возрождение: +50% к восстановлению HP
  // Проверяется отдельно в checkPhoenixRevive при смерти
  else if (ability.includes('возрождение') || ability.includes('восстановлению hp')) {
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
  
  // Оборотень - Звериная ярость: +30% урона при низком HP
  else if (ability.includes('звериная ярость') || ability.includes('при низком hp')) {
    if (attacker.currentHP < attacker.maxHP * 0.3) {
      attackResult.damage = Math.floor(attackResult.damage * 1.30);
      abilityTriggered = true;
      abilityMessage = `🐺 Звериная ярость! +30% урона!`;
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
  
  // Драконорожденный - Огненное дыхание: +25% урона от огня
  else if (ability.includes('огненное дыхание') || ability.includes('урона от огня')) {
    if (Math.random() < 0.20) {
      attackResult.damage = Math.floor(attackResult.damage * 1.25);
      abilityTriggered = true;
      abilityMessage = `🔥 Огненное дыхание!`;
    }
  }
  
  // Демон - Адское пламя: +20% критического урона
  else if (ability.includes('адское пламя') || ability.includes('критического урона')) {
    if (Math.random() < 0.20) {
      attackResult.damage = Math.floor(attackResult.damage * 1.20);
      attackResult.critical = true;
      abilityTriggered = true;
      abilityMessage = `🔥 Адское пламя! Критический урон!`;
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
  
  // Кентавр - Скоростная атака: 12% шанс двойного удара
  else if (ability.includes('скоростная атака') || ability.includes('двойного удара')) {
    if (Math.random() < 0.12) { // Уменьшен шанс до 12%
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
  
  // Элементаль - Стихийная мощь: 25% шанс двойного урона
  else if (ability.includes('стихийная мощь') || ability.includes('двойного урона')) {
    if (Math.random() < 0.25) { // Увеличен шанс до 25%
      attackResult.damage = Math.floor(attackResult.damage * 2);
      abilityTriggered = true;
      abilityMessage = `⚡ Стихийная мощь! Двойной урон!`;
    }
  }
  
  // Нежить - Нежизнь: +20% к HP и защите
  else if (ability.includes('нежизнь') || ability.includes('к hp и защите')) {
    // Пассивная способность - бонусы применяются при расчете статов
    // Дополнительно: 15% шанс усиленной атаки
    if (Math.random() < 0.15) {
      attackResult.damage = Math.floor(attackResult.damage * 1.2);
      abilityTriggered = true;
      abilityMessage = `💀 Сила нежизни! +20% урона!`;
    }
  }
  
  // Дракон - Драконья мощь: +40% ко всем характеристикам
  else if (ability.includes('драконья мощь') || ability.includes('ко всем характеристикам')) {
    // Пассивная способность - бонусы применяются при расчете статов
    // Дополнительно: 12% шанс мощной атаки
    if (Math.random() < 0.12) {
      attackResult.damage = Math.floor(attackResult.damage * 1.8);
      abilityTriggered = true;
      abilityMessage = `🐉 Драконья мощь! Мощная атака!`;
    }
  }
  
  // Лич - Темная магия: +35% к магическому урону
  else if (ability.includes('темная магия') || ability.includes('к магическому урону')) {
    if (Math.random() < 0.18) {
      attackResult.damage = Math.floor(attackResult.damage * 1.35);
      abilityTriggered = true;
      abilityMessage = `💀 Темная магия! +35% урона!`;
    }
  }
  
  // Джинн - Магия желаний: 20% шанс тройного урона
  else if (ability.includes('магия желаний') || ability.includes('тройного урона')) {
    if (Math.random() < 0.20) {
      attackResult.damage = Math.floor(attackResult.damage * 3);
      abilityTriggered = true;
      abilityMessage = `✨ Магия желаний! Тройной урон!`;
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
  
  // Ангел - Божественная защита: +15% к защите
  else if (ability.includes('божественная защита') || ability.includes('к защите')) {
    if (Math.random() < 0.25) { // 25% шанс
      damageReduction = Math.floor(incomingDamage * 0.15);
      abilityMessage = `✨ Божественная защита! -${damageReduction} урона`;
    }
  }
  
  // Нежить - дополнительная защита
  else if (defender.specialAbility && defender.specialAbility.toLowerCase().includes('нежизнь')) {
    if (Math.random() < 0.20) {
      damageReduction = Math.floor(incomingDamage * 0.20);
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
  
  // Нежить - Нежизнь: +20% к HP и защите
  if (ability.includes('нежизнь') && ability.includes('к hp и защите')) {
    player.maxHP = Math.floor(player.maxHP * 1.20);
    player.defense = Math.floor(player.defense * 1.20);
  }
  
  // Дракон - Драконья мощь: +40% ко всем характеристикам
  if (ability.includes('драконья мощь') && ability.includes('ко всем характеристикам')) {
    player.power = Math.floor(player.power * 1.40);
    player.maxHP = Math.floor(player.maxHP * 1.40);
    player.attack = Math.floor(player.attack * 1.40);
    player.defense = Math.floor(player.defense * 1.40);
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

// Применить эффекты рун и предметов в начале хода
function applyItemEffects(player, itemEffects, battleContext) {
  if (!itemEffects || itemEffects.length === 0) return;
  
  let messages = [];
  
  itemEffects.forEach(effect => {
    if (!effect) return;
    
    // Руна жизни - Регенерация HP
    if (effect.includes('regen_')) {
      const regenAmount = parseInt(effect.split('_')[1]) || 5;
      player.currentHP = Math.min(player.maxHP, player.currentHP + regenAmount);
      messages.push(`💚 Регенерация: +${regenAmount} HP`);
    }
    
    // Руна берсерка - Режим берсерка
    if (effect === 'berserk_mode' && battleContext) {
      battleContext.berserkMode = true;
      messages.push(`😡 Режим берсерка активен!`);
    }
    
    // Руна бессмертия - Шанс выжить
    if (effect.includes('immortal_chance_') && battleContext) {
      const chance = parseInt(effect.split('_')[2]) || 5;
      battleContext.immortalChance = chance;
    }
  });
  
  return messages.length > 0 ? messages.join('\n') : null;
}

// Модифицировать урон с учетом эффектов предметов
function modifyDamageWithItems(damage, itemEffects, isAttacker) {
  if (!itemEffects || itemEffects.length === 0) return damage;
  
  let modifiedDamage = damage;
  let messages = [];
  
  itemEffects.forEach(effect => {
    if (!effect) return;
    
    if (isAttacker) {
      // Руна берсерка - +50% урона
      if (effect === 'berserk_mode') {
        modifiedDamage = Math.floor(modifiedDamage * 1.50);
        messages.push(`😡 Берсерк: +50% урона`);
      }
      
      // Эффекты урона от оружия
      if (effect.includes('fire_damage_')) {
        const bonus = parseInt(effect.split('_')[2]) || 25;
        modifiedDamage = Math.floor(modifiedDamage * (1 + bonus / 100));
        messages.push(`🔥 Пламенный клинок: +${bonus}% урона`);
      }
      
      if (effect === 'shadow_strike') {
        if (Math.random() < 0.20) {
          modifiedDamage = Math.floor(modifiedDamage * 1.5);
          messages.push(`🌑 Удар из тени!`);
        }
      }
      
      if (effect.includes('holy_damage_')) {
        const bonus = parseInt(effect.split('_')[2]) || 50;
        modifiedDamage = Math.floor(modifiedDamage * (1 + bonus / 100));
        messages.push(`✨ Экскалибур: +${bonus}% урона`);
      }
    } else {
      // Защитные эффекты
      // Руна защиты - Снижение урона
      if (effect.includes('damage_reduction_')) {
        const reduction = parseInt(effect.split('_')[2]) || 15;
        modifiedDamage = Math.floor(modifiedDamage * (1 - reduction / 100));
        messages.push(`🛡️ Снижение урона: -${reduction}%`);
      }
      
      // Руна берсерка - -20% защиты
      if (effect === 'berserk_mode') {
        modifiedDamage = Math.floor(modifiedDamage * 1.20);
        messages.push(`⚠️ Берсерк: -20% защиты`);
      }
      
      // Отражение урона
      if (effect.includes('damage_reflect_')) {
        const reflect = parseInt(effect.split('_')[2]) || 30;
        const reflectedDamage = Math.floor(modifiedDamage * (reflect / 100));
        messages.push(`⚡ Отражено: ${reflectedDamage} урона`);
        // Отраженный урон нужно обработать отдельно
      }
      
      // Блокировка
      if (effect.includes('block_')) {
        const blockChance = parseInt(effect.split('_')[1]) || 50;
        if (Math.random() * 100 < blockChance) {
          modifiedDamage = Math.floor(modifiedDamage * 0.5);
          messages.push(`🛡️ Блок! -50% урона`);
        }
      }
    }
  });
  
  return {
    damage: modifiedDamage,
    message: messages.length > 0 ? messages.join('\n') : null
  };
}

// Модифицировать уклонение с учетом эффектов предметов
function modifyDodgeWithItems(baseDodge, itemEffects) {
  if (!itemEffects || itemEffects.length === 0) return baseDodge;
  
  let dodgeBonus = 0;
  
  itemEffects.forEach(effect => {
    if (!effect) return;
    
    // Руна скорости - Бонус к уклонению
    if (effect.includes('speed_boost_')) {
      const bonus = parseInt(effect.split('_')[2]) || 25;
      dodgeBonus += bonus;
    }
    
    // Сапоги теней - Уклонение
    if (effect.includes('dodge_')) {
      const bonus = parseInt(effect.split('_')[1]) || 20;
      dodgeBonus += bonus;
    }
  });
  
  return baseDodge + (dodgeBonus / 100);
}

// Модифицировать опыт с учетом эффектов предметов
function modifyExpWithItems(baseExp, itemEffects) {
  if (!itemEffects || itemEffects.length === 0) return baseExp;
  
  let expMultiplier = 1.0;
  
  itemEffects.forEach(effect => {
    if (!effect) return;
    
    // Руна мастера - Бонус к опыту
    if (effect.includes('exp_boost_')) {
      const bonus = parseInt(effect.split('_')[2]) || 30;
      expMultiplier += bonus / 100;
    }
  });
  
  return Math.floor(baseExp * expMultiplier);
}

// Проверить срабатывание руны бессмертия
function checkImmortalityRune(player, itemEffects) {
  if (!itemEffects || itemEffects.length === 0) return false;
  
  for (let effect of itemEffects) {
    if (effect && effect.includes('immortal_chance_')) {
      const chance = parseInt(effect.split('_')[2]) || 5;
      if (Math.random() * 100 < chance) {
        player.currentHP = 1;
        return true;
      }
    }
  }
  
  return false;
}

module.exports = {
  applyRaceAbility,
  applyDefensiveAbility,
  applyTurnEffects,
  applyStatBonus,
  applyItemBonus,
  applyExpBonus,
  checkPhoenixRevive,
  applyItemEffects,
  modifyDamageWithItems,
  modifyDodgeWithItems,
  modifyExpWithItems,
  checkImmortalityRune
};
