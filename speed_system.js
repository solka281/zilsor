// Система скорости как в Покемонах
const db = require('./database_simple');

// Базовые значения скорости для рас
const RACE_SPEED_BASE = {
  'Человек': 100,
  'Эльф': 120,
  'Дварф': 80,
  'Орк': 90,
  'Темный Эльф': 115,
  'Полуорк': 95,
  'Гном': 85,
  'Драконорожденный': 105,
  'Демон': 110,
  'Ангел': 125,
  'Феникс': 130,
  'Вампир': 115,
  'Титан': 70,
  'Бог Войны': 95,
  'Древний': 85,
  'Кентавр': 140,
  'Минотавр': 75,
  'Элементаль': 100,
  'Нежить': 60,
  'Оборотень': 135,
  'Дракон': 90,
  'Лич': 65,
  'Джинн': 120
};

// Получить базовую скорость расы
function getRaceBaseSpeed(raceName) {
  return RACE_SPEED_BASE[raceName] || 100;
}

// Рассчитать итоговую скорость игрока
function calculatePlayerSpeed(player, itemEffects = []) {
  const baseSpeed = getRaceBaseSpeed(player.race);
  
  // Бонус от уровня (каждый уровень +1 скорость)
  const levelBonus = player.level || 1;
  
  // Бонусы от предметов
  let itemSpeedBonus = 0;
  if (itemEffects && itemEffects.length > 0) {
    itemEffects.forEach(effect => {
      if (effect && effect.includes('speed_boost_')) {
        const bonus = parseInt(effect.split('_')[2]) || 0;
        itemSpeedBonus += bonus;
      }
    });
  }
  
  // Итоговая скорость
  const totalSpeed = baseSpeed + levelBonus + itemSpeedBonus;
  
  return {
    baseSpeed,
    levelBonus,
    itemSpeedBonus,
    totalSpeed
  };
}

// Определить порядок ходов в бою (как в Покемонах)
function determineTurnOrder(player1Speed, player2Speed) {
  // Если скорости равны - случайный порядок
  if (player1Speed === player2Speed) {
    return Math.random() < 0.5 ? 'player1' : 'player2';
  }
  
  // Кто быстрее - тот ходит первым
  return player1Speed > player2Speed ? 'player1' : 'player2';
}

// Рассчитать шанс критического удара на основе скорости
function calculateCritChance(attackerSpeed, defenderSpeed) {
  const baseCritChance = 0.05; // 5% базовый шанс
  
  // Если атакующий быстрее - больше шанс крита
  const speedDifference = attackerSpeed - defenderSpeed;
  const speedBonus = Math.max(0, speedDifference) * 0.001; // 0.1% за каждую единицу скорости
  
  return Math.min(0.25, baseCritChance + speedBonus); // Максимум 25%
}

// Рассчитать шанс уклонения на основе скорости
function calculateDodgeChance(defenderSpeed, attackerSpeed) {
  const baseDodgeChance = 0.05; // 5% базовый шанс
  
  // Если защищающийся быстрее - больше шанс уклонения
  const speedDifference = defenderSpeed - attackerSpeed;
  const speedBonus = Math.max(0, speedDifference) * 0.002; // 0.2% за каждую единицу скорости
  
  return Math.min(0.30, baseDodgeChance + speedBonus); // Максимум 30%
}

// Проверить возможность двойной атаки (как Quick Attack в Покемонах)
function checkDoubleAttack(attackerSpeed, defenderSpeed) {
  const speedDifference = attackerSpeed - defenderSpeed;
  
  // Если атакующий в 2+ раза быстрее - шанс двойной атаки
  if (speedDifference >= defenderSpeed) {
    return Math.random() < 0.15; // 15% шанс
  }
  
  return false;
}

// Модифицировать урон на основе скорости (быстрые атаки могут быть слабее)
function modifyDamageBySpeed(damage, attackerSpeed, defenderSpeed, isDoubleAttack = false) {
  if (isDoubleAttack) {
    // Двойная атака наносит 75% урона за каждый удар
    return Math.floor(damage * 0.75);
  }
  
  // Обычная атака - без изменений
  return damage;
}

// Получить описание скорости для интерфейса
function getSpeedDescription(speed) {
  if (speed >= 150) return '⚡⚡⚡ Молниеносная';
  if (speed >= 120) return '⚡⚡ Очень быстрая';
  if (speed >= 100) return '⚡ Быстрая';
  if (speed >= 80) return '🚶 Средняя';
  if (speed >= 60) return '🐌 Медленная';
  return '🐌🐌 Очень медленная';
}

module.exports = {
  getRaceBaseSpeed,
  calculatePlayerSpeed,
  determineTurnOrder,
  calculateCritChance,
  calculateDodgeChance,
  checkDoubleAttack,
  modifyDamageBySpeed,
  getSpeedDescription,
  RACE_SPEED_BASE
};