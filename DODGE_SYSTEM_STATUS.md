# 💨 Статус системы уклонения в боте

## ✅ ГДЕ РАБОТАЕТ:

### 🎮 battle_system.js (PvE бои)
```javascript
// ✅ ПРАВИЛЬНО - учитывает эффекты предметов
let dodgeChance = 0.05 + (defender.defense / 1000);
if (defender.itemEffects && defender.itemEffects.length > 0) {
  dodgeChance = raceAbilities.modifyDodgeWithItems(dodgeChance, defender.itemEffects);
}
```

**Используется в:**
- 🌲 Бои в лесу (PvE)
- 🏰 Рейды
- 👹 Битвы с боссами

## ❌ ГДЕ НЕ РАБОТАЕТ:

### ⚔️ duels.js (PvP дуэли)
```javascript
// ❌ НЕПРАВИЛЬНО - НЕ учитывает эффекты предметов
const dodgeChance = 0.05 + (defender.defense / 1000);
// Нет вызова modifyDodgeWithItems!
```

**НЕ работает в:**
- 🥊 PvP дуэли между игроками
- 🏆 MMR матчи

## 🔧 ПРОБЛЕМА:

В **дуэлях** (duels.js) система уклонения **НЕПОЛНАЯ**:
- ✅ Базовое уклонение работает (5% + защита)
- ❌ Бонусы от предметов НЕ работают
- ❌ Сапоги теней не дают +20% уклонения
- ❌ Руна скорости не дает +25% уклонения

## 🎯 ВЫВОД:

**Частично работает!**
- В **PvE боях** - полностью работает ✅
- В **PvP дуэлях** - только базовое уклонение ❌

## 🛠️ НУЖНО ИСПРАВИТЬ:

Добавить в duels.js в функцию `performAttack`:

```javascript
// БЫЛО:
const dodgeChance = 0.05 + (defender.defense / 1000);

// ДОЛЖНО БЫТЬ:
let dodgeChance = 0.05 + (defender.defense / 1000);
if (defender.itemEffects && defender.itemEffects.length > 0) {
  dodgeChance = raceAbilities.modifyDodgeWithItems(dodgeChance, defender.itemEffects);
}
```

Тогда система уклонения будет работать везде одинаково! 🚀