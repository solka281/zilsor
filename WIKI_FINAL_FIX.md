# Wiki - Финальное исправление (ТОЛЬКО РЕАЛЬНЫЕ данные)

## ❌ Проблема
Пользователь сообщил: "ну вот нет у нас таких мобов, способностей у них тоже нет"

## 🔍 Анализ
Проверил код `monsters.js` и обнаружил, что у мобов есть ТОЛЬКО эти поля:
- `name` - название
- `emoji` - эмодзи
- `hp` - здоровье
- `attack` - атака
- `defense` - защита
- `goldReward` - награда золотом [мин, макс]
- `expReward` - награда опытом [мин, макс]
- `specialAbility` - ТОЛЬКО название способности (например "Укус")

## ❌ Что я ВЫДУМАЛ (этого НЕТ в коде):
- `abilityDescription` - описание способности ❌
- `lore` - лор моба ❌
- `lore.origin`, `lore.dangers`, `lore.secrets` для локаций ❌

## ✅ Как работают способности в боте:
Из `monsters.js` строки 680-700:
```javascript
// Специальная способность (15% шанс)
let isSpecial = false;
let specialName = '';
if (Math.random() < 0.15 && attacker.specialAbility) {
  isSpecial = true;
  specialName = attacker.specialAbility;
  damage *= 1.5;  // +50% урона
}
```

**Способности:**
- Срабатывают с 15% шансом
- Просто добавляют +50% урона
- Показывается только название (например "✨ Укус")
- НЕТ никаких описаний в игре!

## ✅ Что исправлено

### 1. `wiki/locations_data.js` - ПОЛНОСТЬЮ ПЕРЕПИСАН
Убрал ВСЕ выдуманные поля:
- ❌ Удалено: `abilityDescription` у мобов
- ❌ Удалено: `lore` у мобов
- ❌ Удалено: `lore.origin`, `lore.dangers`, `lore.secrets` у локаций
- ❌ Удалено: `abilityDescription` у боссов
- ❌ Удалено: `lore` у боссов
- ❌ Удалено: `lore` и `strategy` у рейдовых боссов

Оставлено ТОЛЬКО то, что есть в `monsters.js`:
```javascript
mobs: [
    {
        name: 'Лесной Волк',
        emoji: '🐺',
        hp: 100,
        attack: 30,
        defense: 15,
        goldReward: [25, 50],
        expReward: [30, 55],
        specialAbility: 'Укус'  // ТОЛЬКО название!
    }
]
```

### 2. `wiki/app.js` - Обновлены функции отображения
Убрал отображение выдуманных полей:
- В `showLocationsSection()`: удалено отображение lore локаций
- В карточках мобов: удалено `abilityDescription` и `lore`
- В карточках боссов: удалено `abilityDescription` и `lore`
- В `showBosses()`: удалено `abilityDescription` и `lore`
- В `showRaids()`: удалено `lore` и `strategy`

## 📊 Итоговая структура данных

### Локация:
```javascript
{
    id: 2,
    name: 'Темный Лес',
    levels: [11, 20],
    description: 'Густой лес...',  // Краткое описание
    image: 'locations/location_dark_forest.jpg',
    mobs: [...],
    boss: {...}
}
```

### Моб:
```javascript
{
    name: 'Лесной Волк',
    emoji: '🐺',
    hp: 100,
    attack: 30,
    defense: 15,
    goldReward: [25, 50],
    expReward: [30, 55],
    specialAbility: 'Укус'  // Только название
}
```

### Босс:
```javascript
{
    level: 20,
    name: 'Альфа Волк',
    emoji: '🐺',
    hp: 600,
    attack: 80,
    defense: 60,
    goldReward: 350,
    expReward: 200,
    crystalReward: [1, 2],
    itemDropChance: 0.5,
    specialAbility: 'Вой стаи'  // Только название
}
```

### Рейдовый босс:
```javascript
{
    name: 'Повелитель ветра',
    level: 1,
    hp: 75000,
    image: 'raids/raid_wind_lord.jpg',
    description: 'Древний повелитель стихии ветра',  // Только краткое описание
    rewards: {
        total_gold: 1000,
        total_crystals: 20,
        total_exp: 1000
    },
    cooldown_hours: 2,
    requirements: null
}
```

## ✅ Результат

Теперь в wiki отображаются ТОЛЬКО реальные данные из бота:
- ✅ Все 12 локаций
- ✅ 36 мобов с РЕАЛЬНЫМИ характеристиками
- ✅ 12 боссов локаций
- ✅ 2 рейдовых босса
- ✅ Способности показываются ТОЛЬКО по названию (как в боте)
- ✅ НЕТ выдуманных описаний и лора

**Проблема полностью решена!**
