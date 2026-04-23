# Admin Slash Commands

## Overview
Added slash commands for admin to quickly manage players without using the admin panel UI.

## New Commands

### 1. `/resetcrystals <ID>` - Reset Player Crystals
Resets crystals to 0 for a specific player.

**Usage**:
```
/resetcrystals 123456789
```

**Features**:
- Resets crystals to 0 for specified player
- Shows before/after values
- Notifies the player
- Logs action to admin channel
- Shows player info (name, ID, old/new crystals)

**Response**:
```
✅ Кристаллы обнулены

👤 Игрок: PlayerName
🆔 ID: 123456789
💎 Было: 150
💎 Стало: 0
```

**Player Notification**:
```
⚠️ Ваши кристаллы были обнулены администратором
```

---

### 2. `/givecrystals <ID> <amount>` - Give Crystals
Gives crystals to a specific player.

**Usage**:
```
/givecrystals 123456789 100
```

**Features**:
- Adds crystals to player's balance
- Shows before/after values
- Notifies the player
- Logs action to admin channel
- Validates amount (must be positive integer)

**Response**:
```
✅ Кристаллы выданы

👤 Игрок: PlayerName
🆔 ID: 123456789
💎 Выдано: 100
💎 Было: 50
💎 Стало: 150
```

**Player Notification**:
```
🎁 Вам выдано 100 💎 кристаллов от администратора!
```

---

### 3. `/givegold <ID> <amount>` - Give Gold
Gives gold to a specific player.

**Usage**:
```
/givegold 123456789 5000
```

**Features**:
- Adds gold to player's balance
- Shows before/after values
- Notifies the player
- Logs action to admin channel
- Validates amount (must be positive integer)

**Response**:
```
✅ Золото выдано

👤 Игрок: PlayerName
🆔 ID: 123456789
💰 Выдано: 5000
💰 Было: 1000
💰 Стало: 6000
```

**Player Notification**:
```
🎁 Вам выдано 5000 💰 золота от администратора!
```

---

### 4. `/playerinfo <ID>` - Get Player Info
Shows detailed information about a player.

**Usage**:
```
/playerinfo 123456789
```

**Features**:
- Shows complete player profile
- Displays race and rarity
- Shows resources (gold, crystals)
- Shows stats (wins, losses, MMR)
- Shows awakening progress

**Response**:
```
👤 Информация об игроке

🆔 ID: 123456789
📝 Имя: PlayerName
💎 VIP: Да

🧬 Раса: Феникс (Легендарный)
⭐ Уровень: 15
✨ Опыт: 2500

💰 Золото: 10000
💎 Кристаллы: 150

🏆 Побед: 45
💀 Поражений: 12
🎯 MMR: 1850

🌟 Пробуждение: 2
🔮 XP пробуждения: 3500
```

---

## Command List Summary

| Command | Description | Example |
|---------|-------------|---------|
| `/resetcrystals <ID>` | Reset player crystals to 0 | `/resetcrystals 123456789` |
| `/givecrystals <ID> <amount>` | Give crystals to player | `/givecrystals 123456789 100` |
| `/givegold <ID> <amount>` | Give gold to player | `/givegold 123456789 5000` |
| `/playerinfo <ID>` | Get player information | `/playerinfo 123456789` |

## Security

- All commands require `config.ADMIN_USERNAME` permission
- Non-admin users get "❌ У вас нет прав администратора"
- All actions are logged to admin channel
- Players are notified when resources are modified

## Error Handling

**Invalid Usage**:
```
📝 Использование:

/resetcrystals <ID игрока>

Пример: /resetcrystals 123456789
```

**Player Not Found**:
```
❌ Игрок с ID 123456789 не найден
```

**Invalid Amount**:
```
❌ Неверное количество кристаллов
```

**Database Error**:
```
❌ Ошибка базы данных
```

## Logging

All commands log to admin channel with format:
```
🔄 Обнуление кристаллов игрока
👤 Админ: @admin_username
🎯 Игрок: PlayerName (123456789)
💎 Было: 150 → Стало: 0
```

## Benefits Over UI

1. **Faster**: No need to navigate through menus
2. **Scriptable**: Can be used in automation
3. **Direct**: One command does everything
4. **Visible**: Shows all info in one message
5. **Copyable**: Easy to copy player IDs from messages

## Use Cases

- **Quick fixes**: Reset crystals after bug
- **Rewards**: Give crystals/gold for events
- **Support**: Help players who lost resources
- **Testing**: Quickly modify test accounts
- **Moderation**: Check player stats for suspicious activity

## Status
✅ Implemented and ready for use
