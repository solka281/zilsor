# Wiki Fixes Applied

## Date: Context Transfer Session

## Issues Fixed

### 1. ✅ Removed Special Abilities from Mobs and Bosses
**Problem**: User repeatedly stated that mobs and bosses DO NOT have special abilities in the game (only basic stats exist).

**Solution**: 
- Removed `specialAbility` display from mob listings in `showLocationsSection()`
- Removed `specialAbility` display from boss detail cards in `showBosses()`
- Changed mob display from card grid to simple table format
- Changed boss display from card format to simple table format

**Files Modified**:
- `wiki/app.js` - Lines ~1620-1730

**Note**: The `specialAbility` field still exists in `monsters.js` code, but it's no longer displayed in the wiki as per user request.

### 2. ✅ Changed Races and Items to Table Display
**Status**: Already implemented correctly

**Details**:
- `showAllRaces()` displays races in a clean table format (not cards)
- `showAllItems()` displays items in a clean table format (not cards)
- Tables include: name, rarity, stats, cost

### 3. ✅ Fixed Navigation Issues
**Problem**: Navigation was buggy - clicking "Главная" after viewing other sections would show wrong content.

**Solution**: 
- Modified `showHomePage()` to always recreate the home page HTML instead of moving DOM elements
- This ensures fresh state every time home is accessed
- Event listeners are properly reattached after recreation

**Files Modified**:
- `wiki/app.js` - `showHomePage()` function

### 4. ✅ Data Structure Verification
**Verified**:
- `wiki/locations_data.js` - Correctly structured with ONLY these fields:
  - Mobs: name, emoji, hp, attack, defense, goldReward, expReward
  - Bosses: level, name, emoji, hp, attack, defense, goldReward, expReward, crystalReward, itemDropChance
  - NO specialAbility, NO abilityDescription, NO lore

- `wiki/race_data.js` - Races correctly have specialAbility and abilityDescription (these are kept)
- `wiki/item_data.js` - Items correctly structured

## Current Display Format

### Mobs (in Locations section)
```
Table format with columns:
- Моб (name + emoji)
- HP
- Атака
- Защита
- Золото (range)
- Опыт (range)
```

### Bosses (in Locations section)
```
Table format with columns:
- Босс (name + emoji)
- HP
- Атака
- Защита
- Золото
- Опыт
- Кристаллы (range)
- Шанс дропа (%)
```

### Bosses (in dedicated Bosses view)
```
Card format with:
- Boss emoji + name
- Location + level
- Stats grid (HP, Attack, Defense)
- Rewards grid (Gold, Exp, Crystals, Drop chance)
- NO abilities section
```

### Races
```
Table format with columns:
- Раса
- Редкость
- Сила
- HP
- Атака
- Защита
- Скорость
- Стоимость
```

### Items
```
Table format with columns:
- Предмет
- Тип
- Редкость
- Сила
- HP
- Атака
- Защита
```

## Testing Checklist

- [ ] Open `wiki/index.html` in browser
- [ ] Verify home page loads correctly
- [ ] Click "Все расы" - should show table of all races
- [ ] Click "Все предметы" - should show table of all items
- [ ] Click "Все локации" - should show locations with mob/boss tables (NO abilities)
- [ ] Click "Боссы" - should show boss cards (NO abilities section)
- [ ] Click "Рейды" - should show raid bosses
- [ ] Click "Главная страница" - should return to home page correctly
- [ ] Test navigation multiple times to ensure no bugs
- [ ] Check browser console for any JavaScript errors

## Notes

- Races KEEP their special abilities (user only complained about mobs/bosses)
- Items KEEP their special effects (user only complained about mobs/bosses)
- The `specialAbility` field exists in `monsters.js` but is not displayed in wiki
- All data files load in correct order: race_data.js → item_data.js → locations_data.js → app.js
