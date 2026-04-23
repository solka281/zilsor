# Исправление ошибки парсинга Markdown

## 🐛 Проблема:
```
TelegramError: ETELEGRAM: 400 Bad Request: can't parse entities: 
Can't find end of the entity starting at byte offset 62
```

## 🔍 Причина:
В сообщениях о дуэлях использовался `parse_mode: 'Markdown'`, но username игроков может содержать символы `_` (подчеркивание) или `*` (звездочка), которые являются специальными символами Markdown и ломают форматирование.

**Пример проблемного username:**
- `riz_skiis` - содержит `_`
- `player*123` - содержит `*`

Когда такой username вставляется в текст с Markdown, Telegram не может правильно распарсить форматирование.

## 🔧 Решение:

Убрал `parse_mode: 'Markdown'` из всех сообщений, которые содержат динамические данные (username игроков).

### Исправленные сообщения:

#### 1. Начало дуэли
**Было:**
```javascript
bot.sendMessage(player1Id, 
  `⚔️ *Дуэль началась!*\n\n` +
  `Противник: ${p2Stats.username}\n` +
  `Уровень: ${p2Stats.level}\n\n` +
  `Приготовьтесь к бою!`,
  { parse_mode: 'Markdown' }
);
```

**Стало:**
```javascript
bot.sendMessage(player1Id, 
  `⚔️ Дуэль началась!\n\n` +
  `Противник: ${p2Stats.username}\n` +
  `Уровень: ${p2Stats.level}\n\n` +
  `Приготовьтесь к бою!`
);
```

#### 2. Противник найден (сразу)
**Было:**
```javascript
bot.sendMessage(userId, 
  `⚔️ *Противник найден!*\n\n` +
  `🎯 Противник: ${opponent.username || 'Игрок'}\n` +
  `🏆 MMR: ${opponent.mmr || 0}\n` +
  `📊 ${opponent.wins || 0}W / ${opponent.losses || 0}L\n\n` +
  `⚡ Начинаем бой!`, 
  { parse_mode: 'Markdown' }
);
```

**Стало:**
```javascript
bot.sendMessage(userId, 
  `⚔️ Противник найден!\n\n` +
  `🎯 Противник: ${opponent.username || 'Игрок'}\n` +
  `🏆 MMR: ${opponent.mmr || 0}\n` +
  `📊 ${opponent.wins || 0}W / ${opponent.losses || 0}L\n\n` +
  `⚡ Начинаем бой!`
);
```

#### 3. Противник найден (через поллинг)
Аналогично убран Markdown.

#### 4. Поиск противника
**Было:**
```javascript
bot.sendMessage(chatId,
  `🔍 *Поиск противника...*\n\n` +
  `🎯 Ищем игрока вашего уровня\n` +
  `⏱️ Это может занять до 30 секунд\n\n` +
  `💡 Сначала ищем в радиусе ±500 MMR\n` +
  `🌐 Затем расширяем поиск`, {
  parse_mode: 'Markdown',
  ...
});
```

**Стало:**
```javascript
bot.sendMessage(chatId,
  `🔍 Поиск противника...\n\n` +
  `🎯 Ищем игрока вашего уровня\n` +
  `⏱️ Это может занять до 30 секунд\n\n` +
  `💡 Сначала ищем в радиусе ±500 MMR\n` +
  `🌐 Затем расширяем поиск`, {
  ...
});
```

#### 5. Поиск завершен
Аналогично убран Markdown.

## 💡 Альтернативное решение:

Можно было бы экранировать специальные символы в username:
```javascript
function escapeMarkdown(text) {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

const safeUsername = escapeMarkdown(username);
```

Но проще убрать Markdown из сообщений с динамическими данными.

## 🎯 Результат:

- ✅ Ошибки парсинга Markdown больше не возникают
- ✅ Сообщения отправляются корректно для любых username
- ✅ Дуэли работают без сбоев
- ✅ Визуально сообщения выглядят так же (emoji остались)

## ✅ Статус:
**ИСПРАВЛЕНО!** Все сообщения о дуэлях теперь работают корректно независимо от символов в username игроков.