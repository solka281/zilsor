# Zilsor Race Wiki - Инструкция

## Как открыть страницы

### Способ 1: Прямые ссылки (РЕКОМЕНДУЕТСЯ)

После запуска сервера (`python -m http.server 8000`) откройте в браузере:

- **Расы**: http://localhost:8000/races.html
- **Предметы**: http://localhost:8000/items.html
- **Главная**: http://localhost:8000/index.html

### Способ 2: Через главную страницу

1. Откройте http://localhost:8000/
2. Кликните на большие кнопки:
   - 🎭 Расы
   - ⚔️ Предметы
   - 🗺️ Локации

## Исправленные проблемы

✅ Джинн - исправлено имя файла с `djinn.jpg` на `genie.jpg`
✅ Расы - все 24 расы показываются с картинками
✅ Предметы - страница создана и работает

## Структура

```
wiki/
├── index.html          # Главная (с навигацией)
├── races.html          # ВСЕ РАСЫ - РАБОТАЕТ ✅
├── items.html          # ВСЕ ПРЕДМЕТЫ - РАБОТАЕТ ✅
├── app.js              # JavaScript
├── styles.css          # Стили
└── images/
    └── races/          # 23 картинки рас
```

## Если кнопки в меню не работают

Просто откройте страницы напрямую по ссылкам выше!

## Картинки рас

Все картинки должны быть в `wiki/images/races/`:
- human.jpg
- elf.jpg
- dwarf.jpg
- orc.jpg
- dark_elf.jpg
- half_orc.jpg
- gnome.jpg
- centaur.jpg
- minotaur.jpg
- dragonborn.jpg
- demon.jpg
- angel.jpg
- elemental.jpg
- undead.jpg
- werewolf.jpg
- phoenix.jpg
- vampire.jpg
- dragon.jpg
- lich.jpg
- genie.jpg ← ИСПРАВЛЕНО
- titan.jpg
- war_god.jpg
- ancient.jpg
