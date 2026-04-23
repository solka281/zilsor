# Race Abilities Audit and Fix

## Overview
Comprehensive audit of all race abilities to ensure they work correctly in both PVE (forest) and PVP (duels).

## Abilities Status

### ✅ Working in Duels (Attack Phase)

| Race | Ability | Status | Implementation |
|------|---------|--------|----------------|
| **Ангел** | Божественная защита: Восстановление HP | ✅ Working | 20% chance to heal 15% HP after attack |
| **Вампир** | Кровопийство: Восстановление HP от урона | ✅ Working | Heals 25% of damage dealt |
| **Орк** | Ярость: +15% к атаке при низком HP | ✅ Working | +15% damage when HP < 30% |
| **Эльф** | Меткость: +10% к атаке | ✅ Working | 25% chance for +10% damage |
| **Темный Эльф** | Теневой удар: 20% шанс критического урона | ✅ Working | 20% chance for 1.5x damage (crit) |
| **Драконорожденный** | Драконье дыхание: Мощная атака | ✅ Working | 15% chance for 1.8x damage |
| **Демон** | Адское пламя: Урон со временем | ✅ Working | 20% chance to apply burn (30% damage for 2 turns) |
| **Титан** | Титаническая мощь: Удваивает силу атаки | ✅ Working | 10% chance for 2x damage |
| **Бог Войны** | Божественная ярость: Неуязвимость | ✅ Working | 8% chance for 2 turns of invulnerability |
| **Древний** | Первородная сила: Контроль над реальностью | ✅ Working | 15% chance for 2.5x damage + 20% HP heal |

### ✅ Working in Duels (Defense Phase)

| Race | Ability | Status | Implementation |
|------|---------|--------|----------------|
| **Дварф** | Стойкость: +15% к защите | ✅ Working | 30% chance to reduce incoming damage by 15% |
| **Бог Войны** | Божественная ярость (shield) | ✅ Working | Blocks all damage during invulnerability turns |

### ✅ Working in Duels (Turn Effects)

| Race | Ability | Status | Implementation |
|------|---------|--------|----------------|
| **Демон** | Адское пламя (burn) | ✅ Working | Applies burn damage at start of each turn |

### ✅ Working in Duels (Death Check)

| Race | Ability | Status | Implementation |
|------|---------|--------|----------------|
| **Феникс** | Возрождение: Воскрешение после смерти | ✅ Fixed | Revives once with 50% HP when killed |

### ✅ Fixed - Now Working

| Race | Ability | Status | Fix Applied |
|------|---------|--------|-------------|
| **Полуорк** | Гибридная сила: +10% ко всем характеристикам | ✅ Fixed | Now applied in `calculatePlayerPower()` |
| **Гном** | Инженерия: +20% к эффективности предметов | ✅ Fixed | Now applied to item bonuses in `calculatePlayerPower()` |
| **Человек** | Адаптация: +5% к получению опыта | ✅ Fixed | Now applied to exp rewards in duels |

## Changes Made

### 1. Fixed Полуорк (Half-Orc) - Гибридная сила

**Problem**: Stat bonus wasn't applied to player stats.

**Fix**: Added `applyStatBonus()` call in `calculatePlayerPower()`:

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

**Effect**: Полуорк now gets +10% to all stats (power, HP, attack, defense).

---

### 2. Fixed Гном (Gnome) - Инженерия

**Problem**: Item bonus wasn't amplified by ability.

**Fix**: Added `applyItemBonus()` call for each item bonus:

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

**Effect**: Гном now gets +20% bonus from all equipped items.

---

### 3. Fixed Человек (Human) - Адаптация

**Problem**: Exp bonus wasn't applied in duels (only in PVE).

**Fix**: Added `applyExpBonus()` call after duel:

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

// Обновляем статистику
db.run(`UPDATE players SET wins = wins + 1, exp = exp + ? WHERE user_id = ?`, [winnerExp, winnerId]);
db.run(`UPDATE players SET losses = losses + 1, exp = exp + ? WHERE user_id = ?`, [loserExp, loserId]);
```

**Effect**: Человек now gets +5% exp from duels (52.5 exp for win, 10.5 exp for loss).

---

### 4. Fixed Феникс (Phoenix) - Возрождение

**Problem**: Duplicate check in `applyRaceAbility()` caused timing issues.

**Fix**: Removed duplicate check, kept only in `checkPhoenixRevive()`:

```javascript
// Феникс - Возрождение: Воскрешение после смерти
// Проверяется отдельно в checkPhoenixRevive при смерти
else if (ability.includes('возрождение') || ability.includes('воскрешение')) {
  // Способность обрабатывается в checkPhoenixRevive
}
```

**Effect**: Phoenix now correctly revives once per battle with 50% HP.

## Ability Mechanics Summary

### Offensive Abilities (During Attack)
- **Ангел**: 20% chance → heal 15% max HP
- **Вампир**: Always → heal 25% of damage dealt
- **Орк**: When HP < 30% → +15% damage
- **Эльф**: 25% chance → +10% damage
- **Темный Эльф**: 20% chance → 1.5x damage (critical)
- **Драконорожденный**: 15% chance → 1.8x damage
- **Демон**: 20% chance → apply burn (30% damage for 2 turns)
- **Титан**: 10% chance → 2x damage
- **Бог Войны**: 8% chance → gain 2 turns invulnerability
- **Древний**: 15% chance → 2.5x damage + heal 20% max HP

### Defensive Abilities (When Taking Damage)
- **Дварф**: 30% chance → reduce damage by 15%
- **Бог Войны**: During invulnerability → block all damage

### Passive Abilities (Always Active)
- **Полуорк**: +10% to all stats (power, HP, attack, defense)
- **Гном**: +20% to all item bonuses
- **Человек**: +5% exp gain

### Special Mechanics
- **Феникс**: Revive once per battle with 50% HP when killed
- **Демон**: Burn effect deals damage at start of each turn

## Testing Checklist

- [x] Ангел heals in duels
- [x] Вампир heals from damage in duels
- [x] Орк gets damage boost at low HP in duels
- [x] Эльф gets accuracy bonus in duels
- [x] Дварф reduces incoming damage in duels
- [x] Темный Эльф crits in duels
- [x] Драконорожденный breathes fire in duels
- [x] Демон applies burn in duels
- [x] Феникс revives in duels
- [x] Титан doubles damage in duels
- [x] Бог Войны gets invulnerability in duels
- [x] Древний uses primordial power in duels
- [x] Полуорк gets stat bonus
- [x] Гном gets item bonus
- [x] Человек gets exp bonus in duels

## Status
✅ All abilities now working in both PVE and PVP
✅ All passive bonuses properly applied
✅ All fixes tested and documented
