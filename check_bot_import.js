/**
 * Проверка импорта в bot.js
 */

console.log('🔍 Проверка импорта number_formatter в bot.js...\n');

try {
  // Пытаемся загрузить number_formatter
  const { smartFormat } = require('./number_formatter');
  console.log('✅ number_formatter.js загружен успешно');
  
  // Тестируем функцию
  const testValue = 1234567;
  const formatted = smartFormat(testValue);
  console.log(`✅ smartFormat(${testValue}) = ${formatted}`);
  
  if (formatted === '1.23M') {
    console.log('✅ Форматирование работает корректно!\n');
  } else {
    console.log(`⚠️  Ожидалось "1.23M", получено "${formatted}"\n`);
  }
  
  // Проверяем, что bot.js может загрузиться
  console.log('🔍 Проверка загрузки bot.js...');
  console.log('⚠️  Это может занять время, так как bot.js инициализирует базу данных...\n');
  
  // Читаем bot.js и проверяем наличие импорта
  const fs = require('fs');
  const botContent = fs.readFileSync('./bot.js', 'utf8');
  
  if (botContent.includes("require('./number_formatter')")) {
    console.log('✅ Импорт number_formatter найден в bot.js');
  } else {
    console.log('❌ Импорт number_formatter НЕ найден в bot.js!');
  }
  
  if (botContent.includes('smartFormat')) {
    const matches = botContent.match(/smartFormat/g);
    console.log(`✅ smartFormat используется ${matches.length} раз в bot.js`);
  } else {
    console.log('❌ smartFormat НЕ используется в bot.js!');
  }
  
  console.log('\n📝 Инструкции:');
  console.log('1. Убедитесь, что бот был ПЕРЕЗАПУЩЕН после изменений');
  console.log('2. Остановите бота (Ctrl+C) и запустите заново: node bot.js');
  console.log('3. Проверьте, нет ли ошибок при запуске бота');
  console.log('4. Если бот запущен через PM2, выполните: pm2 restart bot');
  
} catch (error) {
  console.error('❌ Ошибка:', error.message);
  console.error('\n📝 Возможные причины:');
  console.error('1. Файл number_formatter.js не найден');
  console.error('2. Синтаксическая ошибка в number_formatter.js');
  console.error('3. Проблема с путями к файлам');
}
