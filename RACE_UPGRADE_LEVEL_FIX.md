# Race Upgrade Level Fix

## Problem
When upgrading race, gold was spent but level didn't increase. Player stayed at the same level despite paying the upgrade cost.

## Root Cause
The `confirm_upgrade_race` handler was updating `power` directly in the database, but NOT updating `level`:

```javascript
// WRONG:
db.run(`UPDATE players SET gold = gold - ?, power = power + 20 WHERE user_id = ?`
```

This caused:
1. ❌ Gold was deducted
2. ❌ Power was increased (but incorrectly - power should be calculated, not stored)
3. ❌ Level stayed the same
4. ❌ Player couldn't upgrade again (cost calculation based on level)

## Understanding Power System

**Power is NOT stored in database** - it's calculated dynamically!

### Power Calculation (duels.js - calculatePlayerPower):
```javascript
// Base stats from race
let totalPower = player.base_power || 100;

// Bonuses from level
totalPower += player.level * 10;  // ← Level affects power!

// Bonuses from awakening
const awakeningBonus = 1 + (player.awakening_level * 0.1);
totalPower *= awakeningBonus;

// Bonuses from items
items.forEach(item => {
  totalPower += item.power_bonus || 0;
});

// Race ability bonuses (Half-Orc)
stats = raceAbilities.applyStatBonus(stats);
```

**Key Point**: Power is calculated from:
- Race base power
- **Level** (level * 10)
- Awakening level
- Equipped items
- Race abilities

## Solution

### 1. Update Only Level (bot.js)
```javascript
// CORRECT:
db.run(`UPDATE players SET gold = gold - ?, level = level + 1 WHERE user_id = ?`
```

### 2. Recalculate Power After Upgrade
```javascript
duels.calculatePlayerPower(userId, (err, newStats) => {
  // Show new stats
  safeEditMessageText(chatId, messageId,
    `✅ Раса прокачана!\n\n` +
    `⭐ Уровень: ${player.level} → ${newLevel}\n` +
    `⚡ Новая сила: ${newStats.power}\n` +
    `❤️ HP: ${newStats.hp}\n` +
    `🗡️ Атака: ${newStats.attack}\n` +
    `🛡️ Защита: ${newStats.defense}\n\n` +
    `💰 Потрачено: ${cost} золота`
  );
});
```

## What Changed

### Before (Broken):
```javascript
UPDATE players SET gold = gold - ?, power = power + 20 WHERE user_id = ?
```
- ❌ Level not updated
- ❌ Power stored in DB (wrong approach)
- ❌ Stats not recalculated

### After (Fixed):
```javascript
UPDATE players SET gold = gold - ?, level = level + 1 WHERE user_id = ?
```
- ✅ Level updated correctly
- ✅ Power calculated dynamically
- ✅ All stats recalculated (HP, attack, defense)

## Level Benefits

Each level gives:
- **+10 Power** (totalPower += player.level * 10)
- **+2 Attack** (totalAttack += player.level * 2)
- **+1.5 Defense** (totalDefense += player.level * 1.5)
- **+5 HP** (totalHP += player.level * 5)

Example: Level 9 → Level 10
- Power: +10 (90 → 100 from levels)
- Attack: +2
- Defense: +1.5
- HP: +5

## Upgrade Cost Formula

```javascript
const cost = 100 * (player.level + 1);
```

| Current Level | Cost | Next Level |
|---------------|------|------------|
| 1 | 200 | 2 |
| 5 | 600 | 6 |
| 9 | 1000 | 10 |
| 10 | 1100 | 11 |
| 20 | 2100 | 21 |

## Message Display

### Before:
```
✅ Раса прокачана!

⚡ +20 к силе
💰 -1000 золота

Новая сила: 320
```

### After:
```
✅ Раса прокачана!

⭐ Уровень: 9 → 10
⚡ Новая сила: 650
❤️ HP: 380
🗡️ Атака: 155
🛡️ Защита: 105

💰 Потрачено: 1000 золота
```

## Testing

To verify the fix:
1. Check current level and gold
2. Click "Прокачать расу"
3. Confirm upgrade
4. Verify:
   - ✅ Level increased by 1
   - ✅ Gold decreased by cost
   - ✅ Power increased (based on level)
   - ✅ All stats updated
   - ✅ Can upgrade again (new cost shown)

## Related Systems

This fix also affects:
- **Quest progress**: "upgrade" type quests now track correctly
- **Power calculation**: All power-based features use correct values
- **Duels**: Player power in duels now reflects true level
- **Leaderboards**: Rankings based on correct power

## Status
✅ Fixed - Level now updates correctly when upgrading race
