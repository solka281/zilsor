/**
 * Форматирование больших чисел с сокращениями
 * Примеры: 1,390,000 -> 1.39M, 1,500,000,000 -> 1.5B
 */

/**
 * Форматирует число с сокращениями для больших значений
 * @param {number} num - Число для форматирования
 * @param {number} decimals - Количество знаков после запятой (по умолчанию 2)
 * @returns {string} Отформатированное число
 */
function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }

  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  // Определяем суффиксы для разных порядков (начиная с 100K)
  const suffixes = [
    { value: 1e15, suffix: 'Q' },  // Quadrillion (квадриллион)
    { value: 1e12, suffix: 'T' },  // Trillion (триллион)
    { value: 1e9, suffix: 'B' },   // Billion (миллиард)
    { value: 1e6, suffix: 'M' },   // Million (миллион)
    { value: 1e5, suffix: 'K' }    // Thousand (тысяча) - начиная с 100K
  ];

  // Находим подходящий суффикс
  for (const { value, suffix } of suffixes) {
    if (absNum >= value) {
      const formatted = (absNum / value).toFixed(decimals);
      // Убираем лишние нули после запятой
      const cleaned = parseFloat(formatted).toString();
      return sign + cleaned + suffix;
    }
  }

  // Если число меньше 100K, возвращаем с разделителями
  return formatWithCommas(num);
}

/**
 * Форматирует число с разделителями тысяч (для чисел < 1M)
 * @param {number} num - Число для форматирования
 * @returns {string} Отформатированное число
 */
function formatWithCommas(num) {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }
  return Math.floor(num).toLocaleString('ru-RU');
}

/**
 * Умное форматирование: использует сокращения для больших чисел,
 * разделители для средних, обычный формат для маленьких
 * @param {number} num - Число для форматирования
 * @param {number} threshold - Порог для использования сокращений (по умолчанию 100K)
 * @param {number} decimals - Количество знаков после запятой
 * @returns {string} Отформатированное число
 */
function smartFormat(num, threshold = 1e5, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }

  const absNum = Math.abs(num);

  if (absNum >= threshold) {
    return formatNumber(num, decimals);
  } else if (absNum >= 1000) {
    return formatWithCommas(num);
  } else {
    return Math.floor(num).toString();
  }
}

module.exports = {
  formatNumber,
  formatWithCommas,
  smartFormat
};
