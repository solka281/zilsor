const db = require('./database_simple');

console.log('Проверяем таблицу daily_quests_pool...');

db.all(`SELECT COUNT(*) as count FROM daily_quests_pool`, (err, result) => {
  if (err) {
    console.error('Ошибка:', err);
  } else {
    console.log('Квестов в пуле:', result[0].count);
  }
  
  db.all(`SELECT * FROM daily_quests_pool LIMIT 5`, (err, quests) => {
    if (err) {
      console.error('Ошибка получения квестов:', err);
    } else {
      console.log('Первые 5 квестов:');
      quests.forEach(q => {
        console.log(`- ${q.name}: ${q.description}`);
      });
    }
    
    process.exit(0);
  });
});
