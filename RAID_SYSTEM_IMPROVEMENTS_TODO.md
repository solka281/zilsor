# Raid System Improvements - TODO List

## Completed ✅

### 1. Show Username Instead of ID in Raid Results
**Status**: ✅ DONE
**Changes**:
- Modified `completeRaid()` in raids.js to JOIN with players table
- Added username to results object
- Updated bot.js to display `p.username` instead of `p.player_id`

**Result**: Raid results now show player names like "PlayerName" instead of "Игрок 123456"

---

## Pending Tasks 🔄

### 2. Fix Second Artifact Equip Bug
**Status**: ⚠️ TODO
**Problem**: Cannot equip second artifact
**Investigation needed**:
- Check inventory system
- Check item equip logic
- Check artifact slot limits

**Files to check**:
- `items.js` - item equip logic
- `bot.js` - equip item handler
- Database schema - inventory table

---

### 3. Add Raid Boss Editor to Admin Panel
**Status**: ⚠️ TODO
**Requirements**:
- Admin can edit existing raid bosses
- Edit: name, level, HP, rewards, image
- Changes saved to database or config

**Implementation**:
1. Add "✏️ Редактор боссов" button in admin panel
2. Show list of existing bosses
3. Click boss → edit menu
4. Save changes to database

**Files to modify**:
- `bot.js` - add admin handlers
- `raids.js` - add update functions
- Database - may need boss_templates table

---

### 4. Add Raid Images
**Status**: ⚠️ TODO
**Required images**:
1. `images/raids/raid_wind_lord.jpg` - Wind Lord boss
2. `images/raids/raid_main.jpg` - Raids menu background
3. `images/raids/raid_waiting.jpg` - Countdown screen

**Action**: Create/add images manually

---

### 5. Add Boss Creator in Admin Panel
**Status**: ⚠️ TODO
**Requirements**:
- Admin can create new raid bosses
- Input all parameters:
  - Name
  - Level
  - HP
  - Description
  - Rewards (gold, crystals, exp)
  - Image filename
- Boss added to boss list (not started immediately)
- Boss appears in selection menu

**Implementation**:
1. Add "➕ Создать босса" button in admin panel
2. Step-by-step input:
   - Enter name
   - Enter level
   - Enter HP
   - Enter description
   - Enter rewards
   - Enter image filename
3. Save to `raid_bosses` table
4. Boss appears in boss selection

**Database schema needed**:
```sql
CREATE TABLE raid_bosses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  level INTEGER NOT NULL,
  base_hp INTEGER NOT NULL,
  current_hp_bonus INTEGER DEFAULT 0,
  image TEXT,
  description TEXT,
  rewards TEXT, -- JSON
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**Files to modify**:
- `raids.js` - add createBossTemplate(), getBossList()
- `bot.js` - add admin handlers for boss creation
- Database - add raid_bosses table

---

### 6. Progressive HP Scaling System
**Status**: ⚠️ TODO
**Requirements**:
- Each time boss is defeated, next spawn has +5000 HP
- Scales infinitely
- HP bonus persists across server restarts

**Implementation**:
1. Add `times_defeated` column to raid_bosses table
2. When boss defeated:
   ```javascript
   db.run(`UPDATE raid_bosses SET times_defeated = times_defeated + 1 WHERE id = ?`)
   ```
3. When creating new raid:
   ```javascript
   const hpBonus = boss.times_defeated * 5000;
   const totalHP = boss.base_hp + hpBonus;
   ```
4. Display in UI:
   ```
   ❤️ HP: 80,000 (75,000 + 5,000 bonus)
   🔄 Defeated: 1 time
   ```

**Database changes**:
```sql
ALTER TABLE raid_bosses ADD COLUMN times_defeated INTEGER DEFAULT 0;
ALTER TABLE raid_bosses ADD COLUMN base_hp INTEGER NOT NULL;
```

**Files to modify**:
- `raids.js`:
  - `createRaid()` - calculate HP with bonus
  - `completeRaid()` - increment times_defeated
- `bot.js` - display HP bonus in UI

---

## Implementation Priority

1. **HIGH**: Fix second artifact equip bug (blocking gameplay)
2. **HIGH**: Progressive HP scaling (core feature)
3. **MEDIUM**: Add raid images (improves UX)
4. **MEDIUM**: Boss creator in admin panel (content creation)
5. **LOW**: Boss editor in admin panel (nice to have)

---

## Detailed Implementation Plan

### Progressive HP Scaling (Detailed)

#### Step 1: Database Migration
```javascript
// In raids.js - initializeRaids()
db.run(`CREATE TABLE IF NOT EXISTS raid_bosses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  level INTEGER NOT NULL,
  base_hp INTEGER NOT NULL,
  times_defeated INTEGER DEFAULT 0,
  image TEXT,
  description TEXT,
  rewards TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

// Migrate existing boss
db.run(`INSERT INTO raid_bosses (name, level, base_hp, image, description, rewards)
        VALUES ('Повелитель ветра', 9, 75000, 'raid_wind_lord.jpg', 
                'Древний повелитель стихии ветра', 
                '{"total_gold":1000,"total_crystals":20,"total_exp":1000}')`);
```

#### Step 2: Modify createRaid()
```javascript
function createRaid(callback) {
  // Get boss from database
  db.get(`SELECT * FROM raid_bosses ORDER BY RANDOM() LIMIT 1`, (err, boss) => {
    if (err) return callback(err);
    
    // Calculate HP with scaling
    const hpBonus = boss.times_defeated * 5000;
    const totalHP = boss.base_hp + hpBonus;
    
    // Create raid with scaled HP
    db.run(`INSERT INTO active_raids 
      (boss_name, boss_level, boss_hp, current_hp, boss_image, boss_description, rewards, ends_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [boss.name, boss.level, totalHP, totalHP, boss.image, boss.description, 
       boss.rewards, endsAt.toISOString()],
      function(err) {
        // ...
      });
  });
}
```

#### Step 3: Modify completeRaid()
```javascript
function completeRaid(raidId, callback) {
  db.get(`SELECT * FROM active_raids WHERE id = ?`, [raidId], (err, raid) => {
    // ... existing code ...
    
    // Increment times_defeated
    db.run(`UPDATE raid_bosses SET times_defeated = times_defeated + 1 
            WHERE name = ?`, [raid.boss_name]);
    
    // ... rest of code ...
  });
}
```

#### Step 4: Update UI
```javascript
// In bot.js - show HP bonus
`❤️ HP: ${raid.current_hp.toLocaleString()}/${raid.boss_hp.toLocaleString()}\n` +
`🔄 Побежден: ${boss.times_defeated} раз\n` +
`💪 Бонус HP: +${boss.times_defeated * 5000}\n`
```

---

## Testing Checklist

- [ ] Raid results show player names
- [ ] Can equip second artifact
- [ ] Can create new boss via admin panel
- [ ] Can edit existing boss via admin panel
- [ ] Raid images display correctly
- [ ] Boss HP increases by 5k after each defeat
- [ ] HP bonus persists after server restart
- [ ] HP bonus displays in UI

---

## Status Summary

✅ **Completed**: 1/6 tasks
🔄 **In Progress**: 0/6 tasks
⚠️ **Pending**: 5/6 tasks

**Next Steps**: 
1. Investigate artifact equip bug
2. Implement progressive HP scaling
3. Add raid images
