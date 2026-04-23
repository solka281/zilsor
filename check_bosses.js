const db = require('./database_simple');

console.log('Проверяем боссов в базе данных...');

db.all('SELECT name, level, id, base_hp FROM raid_bosses ORDER BY level', (err, bosses) => {
  if (err) {
    console.error('Ошибка:', err);
    process.exit(1);
  }
  
  console.log(`\nНайдено боссов: ${bosses.length}`);
  
  if (bosses.length === 0) {
    console.log('❌ Боссы не найдены!');
  } else {
    console.log('\n📋 Список боссов:');
    bosses.forEach((boss, index) => {
      console.log(`${index + 1}. ${boss.name}`);
      console.log(`   Уровень: ${boss.level}`);
      console.log(`   ID: ${boss.id}`);
      console.log(`   HP: ${boss.base_hp}`);
      console.log('');
    });
  }
  
  process.exit(0);
});