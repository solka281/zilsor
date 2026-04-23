@echo off
echo Деплой изменений на Railway...

git add bot.js mmr_system.js
git commit -m "Реализована система реального времени для дуэлей с логированием"
git push

echo Готово! Подождите 1-2 минуты пока Railway задеплоит изменения
pause
