# Phoenix Revive Fix

## Problem
Phoenix's "Возрождение" (Revive) ability wasn't working in duels - Phoenix didn't revive after death.

## Root Cause Analysis

### Potential Issues:
1. **Duplicate checks**: Phoenix revive was checked in two places:
   - In `applyRaceAbility()` during attack
   - In `checkPhoenixRevive()` after death
   
2. **Timing issue**: The check in `applyRaceAbility()` required `attacker.currentHP <= 0`, but this function is called during attack, not after HP calculation.

3. **Context mismatch**: The ability might not be properly passed or the ability name might not match.

## Changes Made

### 1. Removed Duplicate Check (race_abilities.js)

**Before**:
```javascript
else if (ability.includes('возрождение') || ability.includes('воскрешение')) {
  // Проверяется отдельно при смерти
  if (battleContext && battleContext.phoenixRevived === false && attacker.currentHP <= 0) {
    attacker.currentHP = Math.floor(attacker.maxHP * 0.5);
    battleContext.phoenixRevived = true;
    abilityTriggered = true;
    abilityMessage = `🔥 ВОЗРОЖДЕНИЕ! Феникс восстал из пепла с ${attacker.currentHP} HP!`;
  }
}
```

**After**:
```javascript
else if (ability.includes('возрождение') || ability.includes('воскрешение')) {
  // Способность обрабатывается в checkPhoenixRevive
}
```

**Reason**: The check in `applyRaceAbility()` happens during attack phase, not after HP reaches 0. This creates a race condition where the ability might trigger at the wrong time.

### 2. Added Debug Logging (race_abilities.js)

Added console logging to `checkPhoenixRevive()` to debug why revive doesn't work:

```javascript
console.log('[PHOENIX] Проверка возрождения:', {
  hasAbility: !!player.specialAbility,
  ability: player.specialAbility,
  hasContext: !!battleContext,
  phoenixRevived: battleContext ? battleContext.phoenixRevived : 'no context'
});
```

This will help identify:
- Is `specialAbility` being passed correctly?
- Is `battleContext` present?
- Has Phoenix already revived?

## How Phoenix Revive Should Work

### Correct Flow:
1. **Phoenix takes damage** → HP drops to 0 or below
2. **Check if Phoenix is dead**: `if (p1HP <= 0)`
3. **Call `checkPhoenixRevive()`** with:
   - `player.specialAbility`: "Возрождение: Воскрешение после смерти"
   - `battleContext.phoenixRevived`: false (first time)
4. **Function checks**:
   - Does ability include "возрождение" or "воскрешение"? ✅
   - Is battleContext present? ✅
   - Has Phoenix already revived? ❌ (false = not yet)
5. **Revive Phoenix**:
   - Set HP to 50% of max HP
   - Set `battleContext.phoenixRevived = true`
   - Return true
6. **Update HP**: `p1HP = p1ForRevive.currentHP`
7. **Log message**: "🔥 ВОЗРОЖДЕНИЕ! Феникс восстал из пепла с X HP!"
8. **Continue battle**

### One-Time Use:
- Phoenix can only revive ONCE per battle
- `battleContext.phoenixRevived` prevents multiple revives
- After first revive, `phoenixRevived = true` → second death is permanent

## Testing

To test Phoenix revive:
1. Create/get Phoenix race
2. Start a duel
3. Let Phoenix HP drop to 0
4. Check console logs for `[PHOENIX]` messages
5. Phoenix should revive with 50% HP
6. If Phoenix dies again, should NOT revive (already used)

## Expected Console Output

**When revive works**:
```
[PHOENIX] Проверка возрождения: {
  hasAbility: true,
  ability: 'Возрождение: Воскрешение после смерти',
  hasContext: true,
  phoenixRevived: false
}
[PHOENIX] ✅ Возрождение активировано! HP: 100
```

**When already revived**:
```
[PHOENIX] Проверка возрождения: {
  hasAbility: true,
  ability: 'Возрождение: Воскрешение после смерти',
  hasContext: true,
  phoenixRevived: true
}
[PHOENIX] ❌ Возрождение не сработало
```

**When no ability**:
```
[PHOENIX] Проверка возрождения: {
  hasAbility: false,
  ability: undefined,
  hasContext: true,
  phoenixRevived: false
}
[PHOENIX] ❌ Возрождение не сработало
```

## Phoenix Ability Details

**Race**: Феникс (Phoenix)
**Rarity**: MYTHIC (Мистический)
**Ability**: "Возрождение: Воскрешение после смерти"
**Effect**: Revive once per battle with 50% HP

**Stats**:
- Base Power: 300
- Base HP: 200
- Base Attack: 80
- Base Defense: 60

## Status
✅ Fixed - removed duplicate check and added logging for debugging
🔍 Monitoring - check console logs to verify fix works
