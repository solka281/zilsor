# Admin Reset Crystals Command

## Overview
Added admin command to reset all players' crystals to 0. This is useful for economy rebalancing or seasonal resets.

## Changes Made

### 1. Admin Panel Button (bot.js)
Added "🔄 Обнулить кристаллы" button in admin panel:
```javascript
[
  { text: '⏰ Сбросить кулдауны', callback_data: 'admin_reset_cooldowns' },
  { text: '🔄 Обнулить кристаллы', callback_data: 'admin_reset_crystals' }
]
```

### 2. Confirmation Dialog
**Handler**: `admin_reset_crystals`
- Shows warning message
- Requires explicit confirmation
- Cannot be undone

**Message**:
```
🔄 Обнуление кристаллов

⚠️ Вы уверены, что хотите обнулить кристаллы у ВСЕХ игроков?

Это действие нельзя отменить!
```

**Buttons**:
- ✅ Да, обнулить
- ❌ Отмена

### 3. Execution Handler
**Handler**: `admin_confirm_reset_crystals`

**SQL Query**:
```sql
UPDATE players SET crystals = 0
```

**Features**:
- Resets crystals to 0 for all players
- Counts affected players
- Logs action to admin log channel
- Shows success notification
- Returns to admin panel

**Success Message**:
```
✅ Кристаллы обнулены у X игроков
```

**Log Message**:
```
🔄 Обнуление кристаллов
👤 Админ: @username
👥 Затронуто игроков: X
```

## Usage Flow

1. Admin opens admin panel (`/admin`)
2. Clicks "🔄 Обнулить кристаллы"
3. Sees confirmation dialog with warning
4. Clicks "✅ Да, обнулить" to confirm
5. System resets all crystals to 0
6. Admin sees success notification
7. Action logged to admin channel
8. Returns to admin panel

## Security

- Only accessible by `config.ADMIN_USERNAME`
- Requires explicit confirmation
- All actions logged with admin username
- Cannot be undone (permanent action)

## Use Cases

1. **Economy Reset**: Reset economy for new season
2. **Rebalancing**: After changing crystal rewards/costs
3. **Bug Fix**: After accidental crystal duplication
4. **Event Start**: Clean slate for special events

## Notes

- Affects ALL players in database
- Does not affect VIP status or other resources
- Action is logged for audit trail
- No way to restore crystals after reset

## Status
✅ Implemented and ready for use
