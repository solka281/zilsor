# 🔧 Пример интеграции форматирования чисел в bot.js

## Шаг 1: Добавить импорт в начало bot.js

```javascript
// В начале файла bot.js, после других require
const { smartFormat } = require('./number_formatter');
```

## Шаг 2: Примеры замены кода

### Пример 1: Профиль игрока (строка ~4019)

**Было:**
```javascript
`📊 Уровень: ${player.level}\n` +
`✨ Опыт: ${player.exp}/${Math.floor(expNeeded)}\n` +
`💰 Золото: ${player.gold}\n\n` +
```

**Стало:**
```javascript
`📊 Уровень: ${player.level}\n` +
`✨ Опыт: ${smartFormat(player.exp)}/${smartFormat(Math.floor(expNeeded))}\n` +
`💰 Золото: ${smartFormat(player.gold)}\n\n` +
```

### Пример 2: Характеристики (строка ~4024)

**Было:**
```javascript
`⚔️ Боевые характеристики:\n` +
`⚡ Сила: ${stats.power}\n` +
`❤️ HP: ${stats.hp}\n` +
`🗡️ Атака: ${stats.attack}\n` +
`🛡️ Защита: ${stats.defense}\n\n` +
```

**Стало:**
```javascript
`⚔️ Боевые характеристики:\n` +
`⚡ Сила: ${smartFormat(stats.power)}\n` +
`❤️ HP: ${smartFormat(stats.hp)}\n` +
`🗡️ Атака: ${smartFormat(stats.attack)}\n` +
`🛡️ Защита: ${smartFormat(stats.defense)}\n\n` +
```

### Пример 3: HP босса в рейде (строка ~1750)

**Было:**
```javascript
`❤️ HP: ${activeRaid.current_hp.toLocaleString()}/${activeRaid.boss_hp.toLocaleString()}\n` +
```

**Стало:**
```javascript
`❤️ HP: ${smartFormat(activeRaid.current_hp)}/${smartFormat(activeRaid.boss_hp)}\n` +
```

### Пример 4: Награды после боя (строка ~1102)

**Было:**
```javascript
`💰 Золото: +${actualGoldReward} (${currentGold}💰)\n` +
`✨ Опыт: +${actualExpReward} (${currentExp}✨)\n`;
```

**Стало:**
```javascript
`💰 Золото: +${smartFormat(actualGoldReward)} (${smartFormat(currentGold)}💰)\n` +
`✨ Опыт: +${smartFormat(actualExpReward)} (${smartFormat(currentExp)}✨)\n`;
```

### Пример 5: Урон участников рейда (строка ~1958)

**Было:**
```javascript
const playerName = p.display_name || p.username || `Игрок ${p.user_id}`;
participantsList += `${medal} ${playerName}: ${p.damage_dealt.toLocaleString()} (${damagePercent}%)\n`;
```

**Стало:**
```javascript
const playerName = p.display_name || p.username || `Игрок ${p.user_id}`;
participantsList += `${medal} ${playerName}: ${smartFormat(p.damage_dealt)} (${damagePercent}%)\n`;
```

### Пример 6: Информация о боссе (строка ~1829)

**Было:**
```javascript
`❤️ HP: ${totalHP.toLocaleString()}\n` +
`🏆 Побед: ${boss.times_defeated} (+${hpBonus.toLocaleString()} HP)\n` +
```

**Стало:**
```javascript
`❤️ HP: ${smartFormat(totalHP)}\n` +
`🏆 Побед: ${boss.times_defeated} (+${smartFormat(hpBonus)} HP)\n` +
```

### Пример 7: Информация о игроке для админа (строка ~2525)

**Было:**
```javascript
`💰 Золото: ${player.gold}\n` +
`💎 Кристаллы: ${player.crystals}\n\n` +
```

**Стало:**
```javascript
`💰 Золото: ${smartFormat(player.gold)}\n` +
`💎 Кристаллы: ${smartFormat(player.crystals)}\n\n` +
```

## Шаг 3: Массовая замена

Можно использовать поиск и замену в редакторе:

### Замена 1: toLocaleString()
**Найти:** `.toLocaleString()`
**Заменить на:** ничего (удалить), затем обернуть в `smartFormat()`

### Замена 2: Простые числа в сообщениях
Найти все места где выводятся числа и обернуть их в `smartFormat()`:
- `${player.gold}` → `${smartFormat(player.gold)}`
- `${stats.hp}` → `${smartFormat(stats.hp)}`
- `${damage}` → `${smartFormat(damage)}`

## Места для замены в bot.js

Основные места, где нужно применить форматирование:

1. **Профиль игрока** (~4019-4027)
2. **Награды после боя** (~1102-1120)
3. **Рейды - HP босса** (~1750, 1827, 1866, 1950)
4. **Рейды - урон участников** (~1958)
5. **Информация о расе** (~1602-1605, 4068)
6. **Админ команды** (~2525-2826)
7. **Создание босса** (~3655-3662)
8. **Характеристики в бою** (battle_system.js)

## Тестирование после интеграции

После внесения изменений проверьте:

1. ✅ Профиль игрока - все числа отображаются корректно
2. ✅ Награды после боя - золото и опыт форматируются
3. ✅ Рейды - HP босса и урон участников
4. ✅ Информация о расе - характеристики
5. ✅ Админ панель - все числовые данные

## Примечания

- `smartFormat()` автоматически выбирает лучший формат
- Для чисел < 1,000 - обычный вид
- Для чисел 1,000-999,999 - с пробелами (1 500)
- Для чисел >= 1,000,000 - с сокращениями (1.5M)
- Отрицательные числа поддерживаются
- Null/undefined автоматически становятся "0"
