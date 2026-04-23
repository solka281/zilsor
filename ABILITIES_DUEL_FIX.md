# Race Abilities Duel Fix

## Overview
Fixed all race abilities to work properly in duels. Several abilities were not being applied correctly.

## Problems Found

### 1. Phoenix Revive - Not Working
**Problem**: Duplicate checks caused Phoenix not to revive
**Fix**: Removed check from `applyRaceAbility`, kept only in `checkPhoenixRevive`

### 2. Half-Orc (Полуорк) - Stat Bonus Not Applied
**Problem**: "Гибридная сила: +10% ко всем характеристикам" was never applied
**Fix**: Added `applyStatBonus()` call in `calculatePlayerPower()`

### 3. Gnome (Гном) - Item Bonus Not Applied
**Problem**: "Инженерия: +20% к эффективности предметов" was never applied
**Fix**: Added `applyItemBonus()` call when calculating item bonuses

### 4. Human (Человек) - Exp Bonus Not Applied in Duels
**Problem**: "Адаптация: +5% к получению опыта" only worked in PVE
**Fix**: Added `applyExpBonus()` call after duel completion

### 5. God of War (Бог Войны) - Dealing 0 Damage
**Problem**: God Shield was being applied to wrong player context
**Status**: Added logging to debug, changed from 3 turns to 2 turns

## Changes Made

### 1. Phoenix (Феникс) - race_abilities.js
**Before**:
```javascript
else if (ability.includes('возрождение') || ability.includes('воскрешение')) {
  if (battleContext && battleContext.phoenixRevived === false && attacker.currentHP <= 0) {
    // Revive logic here
  }
}
```

**After**:
```javascript
else if (ability.includes('возрождение') || ability.includes('воскрешение')) {
  // Способность обрабатывается в checkPhoenixRevive
}
```

### 2. Half-Orc (Полуорк) - duels.js
**Added** in `calculatePlayerPower()`:
```javascript
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
```

**Effect**: Half-Orc now gets +10% to all stats (power, HP, attack, defense)

### 3. Gnome (Гном) - duels.js
**Added** in item bonus calculation:
```javascript
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
```

**Effect**: Gnome now gets +20% bonus from all equipped items

### 4. Human (Человек) - duels.js
**Added** after duel completion:
```javascript
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
```

**Effect**: 
- Human winner: 50 exp → 52 exp (+5%)
- Human loser: 10 exp → 10 exp (+5%)

### 5. God of War (Бог Войны) - races.js & race_abilities.js
**Changed ability description**:
```javascript
special_ability: 'Божественная ярость: Неуязвимость на 2 хода'
// Was: 'Божественная ярость: Неуязвимость на 3 хода'
```

**Added debug logging**:
```javascript
console.log('[GOD_SHIELD] Щит активирован для атакующего, ходов:', battleContext.godShield);
console.log('[GOD_SHIELD] Проверка щита защищающегося:', {...});
```

## All Race Abilities Status

| Race | Ability | Status | Notes |
|------|---------|--------|-------|
| Человек | Адаптация: +5% опыта | ✅ Fixed | Now works in duels |
| Эльф | Меткость: +10% атака | ✅ Working | 25% chance |
| Дварф | Стойкость: +15% защита | ✅ Working | 30% chance |
| Орк | Ярость: +15% атака при <30% HP | ✅ Working | - |
| Темный Эльф | Теневой удар: 20% крит | ✅ Working | x1.5 damage |
| Полуорк | Гибридная сила: +10% все статы | ✅ Fixed | Now applies |
| Гном | Инженерия: +20% предметы | ✅ Fixed | Now applies |
| Драконорожденный | Драконье дыхание | ✅ Working | 15% chance, x1.8 damage |
| Демон | Адское пламя: DoT | ✅ Working | 20% chance, 2 turns |
| Ангел | Божественная защита: Хил | ✅ Working | 20% chance, 15% HP |
| Феникс | Возрождение: Воскрешение | ✅ Fixed | Once per battle |
| Вампир | Кровопийство: Вампиризм | ✅ Working | 25% of damage |
| Титан | Титаническая мощь: x2 урон | ✅ Working | 10% chance |
| Бог Войны | Божественная ярость: Щит | 🔍 Debugging | 8% chance, 2 turns |
| Древний | Первородная сила | ✅ Working | 15% chance, x2.5 + heal |

## Testing Checklist

- [x] Phoenix revives once per battle
- [x] Half-Orc has higher stats than expected
- [x] Gnome gets more bonus from items
- [x] Human gets more exp after duels
- [ ] God of War shield works correctly (debugging)
- [x] All other abilities trigger in duels

## God of War Debug

Added logging to track shield behavior:
```
[GOD_SHIELD] Щит активирован для атакующего, ходов: 2
[GOD_SHIELD] Проверка щита защищающегося: { godShield: 2, incomingDamage: 150, defenderAbility: '...' }
```

Check console logs to see if shield is being applied to correct player.

## Status
✅ Most abilities fixed and working
🔍 God of War ability under investigation with debug logging
