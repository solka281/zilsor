# 📊 Система форматирования больших чисел

## Описание

Утилита для форматирования больших чисел с сокращениями, как в популярных играх:
- **1,390,000** → **1.39M**
- **1,500,000,000** → **1.5B**
- **2,750,000,000,000** → **2.75T**

## Установка

Файл `number_formatter.js` уже создан в корне проекта.

## Использование

### 1. Импорт в bot.js

```javascript
const { formatNumber, formatWithCommas, smartFormat } = require('./number_formatter');
```

### 2. Доступные функции

#### `formatNumber(num, decimals = 2)`
Использует сокращения для чисел >= 100,000

```javascript
formatNumber(1500)        // "1 500"
formatNumber(99999)       // "99 999"
formatNumber(100000)      // "100K"
formatNumber(150000)      // "150K"
formatNumber(1390000)     // "1.39M"
formatNumber(1500000000)  // "1.5B"
formatNumber(1234567, 0)  // "1M" (без десятичных)
formatNumber(1234567, 3)  // "1.235M" (3 знака)
```

#### `formatWithCommas(num)`
Добавляет разделители тысяч (пробелы)

```javascript
formatWithCommas(1500)      // "1 500"
formatWithCommas(1390000)   // "1 390 000"
```

#### `smartFormat(num, threshold = 1000000, decimals = 2)`
Умное форматирование (рекомендуется):
- < 1,000: обычный формат
- 1,000 - 999,999: с разделителями
- >= 1,000,000: с сокращениями

```javascript
smartFormat(500)         // "500"
smartFormat(1500)        // "1 500"
smartFormat(150000)      // "150 000"
smartFormat(1390000)     // "1.39M"
smartFormat(1500000000)  // "1.5B"
```

### 3. Суффиксы

| Значение | Суффикс | Название |
|----------|---------|----------|
| 100,000 | K | Hundred Thousand (сто тысяч) |
| 1,000,000 | M | Million (миллион) |
| 1,000,000,000 | B | Billion (миллиард) |
| 1,000,000,000,000 | T | Trillion (триллион) |
| 1,000,000,000,000,000 | Q | Quadrillion (квадриллион) |

## Примеры интеграции в bot.js

### Профиль игрока

**Было:**
```javascript
`💰 Золото: ${player.gold}\n` +
`💎 Кристаллы: ${player.crystals}\n` +
`❤️ HP: ${stats.hp}\n`
```

**Стало:**
```javascript
`💰 Золото: ${smartFormat(player.gold)}\n` +
`💎 Кристаллы: ${smartFormat(player.crystals)}\n` +
`❤️ HP: ${smartFormat(stats.hp)}\n`
```

### HP босса в рейде

**Было:**
```javascript
`❤️ HP: ${raid.current_hp.toLocaleString()}/${raid.boss_hp.toLocaleString()}\n`
```

**Стало:**
```javascript
`❤️ HP: ${smartFormat(raid.current_hp)}/${smartFormat(raid.boss_hp)}\n`
```

### Награды после боя

**Было:**
```javascript
`💰 Золото: +${goldReward} (${currentGold}💰)\n` +
`✨ Опыт: +${expReward} (${currentExp}✨)\n`
```

**Стало:**
```javascript
`💰 Золото: +${smartFormat(goldReward)} (${smartFormat(currentGold)}💰)\n` +
`✨ Опыт: +${smartFormat(expReward)} (${smartFormat(currentExp)}✨)\n`
```

### Урон в рейде

**Было:**
```javascript
`⚔️ Урон: ${p.damage_dealt.toLocaleString()}`
```

**Стало:**
```javascript
`⚔️ Урон: ${smartFormat(p.damage_dealt)}`
```

## Настройка порога сокращений

Если хотите использовать сокращения для чисел >= 100,000:

```javascript
smartFormat(150000, 100000)  // "150K" вместо "150 000"
```

Если хотите использовать сокращения для всех чисел >= 1,000:

```javascript
smartFormat(1500, 1000)  // "1.5K" вместо "1 500"
```

## Тестирование

Запустите тестовый файл:

```bash
node test_number_formatter.js
```

## Рекомендации

1. **Используйте `smartFormat()`** для большинства случаев - она автоматически выбирает лучший формат
2. **Используйте `formatNumber()`** когда нужны сокращения для всех чисел
3. **Используйте `formatWithCommas()`** когда нужны только разделители без сокращений
4. Для очень больших чисел (миллионы+) используйте меньше десятичных знаков: `formatNumber(num, 1)`

## Примеры результатов

```
500 → 500
1,500 → 1 500
15,000 → 15 000
150,000 → 150 000
1,390,000 → 1.39M
5,500,000 → 5.5M
1,500,000,000 → 1.5B
2,750,000,000,000 → 2.75T
```
