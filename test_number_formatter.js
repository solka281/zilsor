/**
 * Тестовый файл для демонстрации форматирования чисел
 */

const { formatNumber, formatWithCommas, smartFormat } = require('./number_formatter');

console.log('=== Тест formatNumber (сокращения с 100K) ===');
console.log('500:', formatNumber(500));                    // 500
console.log('1,500:', formatNumber(1500));                 // 1 500
console.log('15,000:', formatNumber(15000));               // 15 000
console.log('99,999:', formatNumber(99999));               // 99 999
console.log('100,000:', formatNumber(100000));             // 100K
console.log('150,000:', formatNumber(150000));             // 150K
console.log('1,390,000:', formatNumber(1390000));          // 1.39M
console.log('5,500,000:', formatNumber(5500000));          // 5.5M
console.log('1,500,000,000:', formatNumber(1500000000));   // 1.5B
console.log('2,750,000,000,000:', formatNumber(2750000000000)); // 2.75T
console.log('1,234,567,890,123,456:', formatNumber(1234567890123456)); // 1.23Q

console.log('\n=== Тест formatWithCommas (с разделителями) ===');
console.log('500:', formatWithCommas(500));                // 500
console.log('1,500:', formatWithCommas(1500));             // 1 500
console.log('1,390,000:', formatWithCommas(1390000));      // 1 390 000
console.log('1,500,000,000:', formatWithCommas(1500000000)); // 1 500 000 000

console.log('\n=== Тест smartFormat (умное форматирование) ===');
console.log('500:', smartFormat(500));                     // 500
console.log('1,500:', smartFormat(1500));                  // 1 500
console.log('15,000:', smartFormat(15000));                // 15 000
console.log('99,999:', smartFormat(99999));                // 99 999
console.log('100,000:', smartFormat(100000));              // 100K
console.log('150,000:', smartFormat(150000));              // 150K
console.log('1,390,000:', smartFormat(1390000));           // 1.39M
console.log('5,500,000:', smartFormat(5500000));           // 5.5M
console.log('1,500,000,000:', smartFormat(1500000000));    // 1.5B

console.log('\n=== Примеры использования в игре ===');
console.log('💰 Золото:', smartFormat(1234567));          // 💰 Золото: 1.23M
console.log('💎 Кристаллы:', smartFormat(5432));          // 💎 Кристаллы: 5 432
console.log('❤️ HP:', smartFormat(75000));                // ❤️ HP: 75 000
console.log('❤️ HP:', smartFormat(175000));               // ❤️ HP: 175K
console.log('❤️ HP босса:', smartFormat(5000000));        // ❤️ HP босса: 5M
console.log('⚔️ Урон:', smartFormat(123456789));          // ⚔️ Урон: 123.46M
console.log('✨ Опыт:', smartFormat(99999));              // ✨ Опыт: 99 999

console.log('\n=== Отрицательные числа ===');
console.log('-1,500:', smartFormat(-1500));               // -1 500
console.log('-1,390,000:', smartFormat(-1390000));        // -1.39M

console.log('\n=== Настройка точности ===');
console.log('1,234,567 (0 знаков):', formatNumber(1234567, 0));  // 1M
console.log('1,234,567 (1 знак):', formatNumber(1234567, 1));    // 1.2M
console.log('1,234,567 (2 знака):', formatNumber(1234567, 2));   // 1.23M
console.log('1,234,567 (3 знака):', formatNumber(1234567, 3));   // 1.235M
