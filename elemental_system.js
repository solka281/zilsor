// Система элементальных эффектов
const db = require('./database_simple');

// Элементальные эффекты
const ELEMENTAL_EFFECTS = {
  fire_element: {
    name: 'Огонь',
    emoji: '🔥',
    description: 'Поджигает противника',
    effect: 'burn'
  },
  ice_element: {
    name: 'Лед',
    emoji: '❄️',
    description: 'Замораживает противника',
    effect: 'freeze'
  },
  lightning_element: {
    name: 'Молния',
    emoji: '⚡',
    description: 'Оглушает противника',
    effect: 'stun'
  },
  dark_element: {
    name: 'Тьма',
    emoji: '🌑',
    description: 'Поглощает жизненную силу противника',
    effect: 'life_drain'
  },
  all_elements: {
    name: 'Все элементы',
    emoji: '🌈',
    description: 'Случайный элементальный эффект',
    effect: 'random'
  }
};

// Применить элементальный эффект при атаке
function applyElementalEffect(attacker, defender, attackResult, battleContext, itemEffects = []) {
  if (!itemEffects || itemEffects.length === 0) return attackResult;
  
  let elementalMessage = '';
  let elementTriggered = false;
  
  itemEffects.forEach(effect => {
    if (!effect) return;
    
    // Проверяем элементальные эффекты
    const element = ELEMENTAL_EFFECTS[effect];
    if (!element) return;
    
    // 15% шанс срабатывания элементального эффекта (снижено с 25%)
    if (Math.random() < 0.15) {
      elementTriggered = true;
      
      switch (element.effect) {
        case 'burn':
          // Огонь: поджигает ПРОТИВНИКА на 2 хода, 10% от урона за ход
          const burnDamage = Math.floor(attackResult.damage * 0.10);
          if (battleContext) {
            // Применяем эффект к ПРОТИВНИКУ через специальное поле
            if (!battleContext.opponentEffects) battleContext.opponentEffects = {};
            battleContext.opponentEffects.burnDamage = burnDamage;
            battleContext.opponentEffects.burnTurns = 2;
          }
          elementalMessage += `${element.emoji} Поджог противника! ${burnDamage} урона/ход на 2 хода\n`;
          break;
          
        case 'freeze':
          // Лед: замораживает ПРОТИВНИКА только на 1 ход
          if (battleContext) {
            if (!battleContext.opponentEffects) battleContext.opponentEffects = {};
            battleContext.opponentEffects.freezeTurns = 1;
          }
          elementalMessage += `${element.emoji} Заморозка противника! Пропуск 1 хода\n`;
          break;
          
        case 'stun':
          // Молния: оглушает ПРОТИВНИКА на 1 ход + меньше дополнительного урона
          const stunDamage = Math.floor(attackResult.damage * 0.15);
          attackResult.damage += stunDamage;
          if (battleContext) {
            if (!battleContext.opponentEffects) battleContext.opponentEffects = {};
            battleContext.opponentEffects.stunTurns = 1;
          }
          elementalMessage += `${element.emoji} Оглушение противника! +${stunDamage} урона, пропуск хода\n`;
          break;
          
        case 'life_drain':
          // Тьма: поглощение жизни - наносит дополнительный урон и лечит атакующего
          const drainDamage = Math.floor(attackResult.damage * 0.25); // 25% от урона
          attackResult.damage += drainDamage;
          
          // Лечим атакующего на половину поглощенного урона
          const healAmount = Math.floor(drainDamage * 0.5);
          if (attacker.hp !== undefined) {
            attacker.hp = Math.min(attacker.maxHP || attacker.hp, attacker.hp + healAmount);
          } else if (attacker.currentHP !== undefined) {
            attacker.currentHP = Math.min(attacker.maxHP || attacker.currentHP, attacker.currentHP + healAmount);
          }
          
          elementalMessage += `${element.emoji} Поглощение жизни! +${drainDamage} урона, +${healAmount} HP\n`;
          break;
          
        case 'random':
          // Все элементы: случайный эффект
          const randomEffects = ['burn', 'freeze', 'stun', 'life_drain'];
          const randomEffect = randomEffects[Math.floor(Math.random() * randomEffects.length)];
          
          // Рекурсивно применяем случайный эффект
          const fakeEffect = Object.keys(ELEMENTAL_EFFECTS).find(key => 
            ELEMENTAL_EFFECTS[key].effect === randomEffect
          );
          
          if (fakeEffect) {
            const randomResult = applyElementalEffect(attacker, defender, attackResult, battleContext, [fakeEffect]);
            elementalMessage += `🌈 Случайный элемент: ${randomResult.elementalMessage || ''}`;
          }
          break;
      }
    }
  });
  
  if (elementTriggered && elementalMessage) {
    attackResult.elementalMessage = elementalMessage.trim();
  }
  
  return attackResult;
}

