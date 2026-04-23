# Raid Cooldown System Implementation

## Overview
Implemented a 1-hour cooldown system for raid bosses. After a raid boss is defeated, players must wait 1 hour before the next raid becomes available.

## Changes Made

### 1. Fixed `getNextRaidTime()` Function (raids.js)
**Problem**: Function was checking `active_raids` table with `created_at` timestamp, which doesn't accurately track when a raid was completed.

**Solution**: Changed to check `raid_history` table with `completed_at` timestamp:
```javascript
db.get(`SELECT * FROM raid_history WHERE status = 'completed' ORDER BY id DESC LIMIT 1`,
  (err, lastRaid) => {
    // ...
    const completedAt = new Date(lastRaid.completed_at);
    const nextRaidTime = new Date(completedAt.getTime() + 60 * 60 * 1000); // +1 час
    // ...
  });
```

### 2. Raid Boss Pool
- **Single Boss**: "Повелитель ветра" (Wind Lord)
- **Level**: 9
- **HP**: 75,000
- **Rewards**:
  - Gold: 1500-3500
  - Crystals: 90 (divided proportionally by damage %)
  - EXP: 700-1500
  - Item chance: 85%

### 3. Raid Flow
1. **Active Raid**: Players can attack freely (no attack cooldown)
2. **Boss Defeated**: Rewards distributed, raid marked as completed in `raid_history`
3. **Cooldown Period**: 1 hour countdown starts
4. **Auto-Spawn**: New raid automatically created after 1 hour via `setTimeout()`

### 4. UI Display (bot.js - raids_menu)
When no active raid:
- Shows countdown timer: "Следующий рейд появится через X мин Y сек"
- Displays boss preview (Повелитель ветра stats)
- "🔄 Обновить" button to refresh countdown

When raid is active:
- Shows boss HP bar and stats
- "⚔️ Атаковать" button (no cooldown between attacks)
- "👥 Участники" button
- "🔄 Обновить" button

## Technical Details

### Database Tables Used
- `active_raids`: Current active raid (status: 'active', 'completed', 'failed', 'cancelled')
- `raid_history`: Historical record of completed raids with `completed_at` timestamp
- `raid_participants`: Player participation and damage stats

### Cooldown Logic
```javascript
// In completeRaid():
setTimeout(() => {
  createRaid((err, newRaid) => {
    if (err) {
      console.error('Ошибка создания нового рейда:', err);
    } else {
      console.log(`✅ Автоматически создан новый рейд: ${newRaid.name}`);
    }
  });
}, 60 * 60 * 1000); // 1 hour
```

### Countdown Display
```javascript
const minutes = Math.floor(nextRaid.timeLeft / 60);
const seconds = nextRaid.timeLeft % 60;
// Shows: "X мин Y сек"
```

## User Experience
1. Players see active raid and can attack immediately
2. After boss is killed, rewards are distributed
3. Raid menu shows countdown: "Следующий рейд появится через 59 мин 30 сек"
4. Players can click "🔄 Обновить" to refresh countdown
5. After 1 hour, new raid automatically spawns
6. Players can immediately join and attack the new raid

## Notes
- No attack cooldown during active raid (players attack freely)
- Only 1-hour cooldown between raids (after boss death)
- Auto-spawn uses `setTimeout()` - may need database persistence for server restarts
- Placeholder image needed: `images/raids/raid_waiting.jpg`

## Status
✅ Implemented and ready for testing
