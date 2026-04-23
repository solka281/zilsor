# Raid Menu Restructure & Rewards Fix

## Overview
Restructured raid menu navigation and fixed reward distribution system to properly handle crystals and use integer percentages.

## Changes Made

### 1. Menu Structure (bot.js)
**New Navigation Flow**:
```
Рейды (raids_menu)
  └─> Выбрать босса (select_raid_boss)
       └─> [Босс] Повелитель ветра (raid_boss_{id})
            └─> Атаковать / Присоединиться
```

**Old Flow** (removed):
```
Рейды (raids_menu) -> Direct attack/join
```

### 2. Menu Handlers

#### `raids_menu` - Main Raids Menu
- Shows general raid information
- Single button: "👹 Выбрать босса"
- Explains reward distribution system

#### `select_raid_boss` - Boss Selection Menu
- Shows boss preview with stats
- Displays countdown if boss not available: "Появится через X мин Y сек"
- Shows "⚔️ Атаковать босса" button when available
- Button leads to `raid_boss_{id}` for detailed view

#### `raid_boss_{id}` - Boss Detail & Attack Menu
- Full boss stats with HP bar
- Attack/Join buttons based on participation status
- "📊 Моя статистика" for participants
- "👥 Участники" to see leaderboard
- "🔄 Обновить" to refresh
- Back button returns to `select_raid_boss`

### 3. Reward System Fix (raids.js)

**Problem**: 
- Crystals showing as `null` in rewards
- Percentages showing decimals (73.2434%)
- Complex reward calculation with multipliers

**Solution**:
```javascript
// Boss rewards structure
rewards: {
  total_gold: 1000,      // Total gold pool
  total_crystals: 50,    // Total crystals pool
  total_exp: 1000        // Total exp pool
}

// Distribution calculation
const damagePercent = Math.floor((damage / totalDamage) * 100); // Integer %
const gold = Math.floor(rewards.total_gold * (damagePercent / 100));
const crystals = Math.floor(rewards.total_crystals * (damagePercent / 100));
const exp = Math.floor(rewards.total_exp * (damagePercent / 100));
```

**Key Changes**:
- Removed `gold_min/gold_max` - now single `total_gold` value
- Removed `exp_min/exp_max` - now single `total_exp` value
- Removed `item_chance` and item drops completely
- All percentages rounded to integers with `Math.floor()`
- All reward values rounded to integers with `Math.floor()`
- Removed `damageMultiplier` - simple proportional distribution

### 4. Boss Stats
**Повелитель ветра (Wind Lord)**:
- Level: 9
- HP: 75,000
- Rewards (total pool):
  - 1000 gold
  - 50 crystals
  - 1000 exp

### 5. Navigation Updates

**After joining raid**:
- Returns to `raid_boss_{id}` (not `raids_menu`)

**After attacking**:
- Returns to `raid_boss_{id}` (not `raids_menu`)
- Shows updated HP in callback

**After boss defeated**:
- Sends rewards to all participants
- Returns to `select_raid_boss` after 2 seconds
- Shows countdown for next raid

### 6. Statistics Display Fix

**`my_raid_stats` handler**:
- Now calculates percentage based on total damage from all participants
- Uses integer percentage: `Math.floor((damage / totalDamage) * 100)`
- Shows: "⚔️ Урон: 1234 (15%)" instead of "1234 (15.234%)"

### 7. Reward Messages

**Top Damage Message**:
```
🏆 РЕЙД ЗАВЕРШЕН!

👹 Повелитель ветра (Ур.9) побежден!

📊 ТОП УРОНА:

🥇 Игрок 123456
   ⚔️ 15000 урона (20%)
   🎁 200💰 10💎 200✨
```

**Personal Reward Message**:
```
🎁 Ваши награды:

💰 +200 золота
💎 +10 алмазов
✨ +200 опыта

⚔️ Ваш урон: 15000 (20%)
```

## Example Reward Distribution

**Scenario**: 3 players defeat boss
- Player A: 50,000 damage (50%)
- Player B: 30,000 damage (30%)
- Player C: 20,000 damage (20%)

**Rewards**:
- Player A: 500 gold, 25 crystals, 500 exp
- Player B: 300 gold, 15 crystals, 300 exp
- Player C: 200 gold, 10 crystals, 200 exp

**Total**: 1000 gold, 50 crystals, 1000 exp ✅

## Bug Fixes

1. **Null crystals**: Fixed by removing complex calculation and using simple proportional distribution
2. **Decimal percentages**: Fixed by using `Math.floor()` for all percentage calculations
3. **Navigation confusion**: Fixed by adding intermediate "select boss" menu
4. **Wrong percentage in stats**: Fixed by calculating based on total damage, not boss HP

## Status
✅ Implemented and ready for testing
