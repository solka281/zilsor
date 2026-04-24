/**
 * Скрипт для автоматического применения форматирования чисел в bot.js
 * 
 * ВНИМАНИЕ: Создаст резервную копию bot.js перед изменениями
 */

const fs = require('fs');
const path = require('path');

const BOT_FILE = 'bot.js';
const BACKUP_FILE = 'bot_before_formatting.js';

console.log('🔧 Начинаем применение форматирования чисел...\n');

// Проверяем существование файла
if (!fs.existsSync(BOT_FILE)) {
  console.error('❌ Файл bot.js не найден!');
  process.exit(1);
}

// Создаем резервную копию
console.log('📦 Создаем резервную копию...');
fs.copyFileSync(BOT_FILE, BACKUP_FILE);
console.log(`✅ Резервная копия создана: ${BACKUP_FILE}\n`);

// Читаем файл
let content = fs.readFileSync(BOT_FILE, 'utf8');

// Проверяем, не был ли уже добавлен импорт
if (content.includes('number_formatter')) {
  console.log('⚠️  Импорт number_formatter уже существует, пропускаем...\n');
} else {
  // Находим место для добавления импорта (после других require)
  const requireRegex = /(const .+ = require\(.+\);?\n)+/;
  const match = content.match(requireRegex);
  
  if (match) {
    const lastRequire = match[0];
    const importStatement = "const { smartFormat } = require('./number_formatter');\n";
    content = content.replace(lastRequire, lastRequire + importStatement);
    console.log('✅ Добавлен импорт number_formatter\n');
  } else {
    console.log('⚠️  Не удалось найти место для импорта, добавьте вручную:\n');
    console.log("const { smartFormat } = require('./number_formatter');\n");
  }
}

let replacements = 0;

// Замены для форматирования
const patterns = [
  // Замена .toLocaleString() на smartFormat
  {
    pattern: /\$\{([^}]+)\.toLocaleString\(\)\}/g,
    replacement: '${smartFormat($1)}',
    description: 'Замена .toLocaleString() на smartFormat()'
  },
  
  // Замена простых чисел в популярных местах
  {
    pattern: /\$\{(player\.gold)\}/g,
    replacement: '${smartFormat($1)}',
    description: 'Форматирование player.gold'
  },
  {
    pattern: /\$\{(player\.crystals)\}/g,
    replacement: '${smartFormat($1)}',
    description: 'Форматирование player.crystals'
  },
  {
    pattern: /\$\{(player\.exp)\}/g,
    replacement: '${smartFormat($1)}',
    description: 'Форматирование player.exp'
  },
  {
    pattern: /\$\{(stats\.hp)\}/g,
    replacement: '${smartFormat($1)}',
    description: 'Форматирование stats.hp'
  },
  {
    pattern: /\$\{(stats\.power)\}/g,
    replacement: '${smartFormat($1)}',
    description: 'Форматирование stats.power'
  },
  {
    pattern: /\$\{(stats\.attack)\}/g,
    replacement: '${smartFormat($1)}',
    description: 'Форматирование stats.attack'
  },
  {
    pattern: /\$\{(stats\.defense)\}/g,
    replacement: '${smartFormat($1)}',
    description: 'Форматирование stats.defense'
  },
  {
    pattern: /\$\{(currentGold)\}/g,
    replacement: '${smartFormat($1)}',
    description: 'Форматирование currentGold'
  },
  {
    pattern: /\$\{(currentExp)\}/g,
    replacement: '${smartFormat($1)}',
    description: 'Форматирование currentExp'
  },
  {
    pattern: /\$\{(actualGoldReward)\}/g,
    replacement: '${smartFormat($1)}',
    description: 'Форматирование actualGoldReward'
  },
  {
    pattern: /\$\{(actualExpReward)\}/g,
    replacement: '${smartFormat($1)}',
    description: 'Форматирование actualExpReward'
  },
  {
    pattern: /\$\{(goldReward)\}/g,
    replacement: '${smartFormat($1)}',
    description: 'Форматирование goldReward'
  },
  {
    pattern: /\$\{(expReward)\}/g,
    replacement: '${smartFormat($1)}',
    description: 'Форматирование expReward'
  }
];

console.log('🔄 Применяем замены...\n');

patterns.forEach(({ pattern, replacement, description }) => {
  const matches = content.match(pattern);
  if (matches) {
    content = content.replace(pattern, replacement);
    const count = matches.length;
    replacements += count;
    console.log(`✅ ${description}: ${count} замен`);
  }
});

// Сохраняем изменения
fs.writeFileSync(BOT_FILE, content, 'utf8');

console.log(`\n✨ Готово! Выполнено ${replacements} замен.`);
console.log(`\n📝 Рекомендации:`);
console.log(`1. Проверьте bot.js на корректность`);
console.log(`2. Запустите бота и протестируйте`);
console.log(`3. Если что-то пошло не так, восстановите из ${BACKUP_FILE}`);
console.log(`4. Проверьте NUMBER_FORMATTER_GUIDE.md для дополнительных мест замены`);
