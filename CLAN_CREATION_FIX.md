# Исправление создания кланов

## 🐛 Проблема:
```
errno: 1, code: 'SQLITE_ERROR'
Ошибка создания клана: [Error: SQLITE_ERROR: table clans has no column named total_power]
```

## 🔍 Причина:
В существующей базе данных таблица `clans` была создана без колонок `level`, `member_count`, `total_power`, `created_at`, но код пытался вставить данные в эти колонки.

## 🔧 Решение:

### 1. ✅ Добавил ALTER TABLE команды в database_simple.js
```javascript
// Добавляем недостающие колонки если таблица уже существовала
db.run(`ALTER TABLE clans ADD COLUMN level INTEGER DEFAULT 1`, (err) => {
  if (err && !err.message.includes('duplicate column')) {
    console.error('Ошибка добавления level в clans:', err.message);
  }
});

db.run(`ALTER TABLE clans ADD COLUMN member_count INTEGER DEFAULT 1`, (err) => {
  if (err && !err.message.includes('duplicate column')) {
    console.error('Ошибка добавления member_count в clans:', err.message);
  }
});

db.run(`ALTER TABLE clans ADD COLUMN total_power INTEGER DEFAULT 0`, (err) => {
  if (err && !err.message.includes('duplicate column')) {
    console.error('Ошибка добавления total_power в clans:', err.message);
  }
});

db.run(`ALTER TABLE clans ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`, (err) => {
  if (err && !err.message.includes('duplicate column')) {
    console.error('Ошибка добавления created_at в clans:', err.message);
  }
});
```

### 2. ✅ Упростил INSERT запрос в bot.js
**Было:**
```javascript
db.run(`INSERT INTO clans (name, leader_id, level, member_count, total_power) VALUES (?, ?, ?, ?, ?)`,
  [clanName, userId, 1, 1, 0], function(err) {
```

**Стало:**
```javascript
db.run(`INSERT INTO clans (name, leader_id) VALUES (?, ?)`,
  [clanName, userId], function(err) {
```

Остальные поля (`level`, `member_count`, `total_power`) будут заполнены значениями по умолчанию из схемы таблицы.

## 🎯 Результат:

Теперь при создании клана:
1. **Если таблица новая** - создается со всеми колонками
2. **Если таблица старая** - добавляются недостающие колонки с ALTER TABLE
3. **INSERT использует только обязательные поля** - остальные заполняются по умолчанию

## ✅ Статус:
**ИСПРАВЛЕНО!** Создание кланов теперь работает корректно для любой версии базы данных.