# 🚂 Деплой маркетплейса на Railway через CLI

## Пошаговая инструкция

### 1. Установка Railway CLI (если еще не установлен)

```bash
# Windows (PowerShell)
iwr https://railway.app/install.ps1 | iex

# macOS/Linux
curl -fsSL https://railway.app/install.sh | sh

# Или через npm
npm install -g @railway/cli
```

### 2. Авторизация в Railway

```bash
railway login
```

Откроется браузер для авторизации.

### 3. Подключение к существующему проекту

```bash
# Перейдите в папку с вашим ботом
cd path/to/your/bot

# Подключитесь к существующему проекту
railway link

# Выберите ваш проект из списка
```

### 4. Деплой изменений

```bash
# Деплой всех файлов в текущей папке
railway up

# Или деплой с детальными логами
railway up --detach
```

### 5. Получение URL

```bash
# Показать информацию о проекте
railway status

# Или открыть проект в браузере
railway open
```

Скопируйте URL из вывода команды или из браузера.

### 6. Настройка Telegram Bot

1. Откройте @BotFather в Telegram
2. Выберите вашего бота: `/mybots` → выберите бота
3. Нажмите "Bot Settings" → "Menu Button"
4. Установите Web App URL: `https://your-railway-url.up.railway.app/marketplace`

### 7. Проверка работы

```bash
# Просмотр логов в реальном времени
railway logs

# Проверка статуса
railway status
```

Откройте URL в браузере и проверьте что маркетплейс работает.

## Полезные команды Railway CLI

### Мониторинг
```bash
# Логи в реальном времени
railway logs --follow

# Статус сервиса
railway status

# Переменные окружения
railway variables
```

### Управление
```bash
# Перезапуск сервиса
railway restart

# Информация о проекте
railway info

# Открыть в браузере
railway open
```

### Отладка
```bash
# Подключение к контейнеру
railway shell

# Выполнение команды в контейнере
railway run "npm --version"
```

## Структура проекта для деплоя

Убедитесь что у вас есть все файлы:

```
your-bot-folder/
├── bot.js                 # ✅ Обновлен с Express сервером
├── marketplace_api.js     # ✅ Новый файл API
├── marketplace/           # ✅ Новая папка
│   ├── index.html        # ✅ Mini App интерфейс
│   ├── app.js            # ✅ JavaScript логика
│   └── styles.css        # ✅ Стили
├── package.json          # ✅ Обновлен с Express
├── railway.toml          # ✅ Конфигурация Railway
└── ... (остальные файлы)
```

## Проверка перед деплоем

```bash
# Проверить что все файлы на месте
ls -la marketplace/
ls -la marketplace_api.js
ls -la railway.toml

# Проверить package.json
cat package.json | grep express
```

## Автоматическое определение URL

В коде уже настроено автоматическое определение Railway URL:

```javascript
// В bot.js
const webAppUrl = `https://${process.env.RAILWAY_STATIC_URL || 'your-app-name.up.railway.app'}/marketplace`;

// В marketplace/app.js  
const API_BASE = window.location.origin + '/api/marketplace';
```

## Мониторинг после деплоя

```bash
# Следить за логами
railway logs --follow

# Ищите эти сообщения:
# 🌐 Сервер маркетплейса запущен на порту 3000
# ✅ Таблица marketplace_items создана
# ✅ Таблица auctions создана
```

## Быстрый деплой (одна команда)

```bash
# Деплой и открытие в браузере
railway up && railway open
```

## Откат изменений (если что-то пошло не так)

```bash
# Посмотреть историю деплоев
railway deployments

# Откатиться к предыдущему деплою
railway rollback [deployment-id]
```

## Переменные окружения

Railway автоматически предоставляет:
- `PORT` - порт для сервера (обычно 3000)
- `RAILWAY_STATIC_URL` - URL вашего приложения
- `NODE_ENV` - окружение (production)

Посмотреть все переменные:
```bash
railway variables
```

## Возможные проблемы и решения

### 1. Ошибка "Project not found"
```bash
railway link
# Выберите правильный проект из списка
```

### 2. Ошибка деплоя
```bash
railway logs
# Посмотрите логи для диагностики
```

### 3. Файлы не загружаются
```bash
# Проверьте что все файлы в папке
ls -la marketplace/
```

### 4. База данных не работает
```bash
railway logs | grep "database"
# Проверьте логи инициализации БД
```

## Тестирование

После деплоя:

1. **Проверить основной URL**:
   ```bash
   curl https://your-railway-url.up.railway.app/
   ```

2. **Проверить маркетплейс**:
   ```bash
   curl https://your-railway-url.up.railway.app/marketplace
   ```

3. **Проверить API**:
   ```bash
   curl https://your-railway-url.up.railway.app/api/marketplace/items
   ```

4. **Тест в Telegram**:
   - Открыть бота
   - Нажать "🏪 Маркетплейс"
   - Нажать "🏪 Открыть маркетплейс"

## Переменные окружения

Railway автоматически предоставляет:
- `PORT` - порт для сервера
- `RAILWAY_STATIC_URL` - URL вашего приложения

## Структура проекта на Railway

```
your-railway-project/
├── bot.js                 # Основной файл (Telegram бот + Express сервер)
├── marketplace_api.js     # API маркетплейса
├── marketplace/           # Статические файлы Mini App
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── package.json           # Зависимости (включая Express)
├── railway.toml          # Конфигурация Railway
└── ... (остальные файлы игры)
```

## База данных

Маркетплейс использует ту же SQLite базу данных, что и основная игра. Новые таблицы создаются автоматически при первом запуске:

- `marketplace_items` - предметы на продаже
- `auctions` - активные аукционы  
- `auction_bids` - история ставок

## Логи и отладка

Для просмотра логов в Railway:

1. Откройте ваш проект
2. Перейдите в раздел "Deployments"
3. Нажмите на последний деплой
4. Откройте вкладку "Logs"

Ищите сообщения:
- `🌐 Сервер маркетплейса запущен на порту 3000`
- `✅ Таблица marketplace_items создана`
- `✅ Таблица auctions создана`

## Возможные проблемы

### 1. Ошибка "Cannot GET /marketplace"
**Решение**: Убедитесь что папка `marketplace/` загружена в репозиторий

### 2. API не работает
**Решение**: Проверьте что `marketplace_api.js` находится в корне проекта

### 3. База данных не создается
**Решение**: Проверьте права доступа к файлу `data/game.db`

### 4. Mini App не открывается
**Решение**: 
- Проверьте URL в @BotFather
- Убедитесь что используется HTTPS
- Проверьте что Railway предоставляет SSL сертификат

## Мониторинг

Railway предоставляет встроенный мониторинг:
- CPU и память
- Сетевой трафик
- Логи в реальном времени
- Метрики производительности

## Масштабирование

При росте нагрузки можно:
- Увеличить ресурсы в Railway
- Добавить кэширование Redis
- Оптимизировать SQL запросы
- Использовать CDN для статических файлов

## Безопасность

Railway автоматически предоставляет:
- HTTPS сертификаты
- Защиту от DDoS
- Изоляцию контейнеров
- Регулярные обновления безопасности