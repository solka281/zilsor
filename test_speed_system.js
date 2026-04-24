// Тест системы скорости в реальном бою
const duels = require('./duels');
const battleSystem = require('./battle_system');

console.log('🧪 ТЕСТ СИСТЕМЫ СКОРОСТИ В РЕАЛЬНОМ PvP');

// Симулируем двух игроков
const mockPlayer1 = {
  user_id: 1,
  username: 'FastPlayer',
  level: 50,
  race_name: 'Кентавр',
  base_power: 100,
  base_hp: 200,
  base_attack: 80,
  base_defense: 50,
  special_ability: null
};

const mockPlayer2 = {
  user_id: 2,
  username: 'SlowPlayer', 
  level: 45,
  race_name: 'Нежить',
  base_power: 120,
  base_hp: 180,
  base_attack: 90,
  base_defense: 60,
  special_ability: null
};

console.log('\n📊 Тестируем calculatePlayerPower:');

// Тестируем расчет силы первого игрока
console.log('🏃 Быстрый игрок (Кентавр 50 лвл):');
try {
  // Симулируем calculatePlayerPower
  const speedSystem = require('./speed_system');
  const mockStats1 = {
    race: 'Кентавр',
    level: 50
  };
  const speedData1 = speedSystem.calculatePlayerSpeed(mockStats1, []);
  console.log('  - Расчетная скорость:', speedData1.totalSpeed);
  
  const mockStats2 = {
    race: 'Нежить', 
    level: 45
  };
  const speedData2 = speedSystem.calculatePlayerSpeed(mockStats2, []);
  console.log('🐌 Медленный игрок (Нежить 45 лвл):');
  console.log('  - Расчетная скорость:', speedData2.totalSpeed);
  
  // Создаем мок-статы как их возвращает calculatePlayerPower
  const p1Stats = {
    power: 150,
    hp: 250,
    attack: 100,
    defense: 70,
    speed: speedData1.totalSpeed, // Добавляем скорость
    username: 'FastPlayer',
    level: 50,
    raceName: 'Кентавр',
    itemEffects: []
  };
  
  const p2Stats = {
    power: 165,
    hp: 225,
    attack: 110,
    defense: 80,
    speed: speedData2.totalSpeed, // Добавляем скорость
    username: 'SlowPlayer',
    level: 45,
    raceName: 'Нежить',
    itemEffects: []
  };
  
  console.log('\n⚔️ Создаем PvP бой:');
  const battle = battleSystem.createPvPBattle(1, p1Stats, 2, p2Stats);
  
  console.log('📋 Скорости в созданном бою:');
  console.log('  - Игрок 1:', battle.player1.stats.speed);
  console.log('  - Игрок 2:', battle.player2.stats.speed);
  
  // Симулируем действия игроков
  console.log('\n🎯 Симулируем раунд боя:');
  battle.player1.action = 'attack';
  battle.player2.action = 'attack';
  
  const result = battleSystem.executePvPRound(battle);
  console.log('✅ Раунд выполнен, проверьте логи выше для порядка ходов');
  
} catch (error) {
  console.error('❌ Ошибка:', error.message);
}

console.log('\n💡 Если в логах видно правильный порядок ходов - система работает!');
console.log('💡 Если нет - проблема в calculatePlayerPower или передаче данных.');