# ⏰ Исправление кулдауна и кристаллов

## 🔧 ИЗМЕНЕНИЯ:

### ✅ 1. Кулдаун возвращен на 10 секунд
**Было:** 120 секунд (2 минуты)  
**Стало:** 10 секунд

```javascript
// В getCooldown()
case 'forest':
  cooldownSeconds = 10; // 10 секунд

// В adventure_level обработчике  
setCooldown(userId, 'forest', 10); // 10 секунд
```

### ✅ 2. Усилена защита от кристаллов с повторных боссов
**Было:** Только проверка `enemy.crystalReward`  
**Стало:** Двойная проверка `enemy.crystalReward` + `battle.isBossRerun`

```javascript
// Старая логика
const crystalReward = victory && enemy.isBoss ? enemy.crystalReward : 0;

// Новая логика (двойная защита)
const crystalReward = victory && enemy.isBoss && !battle.isBossRerun ? enemy.crystalReward : 0;
```

## 🛡️ КАК РАБОТАЕТ ЗАЩИТА ОТ КРИСТАЛЛОВ:

### Уровень 1: При создании босса
```javascript
if (killedBoss) {
  enemy.crystalReward = 0; // Убираем кристаллы
  enemy.name += ' (Повтор)';
  isBossRerun = true;
}
```

### Уровень 2: При выдаче наград
```javascript
const crystalReward = victory && enemy.isBoss && !battle.isBossRerun ? enemy.crystalReward : 0;
```

### Уровень 3: При записи в базу
```javascript
if (victory && enemy.isBoss && !battle.isBossRerun) {
  // Записываем только первые убийства
  db.run(`INSERT INTO killed_bosses...`);
}
```

## 🎯 РЕЗУЛЬТАТ:

- ⏰ **Кулдаун:** 10 секунд (как было раньше)
- 💎 **Кристаллы:** Только с первого убийства босса
- 🔒 **Защита:** Тройная проверка от дублирования кристаллов
- 👑 **Повторы:** Четко помечены как "(Повтор)"

## ✅ ГОТОВО!

Система работает как задумано:
- Быстрый кулдаун для комфортной игры
- Кристаллы только за новых боссов
- Можно фармить золото/опыт на повторах