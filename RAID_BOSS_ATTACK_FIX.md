# Raid Boss Attack Fix

## Problem
Players couldn't attack raid bosses after the menu restructure. The "⚔️ Атаковать босса" button wasn't working.

## Root Cause
The `case 'raid_boss':` in the switch statement doesn't match callback_data like `raid_boss_123` (with ID). 

**Switch statement behavior**:
- `case 'raid_boss':` only matches exact string "raid_boss"
- Callback data `raid_boss_123` doesn't match
- Handler never executes

## Solution
Moved the `raid_boss` handler from switch statement to `if (data.startsWith('raid_boss_'))` check.

### Before (Broken):
```javascript
switch (data) {
  case 'raid_boss':
    const raidBossId = parseInt(data.split('_')[2]);
    // This never executes for 'raid_boss_123'
    break;
}
```

### After (Fixed):
```javascript
// Before switch statement
if (data.startsWith('raid_boss_')) {
  const raidBossId = parseInt(data.replace('raid_boss_', ''));
  // Now correctly handles 'raid_boss_123'
  break;
}
```

## Changes Made

### 1. Added Dynamic Handler (bot.js)
Added `if (data.startsWith('raid_boss_'))` handler before the switch statement, alongside other dynamic handlers like `join_raid_`, `attack_raid_`, etc.

**Location**: Before `// Обработчики рейдов` section

**Features**:
- Extracts raid ID from callback_data
- Loads active raid
- Checks if player has joined
- Shows appropriate buttons (Join/Attack)
- Displays boss stats and HP bar

### 2. Removed Duplicate Case
Removed `case 'raid_boss':` from switch statement to avoid confusion.

## Flow Now Works

1. **User clicks "Рейды"** → `raids_menu`
2. **User clicks "👹 Выбрать босса"** → `select_raid_boss`
3. **User clicks "⚔️ Атаковать босса"** → `raid_boss_123` ✅ (now works!)
4. **User clicks "⚔️ Присоединиться"** → `join_raid_123`
5. **User clicks "⚔️ Атаковать"** → `attack_raid_123`

## Why This Happened
When restructuring the raid menu, I added a new `case 'raid_boss':` in the switch statement, but forgot that callback_data includes the raid ID (`raid_boss_123`), which doesn't match a static case.

## Similar Handlers
These handlers correctly use `startsWith`:
- `join_raid_` ✅
- `attack_raid_` ✅
- `raid_participants_` ✅
- `my_raid_stats_` ✅
- `admin_raid_level_` ✅

## Testing
To verify the fix:
1. Go to Рейды menu
2. Click "Выбрать босса"
3. Click "Атаковать босса"
4. Should see boss detail page with Join/Attack button
5. Click "Присоединиться" → should join raid
6. Click "Атаковать" → should attack boss

## Status
✅ Fixed and ready for testing
