# Rarity and Rewards Balance Update

## Overview
Adjusted rarity chances for legendary and secret races, and reduced crystal rewards from raid boss to balance the economy.

## Changes Made

### 1. Rarity Chances (config.js)

#### Before:
```javascript
LEGENDARY: { name: 'Легендарный', color: '🟡', chance: 0.9 },
SECRET: { name: 'Секретный', color: '⚫️', chance: 0.1 }
```

#### After:
```javascript
LEGENDARY: { name: 'Легендарный', color: '🟡', chance: 0.5 },
SECRET: { name: 'Секретный', color: '⚫️', chance: 0.001 }
```

#### Impact:
- **Legendary**: 0.9% → 0.5% (44% harder to get)
- **Secret**: 0.1% → 0.001% (100x harder to get!)

### 2. Raid Boss Rewards (raids.js)

#### Before:
```javascript
rewards: {
  total_gold: 1000,
  total_crystals: 50,  // ← Changed
  total_exp: 1000
}
```

#### After:
```javascript
rewards: {
  total_gold: 1000,
  total_crystals: 20,  // ← Reduced by 60%
  total_exp: 1000
}
```

#### Impact:
- Crystal rewards reduced from 50 to 20 (60% reduction)
- Gold and EXP remain unchanged

### 3. UI Updates (bot.js)

Updated raid waiting screen to show new crystal amount:
```
💰 Награды (делятся по урону):
• 1000 золота
• 20 алмазов  ← Updated from 50
• 1000 опыта
```

## New Rarity Distribution

| Rarity | Chance | Odds | Change |
|--------|--------|------|--------|
| ⚪️ Обычный | 60% | 3 in 5 | - |
| 🔵 Редкий | 25% | 1 in 4 | - |
| 🟣 Эпический | 10% | 1 in 10 | - |
| 🔴 Мистический | 4% | 1 in 25 | - |
| 🟡 Легендарный | 0.5% | 1 in 200 | ↓ from 1 in 111 |
| ⚫️ Секретный | 0.001% | 1 in 100,000 | ↓ from 1 in 1,000 |

**Total**: 99.501% (remaining 0.499% redistributed to other rarities in practice)

## Economy Impact

### Crystal Sources After Changes:
1. **Starting crystals**: 10 (unchanged)
2. **Daily reward**: Varies (unchanged)
3. **Raid boss**: 20 total pool (was 50)
4. **VIP reward**: 500 (unchanged)
5. **Referrals**: 1 per friend (unchanged)

### Example Raid Distribution (20 crystals):
- Player A (50% damage): 10 crystals
- Player B (30% damage): 6 crystals
- Player C (20% damage): 4 crystals

**Before** (50 crystals):
- Player A: 25 crystals
- Player B: 15 crystals
- Player C: 10 crystals

### Race Roll Cost:
- 10 crystals per roll (unchanged)
- 1000 gold per roll (unchanged)

## Balance Rationale

### Why Reduce Legendary Chance?
- **0.9% → 0.5%**: Makes legendary races more prestigious
- Still obtainable but requires more rolls
- Increases value of legendary races

### Why Drastically Reduce Secret Chance?
- **0.1% → 0.001%**: Makes secret races truly rare
- 1 in 100,000 chance = ultra-rare collectible
- Creates excitement when obtained
- Maintains exclusivity

### Why Reduce Raid Crystals?
- **50 → 20**: Prevents crystal inflation
- Players were getting too many crystals from raids
- Maintains value of crystal purchases/rewards
- Encourages participation in other activities
- Still rewarding but not overpowered

## Player Impact

### Casual Players:
- Slightly harder to get legendary races
- Secret races now extremely rare (as intended)
- Fewer crystals from raids but still rewarding

### Active Players:
- More raids needed for same crystal amount
- Legendary races feel more special when obtained
- Secret races become true status symbols

### VIP Players:
- VIP crystal reward (500) now more valuable
- Competitive advantage maintained
- Raid participation still worthwhile

## Comparison

### Crystals per Raid (assuming 20% damage):
- **Before**: 10 crystals (20% of 50)
- **After**: 4 crystals (20% of 20)
- **Difference**: -6 crystals per raid

### Rolls per Raid (10 crystals per roll):
- **Before**: 1 roll per raid (with 20% damage)
- **After**: Need 2.5 raids for 1 roll (with 20% damage)

## Status
✅ Implemented and balanced for better economy