// Применить эффекты состояний в начале хода
function applyStatusEffects(target, battleContext) {
  const effects = [];
  let canAct = true;
  
  if (!battleContext) return { effects, canAct };
  
  // Горение
  if (battleContext.burnDamage && battleContext.burnTurns > 0) {
    target.currentHP = Math.max(0, target.currentHP - battleContext.burnDamage);
    effects.push(`🔥 Горение: -${battleContext.burnDamage} HP`);
    battleContext.burnTurns--;
    
    if (battleContext.burnTurns <= 0) {
      battleContext.burnDamage = 0;
      effects.push(`🔥 Огонь потух`);
    }
  }
  
  // Заморозка
  if (battleContext.freezeTurns > 0) {
    effects.push(`❄️ Заморожен! Пропуск хода`);
    canAct = false;
    battleContext.freezeTurns--;
    
    if (battleContext.freezeTurns <= 0) {
      effects.push(`❄️ Лед растаял`);
    }
  }
  
  // Оглушение
  if (battleContext.stunTurns > 0) {
    effects.push(`⚡ Оглушен! Пропуск хода`);
    canAct = false;
    battleContext.stunTurns--;
    
    if (battleContext.stunTurns <= 0) {
      effects.push(`⚡ Оглушение прошло`);
    }
  }
  
  // Проклятие
  if (battleContext.curseTurns > 0) {
    effects.push(`🌑 Проклят! -${Math.floor(battleContext.curseEffect * 100)}% к характеристикам`);
    battleContext.curseTurns--;
    
    if (battleContext.curseTurns <= 0) {
      battleContext.curseEffect = 0;
      effects.push(`🌑 Проклятие снято`);
    }
  }
  
  return { effects, canAct };
}

// Модифицировать характеристики с учетом проклятия
function applyCurseEffect(stats, battleContext) {
  if (!battleContext || !battleContext.curseEffect || battleContext.curseTurns <= 0) {
    return stats;
  }
  
  const reduction = battleContext.curseEffect;
  
  return {
    ...stats,
    attack: Math.floor(stats.attack * (1 - reduction)),
    defense: Math.floor(stats.defense * (1 - reduction)),
    power: Math.floor(stats.power * (1 - reduction))
  };
}

// Получить активные элементы игрока
function getPlayerElements(itemEffects = []) {
  const elements = [];
  
  if (!itemEffects || itemEffects.length === 0) return elements;
  
  itemEffects.forEach(effect => {
    if (effect && ELEMENTAL_EFFECTS[effect]) {
      elements.push(ELEMENTAL_EFFECTS[effect]);
    }
  });
  
  return elements;
}

// Получить описание элементальных эффектов для интерфейса
function getElementalDescription(elements) {
  if (!elements || elements.length === 0) return '';
  
  return elements.map(el => `${el.emoji} ${el.name}`).join(' ');
}

// Проверить сопротивление к элементам (для будущего расширения)
function checkElementalResistance(defenderRace, elementType) {
  // Некоторые расы могут иметь сопротивления
  const resistances = {
    'Феникс': ['fire_element'], // Феникс устойчив к огню
    'Элементаль': ['fire_element', 'ice_element', 'lightning_element'], // Элементаль устойчив к стихиям
    'Нежить': ['dark_element'], // Нежить устойчива к тьме
    'Дракон': ['fire_element'], // Дракон устойчив к огню
    'Лич': ['dark_element'] // Лич устойчив к тьме
  };
  
  const raceResistances = resistances[defenderRace] || [];
  return raceResistances.includes(elementType);
}

module.exports = {
  ELEMENTAL_EFFECTS,
  applyElementalEffect,
  applyStatusEffects,
  applyCurseEffect,
  getPlayerElements,
  getElementalDescription,
  checkElementalResistance
};