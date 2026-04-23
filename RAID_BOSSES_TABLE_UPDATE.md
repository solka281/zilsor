# Исправление структуры таблицы raid_bosses

## Проблема
При запуске бота возникала ошибка:
```
SQLITE_ERROR: no such column: rb.cooldown_hours
```

Это происходило потому что таблица `raid_bosses` была создана раньше без новых колонок, которые были добавлены для поддержки Владыки тьмы.

## Решение

### 1. Обновлена функция `initializeRaids()`
- Добавлена проверка структуры существующей таблицы `raid_bosses`
- Автоматическое добавление недостающих колонок:
  - `cooldown_hours` - кулдаун между рейдами
  - `requirements` - условия участия в JSON
  - `special_rewards` - специальные награды в JSON

### 2. Добавлен fallback в `getNextRaidTime()`
- Если запрос с JOIN не работает, используется простой запрос к `raid_history`
- Стандартный кулдаун 2 часа в случае ошибки

## Код исправления

### Проверка и обновление структуры:
```javascript
db.all(`PRAGMA table_info(raid_bosses)`, (err, columns) => {
  const hasRequirements = columns && columns.some(col => col.name === 'requirements');
  const hasSpecialRewards = columns && columns.some(col => col.name === 'special_rewards');
  const hasCooldownHours = columns && columns.some(col => col.name === 'cooldown_hours');
  
  // Добавляем недостающие колонки
  if (!hasCooldownHours) {
    db.run(`ALTER TABLE raid_bosses ADD COLUMN cooldown_hours INTEGER DEFAULT 2`);
  }
  // ... остальные колонки
});
```

### Fallback для getNextRaidTime:
```javascript
db.get(`SELECT rh.*, rb.cooldown_hours FROM raid_history rh LEFT JOIN raid_bosses rb...`, (err, lastRaid) => {
  if (err) {
    // Fallback на простой запрос без JOIN
    db.get(`SELECT * FROM raid_history WHERE status = 'completed' ORDER BY id DESC LIMIT 1`, ...);
    return;
  }
  // ... обычная логика
});
```

## Результат
- ✅ Автоматическое обновление структуры таблицы при запуске
- ✅ Совместимость со старыми установками
- ✅ Fallback механизм для обработки ошибок
- ✅ Сохранение всех существующих данных
- ✅ Поддержка новых функций (кулдаун, условия, специальные награды)

## Тестирование
После применения исправления:
1. Бот запускается без ошибок
2. Меню рейдов работает корректно
3. Старые рейды продолжают функционировать
4. Новые боссы создаются с правильной структурой
5. Кулдауны работают согласно настройкам босса