# Исправление ошибки с энергией в бою

## 🐛 Проблема

При использовании специальной атаки в PvP бою возникала ошибка:
```
RangeError: Invalid count value
at String.repeat (<anonymous>)
at showBattleScreen (/app/bot.js:455:60)
```

## 🔍 Причина

Функция `showBattleScreen()` пыталась использовать `String.repeat()` с отрицательным или некорректным значением `status.specialEnergy`:

```javascript
// БЫЛО (ошибка):
const energyBar = '⚡'.repeat(status.specialEnergy) + '⚪'.repeat(3 - status.specialEnergy);
```

Если `status.specialEnergy` был отрицательным, undefined или больше 3, это вызывало ошибку.

## ✅ Решение

Добавлена проверка и нормализация значения энергии:

```javascript
// СТАЛО (исправлено):
const safeEnergy = Math.max(0, Math.min(3, status.specialEnergy || 0));
const energyBar = '⚡'.repeat(safeEnergy) + '⚪'.repeat(3 - safeEnergy);
battleText += `${energyBar} Энергия: ${safeEnergy}/3\n\n`;
```

Также обновлена кнопка специальной атаки:
```javascript
{ text: status.specialReady ? '✨ Спец. атака (готова!)' : `✨ Спец. атака (${safeEnergy}/3)`, callback_data: 'battle_special' }
```

## 🛡️ Защита

Функция `Math.max(0, Math.min(3, value || 0))` гарантирует:
- Минимальное значение: 0
- Максимальное значение: 3
- Если value = undefined/null, используется 0
- Если value отрицательное, используется 0
- Если value > 3, используется 3

## 📁 Измененные файлы

- `bot.js` - функция `showBattleScreen()`

## ✅ Статус

Ошибка исправлена. Бой теперь работает корректно даже при некорректных значениях энергии.
