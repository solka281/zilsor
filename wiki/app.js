// Zilsor Race Wiki - JavaScript функциональность

// Данные игры
const gameData = {
    races: [],
    items: [],
    locations: [],
    systems: {}
};

// Состояние приложения
let currentSection = 'home';
let currentFilter = null;

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadGameData();
    setupEventListeners();
});

function initializeApp() {
    console.log('🎮 Zilsor Race Wiki загружена');
    
    // Устанавливаем активную ссылку
    updateActiveNavigation();
    
    // Загружаем главную страницу
    showSection('home');
}

function setupEventListeners() {
    // Навигация
    document.querySelectorAll('.nav-list a[data-section]').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // Быстрые ссылки - ТОЛЬКО с data-section
    document.querySelectorAll('.quick-link[data-section]').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // Поиск
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch(this.value);
            }
        });
    }
    
    // Мобильное меню
    setupMobileMenu();
}

function handleNavigation(e) {
    e.preventDefault();
    
    const section = e.target.dataset.section;
    const type = e.target.dataset.type;
    const rarity = e.target.dataset.rarity;
    const view = e.target.dataset.view;
    const id = e.target.dataset.id;
    
    if (section) {
        showSection(section, { type, rarity, view, id });
        updateActiveNavigation(e.target);
    }
}

function updateActiveNavigation(activeLink = null) {
    // Убираем активный класс со всех ссылок
    document.querySelectorAll('.nav-list a').forEach(link => {
        link.classList.remove('active');
    });
    
    // Добавляем активный класс к выбранной ссылке
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

function showSection(section, options = {}) {
    console.log('showSection called:', section, options);
    currentSection = section;
    const contentArea = document.getElementById('content-area');
    const pageTitle = document.getElementById('page-title');
    
    // Обновляем заголовок и контент
    switch (section) {
        case 'home':
            pageTitle.textContent = 'Добро пожаловать в Zilsor Race Wiki';
            showHomePage();
            break;
        case 'races':
            if (options.id) {
                showRaceDetail(options.id);
            } else {
                pageTitle.textContent = 'Расы';
                showRacesSection(options.rarity, options.view);
            }
            break;
        case 'items':
            if (options.id) {
                showItemDetail(options.id);
            } else {
                pageTitle.textContent = 'Предметы';
                showItemsSection(options.type, options.view);
            }
            break;
        case 'locations':
            pageTitle.textContent = 'Локации';
            showLocationsSection(options.view);
            break;
        case 'systems':
            pageTitle.textContent = 'Игровые системы';
            showSystemsSection(options.type);
            break;
        default:
            pageTitle.textContent = 'Добро пожаловать в Zilsor Race Wiki';
            showHomePage();
            break;
    }
    
    // Добавляем анимацию
    contentArea.classList.add('fade-in');
    setTimeout(() => contentArea.classList.remove('fade-in'), 400);
}

function showHomePage() {
    const contentArea = document.getElementById('content-area');
    
    // Всегда создаем главную страницу заново
    contentArea.innerHTML = `
        <div class="welcome-section" style="display: flex;">
            <div class="welcome-card">
                <h1>🎮 Добро пожаловать в Zilsor Race Wiki</h1>
                <p class="welcome-subtitle">Полная энциклопедия игрового мира</p>
                
                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="stat-number" id="total-races">23</div>
                        <div class="stat-label">Рас</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-number" id="total-items">50+</div>
                        <div class="stat-label">Предметов</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-number" id="total-locations">12</div>
                        <div class="stat-label">Локаций</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-number" id="total-systems">8</div>
                        <div class="stat-label">Систем</div>
                    </div>
                </div>
                
                <div class="quick-links">
                    <a href="#" class="quick-link" data-section="races" data-view="all">
                        <i class="fas fa-users"></i>
                        <span>Все расы</span>
                    </a>
                    <a href="#" class="quick-link" data-section="items" data-view="all">
                        <i class="fas fa-sword"></i>
                        <span>Все предметы</span>
                    </a>
                    <a href="#" class="quick-link" data-section="locations" data-view="all">
                        <i class="fas fa-map"></i>
                        <span>Локации</span>
                    </a>
                    <a href="#" class="quick-link" data-section="races" data-view="comparison">
                        <i class="fas fa-chart-bar"></i>
                        <span>Сравнение рас</span>
                    </a>
                </div>
            </div>
        </div>
    `;
    
    // Переустанавливаем обработчики для быстрых ссылок
    document.querySelectorAll('.quick-link').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
}

function showRacesSection(rarity = null, view = null) {
    const contentArea = document.getElementById('content-area');
    
    if (view === 'all') {
        showAllRaces();
        return;
    }
    
    if (view === 'comparison') {
        showRaceComparison();
        return;
    }
    
    let racesHTML = `
        <div class="content-card">
            <h2><i class="fas fa-users"></i> Расы в Zilsor Race</h2>
            <p>В игре доступно 23 уникальные расы, каждая со своими особенностями и способностями.</p>
            <div class="quick-actions">
                <button class="action-btn" onclick="showSection('races', {view: 'all'})">
                    <i class="fas fa-list"></i> Все расы
                </button>
                <button class="action-btn" onclick="showSection('races', {view: 'comparison'})">
                    <i class="fas fa-chart-bar"></i> Сравнение
                </button>
            </div>
        </div>
    `;
    
    // Фильтр по редкости
    if (rarity) {
        racesHTML += `<div class="content-card">
            <h3>Расы редкости: <span class="rarity-${rarity.toLowerCase()}">${getRarityName(rarity)}</span></h3>
            ${getRacesByRarity(rarity)}
        </div>`;
    } else {
        // Показываем все расы по категориям
        const rarities = ['COMMON', 'RARE', 'EPIC', 'MYTHIC', 'LEGENDARY'];
        rarities.forEach(r => {
            racesHTML += `<div class="content-card">
                <h3>Расы редкости: <span class="rarity-${r.toLowerCase()}">${getRarityName(r)}</span></h3>
                ${getRacesByRarity(r)}
            </div>`;
        });
    }
    
    contentArea.innerHTML = racesHTML;
}

function showAllRaces() {
    const contentArea = document.getElementById('content-area');
    const pageTitle = document.getElementById('page-title');
    
    pageTitle.textContent = 'Все расы';
    
    contentArea.innerHTML = `
        <div class="content-card">
            <h2>🎭 Все расы Zilsor Race</h2>
            <p>24 уникальные расы с различными способностями и характеристиками</p>
        </div>
        
        <h3 style="color: #9ca3af; margin-top: 30px;">⚪ ОБЫЧНЫЕ РАСЫ</h3>
        <div class="races-grid">
            ${createRaceCard({id: 'human', name: 'Человек', rarity: 'COMMON', baseStats: {power: 100, hp: 100, attack: 20, defense: 15, speed: 50}, specialAbility: 'Адаптация', abilityDescription: '+5% к получению опыта'})}
            ${createRaceCard({id: 'elf', name: 'Эльф', rarity: 'COMMON', baseStats: {power: 90, hp: 80, attack: 25, defense: 10, speed: 70}, specialAbility: 'Меткость', abilityDescription: '+10% к атаке'})}
            ${createRaceCard({id: 'dwarf', name: 'Дварф', rarity: 'COMMON', baseStats: {power: 110, hp: 120, attack: 18, defense: 25, speed: 30}, specialAbility: 'Стойкость', abilityDescription: '+15% к защите'})}
            ${createRaceCard({id: 'orc', name: 'Орк', rarity: 'COMMON', baseStats: {power: 120, hp: 110, attack: 30, defense: 12, speed: 40}, specialAbility: 'Ярость', abilityDescription: '+15% к атаке при низком HP'})}
        </div>
        
        <h3 style="color: #3b82f6; margin-top: 30px;">🔵 РЕДКИЕ РАСЫ</h3>
        <div class="races-grid">
            ${createRaceCard({id: 'dark_elf', name: 'Темный Эльф', rarity: 'RARE', baseStats: {power: 140, hp: 100, attack: 35, defense: 20, speed: 75}, specialAbility: 'Теневой удар', abilityDescription: '20% шанс критического урона'})}
            ${createRaceCard({id: 'half_orc', name: 'Полуорк', rarity: 'RARE', baseStats: {power: 150, hp: 130, attack: 32, defense: 22, speed: 45}, specialAbility: 'Гибридная сила', abilityDescription: '+10% ко всем характеристикам'})}
            ${createRaceCard({id: 'gnome', name: 'Гном', rarity: 'RARE', baseStats: {power: 130, hp: 90, attack: 28, defense: 18, speed: 55}, specialAbility: 'Инженерия', abilityDescription: '+20% к эффективности предметов'})}
            ${createRaceCard({id: 'centaur', name: 'Кентавр', rarity: 'RARE', baseStats: {power: 145, hp: 110, attack: 38, defense: 16, speed: 85}, specialAbility: 'Скоростная атака', abilityDescription: '25% шанс двойного удара'})}
            ${createRaceCard({id: 'minotaur', name: 'Минотавр', rarity: 'RARE', baseStats: {power: 160, hp: 140, attack: 40, defense: 28, speed: 35}, specialAbility: 'Бычий натиск', abilityDescription: '+30% урона при полном HP'})}
        </div>
        
        <h3 style="color: #a855f7; margin-top: 30px;">🟣 ЭПИЧЕСКИЕ РАСЫ</h3>
        <div class="races-grid">
            ${createRaceCard({id: 'dragonborn', name: 'Драконорожденный', rarity: 'EPIC', baseStats: {power: 200, hp: 180, attack: 50, defense: 40, speed: 60}, specialAbility: 'Драконье дыхание', abilityDescription: 'Мощная атака по области'})}
            ${createRaceCard({id: 'demon', name: 'Демон', rarity: 'EPIC', baseStats: {power: 220, hp: 160, attack: 60, defense: 35, speed: 65}, specialAbility: 'Адское пламя', abilityDescription: 'Урон со временем'})}
            ${createRaceCard({id: 'angel', name: 'Ангел', rarity: 'EPIC', baseStats: {power: 210, hp: 170, attack: 55, defense: 45, speed: 70}, specialAbility: 'Божественная защита', abilityDescription: 'Восстановление HP'})}
            ${createRaceCard({id: 'elemental', name: 'Элементаль', rarity: 'EPIC', baseStats: {power: 230, hp: 150, attack: 65, defense: 30, speed: 75}, specialAbility: 'Стихийная мощь', abilityDescription: 'Случайный элементальный урон'})}
            ${createRaceCard({id: 'undead', name: 'Нежить', rarity: 'EPIC', baseStats: {power: 190, hp: 200, attack: 45, defense: 50, speed: 40}, specialAbility: 'Нежизнь', abilityDescription: 'Иммунитет к ядам и болезням'})}
            ${createRaceCard({id: 'werewolf', name: 'Оборотень', rarity: 'EPIC', baseStats: {power: 240, hp: 160, attack: 70, defense: 25, speed: 90}, specialAbility: 'Лунная ярость', abilityDescription: '+50% урона ночью'})}
        </div>
        
        <h3 style="color: #ec4899; margin-top: 30px;">🔮 МИСТИЧЕСКИЕ РАСЫ</h3>
        <div class="races-grid">
            ${createRaceCard({id: 'phoenix', name: 'Феникс', rarity: 'MYTHIC', baseStats: {power: 300, hp: 200, attack: 80, defense: 60, speed: 95}, specialAbility: 'Возрождение', abilityDescription: 'Воскрешение после смерти'})}
            ${createRaceCard({id: 'vampire', name: 'Вампир', rarity: 'MYTHIC', baseStats: {power: 280, hp: 180, attack: 85, defense: 55, speed: 85}, specialAbility: 'Кровопийство', abilityDescription: 'Восстановление HP от урона'})}
            ${createRaceCard({id: 'dragon', name: 'Дракон', rarity: 'MYTHIC', baseStats: {power: 350, hp: 250, attack: 90, defense: 70, speed: 80}, specialAbility: 'Драконья магия', abilityDescription: 'Мощные заклинания'})}
            ${createRaceCard({id: 'lich', name: 'Лич', rarity: 'MYTHIC', baseStats: {power: 320, hp: 180, attack: 95, defense: 65, speed: 60}, specialAbility: 'Некромантия', abilityDescription: 'Призыв мертвых союзников'})}
            ${createRaceCard({id: 'genie', name: 'Джинн', rarity: 'MYTHIC', baseStats: {power: 310, hp: 190, attack: 88, defense: 62, speed: 100}, specialAbility: 'Исполнение желаний', abilityDescription: 'Случайный мощный эффект'})}
        </div>
        
        <h3 style="color: #f59e0b; margin-top: 30px;">⭐ ЛЕГЕНДАРНЫЕ РАСЫ</h3>
        <div class="races-grid">
            ${createRaceCard({id: 'titan', name: 'Титан', rarity: 'LEGENDARY', baseStats: {power: 500, hp: 400, attack: 120, defense: 100, speed: 50}, specialAbility: 'Титаническая мощь', abilityDescription: 'Удваивает силу атаки'})}
            ${createRaceCard({id: 'war_god', name: 'Бог Войны', rarity: 'LEGENDARY', baseStats: {power: 550, hp: 380, attack: 150, defense: 90, speed: 70}, specialAbility: 'Божественная ярость', abilityDescription: 'Неуязвимость на 2 хода'})}
        </div>
        
        <h3 style="color: #6366f1; margin-top: 30px;">🌟 СЕКРЕТНЫЕ РАСЫ</h3>
        <div class="races-grid">
            ${createRaceCard({id: 'ancient', name: 'Древний', rarity: 'SECRET', baseStats: {power: 800, hp: 600, attack: 200, defense: 150, speed: 100}, specialAbility: 'Первородная сила', abilityDescription: 'Контроль над реальностью'})}
        </div>
    `;
}

function createRaceCard(race) {
    return `
        <div class="race-card rarity-${race.rarity.toLowerCase()}" onclick="showRaceDetail('${race.id}')">
            <div class="race-header">
                <div class="race-icon">
                    <img src="images/races/${race.id}.jpg" alt="${race.name}">
                </div>
                <div class="race-info">
                    <h3>${race.name}</h3>
                    <span class="rarity-badge ${race.rarity.toLowerCase()}">${race.rarity}</span>
                </div>
            </div>
            
            <div class="race-stats">
                <div class="stat-row">
                    <span class="stat-label">💪 Сила:</span>
                    <span class="stat-value">${race.baseStats.power}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">❤️ Здоровье:</span>
                    <span class="stat-value">${race.baseStats.hp}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">⚔️ Атака:</span>
                    <span class="stat-value">${race.baseStats.attack}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">🛡️ Защита:</span>
                    <span class="stat-value">${race.baseStats.defense}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">🏃 Скорость:</span>
                    <span class="stat-value">${race.baseStats.speed}</span>
                </div>
            </div>
            
            <div class="race-ability">
                <strong>✨ ${race.specialAbility}</strong>
                <p>${race.abilityDescription}</p>
            </div>
        </div>
    `;
}

function showRaceDetail(raceId) {
    const contentArea = document.getElementById('content-area');
    const pageTitle = document.getElementById('page-title');
    
    // Загружаем данные расы
    const race = RACE_DATA[Object.keys(RACE_DATA).find(key => RACE_DATA[key].id === raceId)];
    
    if (!race) {
        contentArea.innerHTML = '<div class="content-card"><h2>Раса не найдена</h2></div>';
        return;
    }
    
    pageTitle.textContent = race.name;
    
    const html = `
        <div class="race-detail">
            <div class="race-detail-header">
                <div class="race-portrait">
                    <img src="images/races/${race.id}.jpg" alt="${race.name}">
                </div>
                
                <div class="race-overview">
                    <h1>${race.name}</h1>
                    <span class="rarity-badge ${race.rarity.toLowerCase()}">${race.rarity}</span>
                    
                    <div class="race-quick-stats">
                        <div class="quick-stat">
                            <span class="stat-icon">💪</span>
                            <span class="stat-name">Сила</span>
                            <span class="stat-bar">
                                <div class="stat-fill" style="width: ${(race.baseStats.power / 200) * 100}%"></div>
                            </span>
                            <span class="stat-number">${race.baseStats.power}</span>
                        </div>
                        
                        <div class="quick-stat">
                            <span class="stat-icon">❤️</span>
                            <span class="stat-name">Здоровье</span>
                            <span class="stat-bar">
                                <div class="stat-fill" style="width: ${(race.baseStats.hp / 200) * 100}%"></div>
                            </span>
                            <span class="stat-number">${race.baseStats.hp}</span>
                        </div>
                        
                        <div class="quick-stat">
                            <span class="stat-icon">⚔️</span>
                            <span class="stat-name">Атака</span>
                            <span class="stat-bar">
                                <div class="stat-fill" style="width: ${(race.baseStats.attack / 50) * 100}%"></div>
                            </span>
                            <span class="stat-number">${race.baseStats.attack}</span>
                        </div>
                        
                        <div class="quick-stat">
                            <span class="stat-icon">🛡️</span>
                            <span class="stat-name">Защита</span>
                            <span class="stat-bar">
                                <div class="stat-fill" style="width: ${(race.baseStats.defense / 50) * 100}%"></div>
                            </span>
                            <span class="stat-number">${race.baseStats.defense}</span>
                        </div>
                        
                        <div class="quick-stat">
                            <span class="stat-icon">🏃</span>
                            <span class="stat-name">Скорость</span>
                            <span class="stat-bar">
                                <div class="stat-fill" style="width: ${(race.baseStats.speed / 150) * 100}%"></div>
                            </span>
                            <span class="stat-number">${race.baseStats.speed}</span>
                        </div>
                    </div>
                    
                    <div class="race-ability-detail">
                        <h3>✨ Особая способность</h3>
                        <h4>${race.specialAbility}</h4>
                        <p>${race.abilityDescription}</p>
                    </div>
                </div>
            </div>
            
            <div class="race-detail-content">
                <div class="race-lore">
                    <h2><i class="fas fa-book"></i> Лор и история</h2>
                    
                    <div class="lore-section">
                        <h3>🌟 Происхождение</h3>
                        <p>${race.lore.origin}</p>
                    </div>
                    
                    <div class="lore-section">
                        <h3>🏛️ Культура</h3>
                        <p>${race.lore.culture}</p>
                    </div>
                    
                    <div class="lore-section">
                        <h3>💭 Философия</h3>
                        <p>${race.lore.philosophy}</p>
                    </div>
                    
                    <div class="lore-section">
                        <h3>📜 Легенды</h3>
                        <p>${race.lore.legends}</p>
                    </div>
                </div>
                
                <div class="race-gameplay">
                    <h2><i class="fas fa-gamepad"></i> Игровые особенности</h2>
                    
                    <div class="gameplay-section">
                        <h3>💪 Сильные стороны</h3>
                        <ul>
                            ${race.gameplay.strengths.map(strength => `<li>${strength}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="gameplay-section">
                        <h3>⚠️ Слабые стороны</h3>
                        <ul>
                            ${race.gameplay.weaknesses.map(weakness => `<li>${weakness}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="gameplay-section">
                        <h3>🎮 Стиль игры</h3>
                        <p>${race.gameplay.playstyle}</p>
                    </div>
                    
                    <div class="gameplay-section">
                        <h3>💡 Советы</h3>
                        <ul>
                            ${race.gameplay.tips.map(tip => `<li>${tip}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                
                <div class="race-relations">
                    <h2><i class="fas fa-handshake"></i> Отношения с другими расами</h2>
                    
                    <div class="relations-grid">
                        <div class="relation-group allies">
                            <h3><i class="fas fa-heart"></i> Союзники</h3>
                            <div class="relation-list">
                                ${race.relations.allies.map(ally => `<span class="relation-tag">${ally}</span>`).join('')}
                            </div>
                        </div>
                        
                        <div class="relation-group neutral">
                            <h3><i class="fas fa-minus"></i> Нейтральные</h3>
                            <div class="relation-list">
                                ${race.relations.neutral.map(neutral => `<span class="relation-tag">${neutral}</span>`).join('')}
                            </div>
                        </div>
                        
                        <div class="relation-group enemies">
                            <h3><i class="fas fa-times"></i> Враги</h3>
                            <div class="relation-list">
                                ${race.relations.enemies.map(enemy => `<span class="relation-tag">${enemy}</span>`).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="race-appearance">
                    <h2><i class="fas fa-eye"></i> Внешний вид</h2>
                    <p>${race.appearance.description}</p>
                    
                    <h3>🎨 Варианты</h3>
                    <div class="appearance-variants">
                        ${race.appearance.variants.map(variant => `<span class="variant-tag">${variant}</span>`).join('')}
                    </div>
                </div>
            </div>
            
            <div class="race-actions">
                <button class="action-btn primary" onclick="showSection('races', {view: 'all'})">
                    <i class="fas fa-arrow-left"></i> Назад к списку рас
                </button>
                <button class="action-btn" onclick="showSection('races', {view: 'comparison'})">
                    <i class="fas fa-chart-bar"></i> Сравнить расы
                </button>
            </div>
        </div>
    `;
    
    contentArea.innerHTML = html;
}

function showItemsSection(type = null, view = null) {
    const contentArea = document.getElementById('content-area');
    
    if (view === 'all') {
        showAllItems();
        return;
    }
    
    let itemsHTML = `
        <div class="content-card">
            <h2><i class="fas fa-sword"></i> Предметы и экипировка</h2>
            <p>Разнообразная экипировка для усиления вашего персонажа.</p>
            <div class="quick-actions">
                <button class="action-btn" onclick="showSection('items', {view: 'all'})">
                    <i class="fas fa-list"></i> Все предметы
                </button>
                <button class="action-btn" onclick="showSection('items', {view: 'sets'})">
                    <i class="fas fa-layer-group"></i> Комплекты
                </button>
            </div>
        </div>
    `;
    
    if (type) {
        itemsHTML += `<div class="content-card">
            <h3>${getItemTypeName(type)}</h3>
            ${getItemsByType(type)}
        </div>`;
    } else {
        const types = ['weapon', 'armor', 'artifact', 'rune', 'potion'];
        types.forEach(t => {
            itemsHTML += `<div class="content-card">
                <h3>${getItemTypeName(t)}</h3>
                ${getItemsByType(t)}
            </div>`;
        });
    }
    
    contentArea.innerHTML = itemsHTML;
}

function showAllItems() {
    const contentArea = document.getElementById('content-area');
    const pageTitle = document.getElementById('page-title');
    
    pageTitle.textContent = 'Все предметы';
    
    contentArea.innerHTML = `
        <div class="content-card">
            <h2>⚔️ Все предметы Zilsor Race</h2>
            <p>Оружие, броня и артефакты для усиления вашего персонажа</p>
        </div>
        
        <h3 style="color: #c4b5fd; margin-top: 30px;">🗡️ Оружие</h3>
        <div class="items-grid">
            ${createItemCard({id: 'wooden_sword', name: '⚔️ Деревянный меч', rarity: 'COMMON', type: 'weapon', stats: {power: 10, attack: 8, hp: 0, defense: 0}, acquisition: {cost: '5 золотых'}})}
            ${createItemCard({id: 'steel_sword', name: '⚔️ Стальной меч', rarity: 'RARE', type: 'weapon', stats: {power: 25, attack: 20, hp: 0, defense: 0}, acquisition: {cost: '50 золотых'}})}
            ${createItemCard({id: 'flame_blade', name: '🔥 Пламенный клинок', rarity: 'EPIC', type: 'weapon', stats: {power: 60, attack: 50, hp: 0, defense: 0}, specialEffect: 'fire', acquisition: {cost: '500 золотых'}})}
            ${createItemCard({id: 'storm_sword', name: '⚡ Меч Бури', rarity: 'LEGENDARY', type: 'weapon', stats: {power: 100, attack: 85, hp: 0, defense: 0}, specialEffect: 'lightning', acquisition: {cost: '2000 золотых'}})}
            ${createItemCard({id: 'excalibur', name: '🌟 Экскалибур', rarity: 'MYTHIC', type: 'weapon', stats: {power: 150, attack: 120, hp: 0, defense: 0}, specialEffect: 'divine', acquisition: {cost: '5000 золотых'}})}
        </div>
        
        <h3 style="color: #c4b5fd; margin-top: 30px;">🛡️ Броня</h3>
        <div class="items-grid">
            ${createItemCard({id: 'leather_armor', name: '🛡️ Кожаная броня', rarity: 'COMMON', type: 'armor', stats: {power: 5, attack: 0, hp: 20, defense: 10}, acquisition: {cost: '10 золотых'}})}
            ${createItemCard({id: 'chainmail', name: '🛡️ Кольчуга', rarity: 'RARE', type: 'armor', stats: {power: 15, attack: 0, hp: 50, defense: 25}, acquisition: {cost: '80 золотых'}})}
            ${createItemCard({id: 'plate_armor', name: '🛡️ Латные доспехи', rarity: 'EPIC', type: 'armor', stats: {power: 40, attack: 0, hp: 100, defense: 60}, specialEffect: 'defense', acquisition: {cost: '700 золотых'}})}
            ${createItemCard({id: 'dragon_scale', name: '🛡️ Драконья чешуя', rarity: 'LEGENDARY', type: 'armor', stats: {power: 80, attack: 0, hp: 200, defense: 100}, specialEffect: 'fire_resist', acquisition: {cost: '3000 золотых'}})}
        </div>
        
        <h3 style="color: #c4b5fd; margin-top: 30px;">💍 Артефакты</h3>
        <div class="items-grid">
            ${createItemCard({id: 'power_ring', name: '💍 Кольцо силы', rarity: 'RARE', type: 'artifact', stats: {power: 30, attack: 15, hp: 0, defense: 0}, acquisition: {cost: '100 золотых'}})}
            ${createItemCard({id: 'defense_ring', name: '💍 Кольцо защиты', rarity: 'EPIC', type: 'artifact', stats: {power: 45, attack: 0, hp: 80, defense: 40}, specialEffect: 'shield', acquisition: {cost: '800 золотых'}})}
            ${createItemCard({id: 'crown', name: '👑 Корона власти', rarity: 'LEGENDARY', type: 'artifact', stats: {power: 120, attack: 50, hp: 0, defense: 50}, specialEffect: 'leadership', acquisition: {cost: '4000 золотых'}})}
            ${createItemCard({id: 'eternity_sphere', name: '🔮 Сфера вечности', rarity: 'MYTHIC', type: 'artifact', stats: {power: 200, attack: 80, hp: 300, defense: 80}, specialEffect: 'immortality', acquisition: {cost: '10000 золотых'}})}
        </div>
    `;
}

function createItemCard(item) {
    return `
        <div class="item-card rarity-${item.rarity.toLowerCase()}" onclick="showItemDetail('${item.id}')">
            <div class="item-header">
                <div class="item-icon">
                    <div class="item-icon-fallback">${getItemIcon(item.type)}</div>
                </div>
                <div class="item-info">
                    <h3>${item.name}</h3>
                    <span class="rarity-badge ${item.rarity.toLowerCase()}">${item.rarity}</span>
                    <div class="item-type">${getItemTypeName(item.type)}</div>
                </div>
            </div>
            
            <div class="item-stats">
                ${item.stats.power > 0 ? `<div class="stat-row">
                    <span class="stat-label">💪 Сила:</span>
                    <span class="stat-value">+${item.stats.power}</span>
                </div>` : ''}
                ${item.stats.hp > 0 ? `<div class="stat-row">
                    <span class="stat-label">❤️ Здоровье:</span>
                    <span class="stat-value">+${item.stats.hp}</span>
                </div>` : ''}
                ${item.stats.attack > 0 ? `<div class="stat-row">
                    <span class="stat-label">⚔️ Атака:</span>
                    <span class="stat-value">+${item.stats.attack}</span>
                </div>` : ''}
                ${item.stats.defense > 0 ? `<div class="stat-row">
                    <span class="stat-label">🛡️ Защита:</span>
                    <span class="stat-value">+${item.stats.defense}</span>
                </div>` : ''}
            </div>
            
            ${item.specialEffect ? `<div class="item-effect">
                <strong>✨ Особый эффект</strong>
                <p>${getEffectDescription(item.specialEffect)}</p>
            </div>` : ''}
            
            <div class="race-cost">
                <span class="cost-label">Стоимость:</span>
                <span class="cost-value">${item.acquisition ? item.acquisition.cost : 'Неизвестно'}</span>
            </div>
        </div>
    `;
}

function showItemDetail(itemId) {
    const contentArea = document.getElementById('content-area');
    const pageTitle = document.getElementById('page-title');
    
    // Загружаем данные предмета
    const item = ITEM_DATA[Object.keys(ITEM_DATA).find(key => ITEM_DATA[key].id === itemId)];
    
    if (!item) {
        contentArea.innerHTML = '<div class="content-card"><h2>Предмет не найден</h2></div>';
        return;
    }
    
    pageTitle.textContent = item.name;
    
    const html = `
        <div class="item-detail">
            <div class="item-detail-header">
                <div class="item-portrait">
                    <img src="images/items/${item.id}_large.jpg" alt="${item.name}" onerror="this.style.display='none'">
                    <div class="item-portrait-fallback">
                        <i class="fas fa-${getItemIconClass(item.type)}"></i>
                        <span>${item.name}</span>
                    </div>
                </div>
                
                <div class="item-overview">
                    <h1>${item.name}</h1>
                    <span class="rarity-badge ${item.rarity.toLowerCase()}">${item.rarity}</span>
                    <div class="item-type">${getItemTypeName(item.type)} • ${item.slot}</div>
                    
                    <div class="item-quick-stats">
                        ${item.stats.power > 0 ? `<div class="quick-stat">
                            <span class="stat-icon">💪</span>
                            <span class="stat-name">Сила</span>
                            <span class="stat-bar">
                                <div class="stat-fill" style="width: ${(item.stats.power / 300) * 100}%"></div>
                            </span>
                            <span class="stat-number">+${item.stats.power}</span>
                        </div>` : ''}
                        
                        ${item.stats.hp > 0 ? `<div class="quick-stat">
                            <span class="stat-icon">❤️</span>
                            <span class="stat-name">Здоровье</span>
                            <span class="stat-bar">
                                <div class="stat-fill" style="width: ${(item.stats.hp / 200) * 100}%"></div>
                            </span>
                            <span class="stat-number">+${item.stats.hp}</span>
                        </div>` : ''}
                        
                        ${item.stats.attack > 0 ? `<div class="quick-stat">
                            <span class="stat-icon">⚔️</span>
                            <span class="stat-name">Атака</span>
                            <span class="stat-bar">
                                <div class="stat-fill" style="width: ${(item.stats.attack / 150) * 100}%"></div>
                            </span>
                            <span class="stat-number">+${item.stats.attack}</span>
                        </div>` : ''}
                        
                        ${item.stats.defense > 0 ? `<div class="quick-stat">
                            <span class="stat-icon">🛡️</span>
                            <span class="stat-name">Защита</span>
                            <span class="stat-bar">
                                <div class="stat-fill" style="width: ${(item.stats.defense / 100) * 100}%"></div>
                            </span>
                            <span class="stat-number">+${item.stats.defense}</span>
                        </div>` : ''}
                    </div>
                    
                    ${item.specialEffect ? `<div class="item-effect-detail">
                        <h3>✨ Особый эффект</h3>
                        <h4>${getEffectName(item.specialEffect)}</h4>
                        <p>${getEffectDescription(item.specialEffect)}</p>
                    </div>` : ''}
                </div>
            </div>
            
            <div class="item-detail-content">
                <div class="item-lore">
                    <h2><i class="fas fa-book"></i> Лор и история</h2>
                    
                    <div class="lore-section">
                        <h3>🌟 Происхождение</h3>
                        <p>${item.lore.origin}</p>
                    </div>
                    
                    <div class="lore-section">
                        <h3>📜 История</h3>
                        <p>${item.lore.history}</p>
                    </div>
                    
                    <div class="lore-section">
                        <h3>🔨 Создание</h3>
                        <p>${item.lore.crafting}</p>
                    </div>
                    
                    <div class="lore-section">
                        <h3>⭐ Легенды</h3>
                        <p>${item.lore.legends}</p>
                    </div>
                </div>
                
                <div class="item-gameplay">
                    <h2><i class="fas fa-gamepad"></i> Игровые особенности</h2>
                    
                    <div class="gameplay-section">
                        <h3>📝 Описание</h3>
                        <p>${item.gameplay.description}</p>
                    </div>
                    
                    <div class="gameplay-section">
                        <h3>💪 Сильные стороны</h3>
                        <ul>
                            ${item.gameplay.strengths.map(strength => `<li>${strength}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="gameplay-section">
                        <h3>⚠️ Слабые стороны</h3>
                        <ul>
                            ${item.gameplay.weaknesses.map(weakness => `<li>${weakness}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="gameplay-section">
                        <h3>💡 Советы</h3>
                        <ul>
                            ${item.gameplay.tips.map(tip => `<li>${tip}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                
                <div class="item-acquisition">
                    <h2><i class="fas fa-search"></i> Получение</h2>
                    
                    <div class="gameplay-section">
                        <h3>📍 Источники</h3>
                        <ul>
                            ${item.acquisition.sources.map(source => `<li>${source}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="gameplay-section">
                        <h3>💰 Стоимость</h3>
                        <p>${item.acquisition.cost}</p>
                    </div>
                    
                    <div class="gameplay-section">
                        <h3>🎲 Шанс выпадения</h3>
                        <p>${item.acquisition.rarity_chance}</p>
                    </div>
                    
                    <div class="gameplay-section">
                        <h3>👁️ Внешний вид</h3>
                        <p>${item.appearance.description}</p>
                        <p><small>${item.appearance.details}</small></p>
                    </div>
                </div>
            </div>
            
            <div class="race-actions">
                <button class="action-btn primary" onclick="showSection('items', {view: 'all'})">
                    <i class="fas fa-arrow-left"></i> Назад к списку предметов
                </button>
                <button class="action-btn" onclick="showSection('items', {type: '${item.type}'})">
                    <i class="fas fa-layer-group"></i> Похожие предметы
                </button>
            </div>
        </div>
    `;
    
    contentArea.innerHTML = html;
}

function getItemIcon(type) {
    const icons = {
        'weapon': '⚔️',
        'armor': '🛡️',
        'artifact': '💎',
        'rune': '🔮',
        'potion': '🧪'
    };
    return icons[type] || '📦';
}

function getItemIconClass(type) {
    const classes = {
        'weapon': 'sword',
        'armor': 'shield-alt',
        'artifact': 'gem',
        'rune': 'magic',
        'potion': 'flask'
    };
    return classes[type] || 'box';
}

function getEffectName(effect) {
    const names = {
        'fire_damage_25': 'Огненный урон',
        'fire_damage_20': 'Ледяной урон',
        'ice_damage_20': 'Ледяной урон',
        'lightning_damage_30': 'Электрический урон',
        'shadow_strike': 'Теневой удар',
        'holy_damage_50': 'Святой урон',
        'fire_immunity': 'Иммунитет к огню',
        'mana_regeneration': 'Регенерация маны',
        'stealth_strike': 'Скрытая атака',
        'fire_element': 'Элемент огня',
        'ice_element': 'Элемент льда',
        'lightning_element': 'Элемент молнии',
        'dark_element': 'Элемент тьмы',
        'all_elements': 'Все элементы',
        'berserk_mode': 'Режим берсерка',
        'exp_boost_30': 'Бонус опыта',
        'power_boost_20': 'Усиление силы',
        'damage_reduction_15': 'Снижение урона',
        'speed_boost_50': 'Усиление скорости',
        'health_regeneration': 'Регенерация здоровья',
        'heal_50': 'Лечение',
        'restore_mana_30': 'Восстановление маны',
        'temporary_immortality': 'Временное бессмертие'
    };
    return names[effect] || 'Неизвестный эффект';
}

function getEffectDescription(effect) {
    const descriptions = {
        'fire_damage_25': 'Добавляет 25% огненного урона к атакам',
        'fire_damage_20': 'Добавляет 20% огненного урона к атакам',
        'ice_damage_20': 'Добавляет 20% ледяного урона и может заморозить врага',
        'lightning_damage_30': 'Добавляет 30% электрического урона и может оглушить',
        'shadow_strike': '20% шанс нанести критический удар из тени (+50% урона)',
        'holy_damage_50': 'Добавляет 50% святого урона против зла',
        'fire_immunity': 'Полная защита от огненного урона',
        'mana_regeneration': 'Восстанавливает ману каждый ход',
        'stealth_strike': 'Позволяет атаковать из невидимости',
        'fire_element': '15% шанс поджечь врага на 2 хода',
        'ice_element': '15% шанс заморозить врага на 1 ход',
        'lightning_element': '15% шанс оглушить врага + дополнительный урон',
        'dark_element': '15% шанс поглотить жизненную силу врага',
        'all_elements': '15% шанс случайного элементального эффекта',
        'berserk_mode': '+50% урона, -20% защиты в бою',
        'exp_boost_30': '+30% опыта от всех источников',
        'power_boost_20': '+20% к базовой силе персонажа',
        'damage_reduction_15': 'Снижает получаемый урон на 15%',
        'speed_boost_50': '+50% к скорости передвижения и атак',
        'health_regeneration': 'Восстанавливает здоровье каждый ход',
        'heal_50': 'Мгновенно восстанавливает 50 HP',
        'restore_mana_30': 'Мгновенно восстанавливает 30 маны',
        'temporary_immortality': 'Неуязвимость к любому урону на 3 хода'
    };
    return descriptions[effect] || 'Описание эффекта недоступно';
}

function showSystemsSection(type = null) {
    const contentArea = document.getElementById('content-area');
    
    const systemsData = {
        combat: {
            title: '🗡️ Боевая система',
            content: `
                <h3>Основы боя</h3>
                <p>Боевая система основана на пошаговых сражениях с элементами стратегии.</p>
                
                <h4>Характеристики персонажа:</h4>
                <ul>
                    <li><strong>Атака</strong> - базовый урон</li>
                    <li><strong>Защита</strong> - снижение получаемого урона</li>
                    <li><strong>HP</strong> - здоровье персонажа</li>
                    <li><strong>Скорость</strong> - определяет порядок ходов</li>
                </ul>
                
                <h4>Действия в бою:</h4>
                <ul>
                    <li><strong>⚔️ Атака</strong> - нанести урон противнику</li>
                    <li><strong>🛡️ Защита</strong> - снизить урон на 50%</li>
                    <li><strong>✨ Спец. атака</strong> - мощная атака (требует 3 энергии)</li>
                    <li><strong>🧪 Зелье</strong> - использовать экипированное зелье</li>
                </ul>
            `
        },
        speed: {
            title: '🏃 Система скорости',
            content: `
                <h3>Скорость как в Pokemon</h3>
                <p>Система скорости определяет порядок ходов и влияет на боевые характеристики.</p>
                
                <h4>Расчет скорости:</h4>
                <ul>
                    <li><strong>Базовая скорость расы</strong> - от 60 (Нежить) до 140 (Кентавр)</li>
                    <li><strong>Бонус от уровня</strong> - +1 за каждый уровень</li>
                    <li><strong>Бонусы от предметов</strong> - дополнительная скорость</li>
                </ul>
                
                <h4>Влияние скорости:</h4>
                <ul>
                    <li><strong>Порядок ходов</strong> - быстрый игрок ходит первым</li>
                    <li><strong>Шанс крита</strong> - выше скорость = больше шанс</li>
                    <li><strong>Уклонение</strong> - быстрые персонажи лучше уклоняются</li>
                    <li><strong>Двойная атака</strong> - очень быстрые могут атаковать дважды</li>
                </ul>
                
                <h4>Топ-3 самых быстрых рас:</h4>
                <ol>
                    <li>🐎 <strong>Кентавр</strong> - 140 базовой скорости</li>
                    <li>🐺 <strong>Оборотень</strong> - 135 базовой скорости</li>
                    <li>🔥 <strong>Феникс</strong> - 130 базовой скорости</li>
                </ol>
            `
        },
        elements: {
            title: '🌟 Элементальная система',
            content: `
                <h3>Элементы и их эффекты</h3>
                <p>Элементальные артефакты добавляют специальные эффекты в бой.</p>
                
                <h4>🔥 Огонь (Амулет огня)</h4>
                <ul>
                    <li><strong>Шанс:</strong> 15%</li>
                    <li><strong>Эффект:</strong> Поджигает противника на 2 хода</li>
                    <li><strong>Урон:</strong> 10% от базового урона за ход</li>
                </ul>
                
                <h4>❄️ Лед (Амулет льда)</h4>
                <ul>
                    <li><strong>Шанс:</strong> 15%</li>
                    <li><strong>Эффект:</strong> Замораживает на 1 ход</li>
                    <li><strong>Результат:</strong> Противник пропускает ход</li>
                </ul>
                
                <h4>⚡ Молния (Амулет молний)</h4>
                <ul>
                    <li><strong>Шанс:</strong> 15%</li>
                    <li><strong>Эффект:</strong> Оглушение + дополнительный урон</li>
                    <li><strong>Урон:</strong> +15% от базового урона</li>
                </ul>
                
                <h4>🌑 Тьма (Амулет тьмы)</h4>
                <ul>
                    <li><strong>Шанс:</strong> 15%</li>
                    <li><strong>Эффект:</strong> Поглощение жизни</li>
                    <li><strong>Урон:</strong> +25% урона + лечение атакующего</li>
                </ul>
                
                <h4>🌈 Все элементы (Око Вечности)</h4>
                <ul>
                    <li><strong>Шанс:</strong> 15%</li>
                    <li><strong>Эффект:</strong> Случайный элементальный эффект</li>
                </ul>
            `
        }
    };
    
    let systemsHTML = `
        <div class="content-card">
            <h2><i class="fas fa-gamepad"></i> Игровые системы</h2>
            <p>Подробное описание всех игровых механик Zilsor Race.</p>
        </div>
    `;
    
    // Показываем все системы
    Object.keys(systemsData).forEach(key => {
        const system = systemsData[key];
        systemsHTML += `<div class="content-card">
            <h2>${system.title}</h2>
            ${system.content}
        </div>`;
    });
    
    contentArea.innerHTML = systemsHTML;
}

// Вспомогательные функции
function getRarityName(rarity) {
    const names = {
        'COMMON': 'Обычные',
        'RARE': 'Редкие', 
        'EPIC': 'Эпические',
        'MYTHIC': 'Мифические',
        'LEGENDARY': 'Легендарные'
    };
    return names[rarity] || rarity;
}

function getItemTypeName(type) {
    const names = {
        'weapon': '⚔️ Оружие',
        'armor': '🛡️ Броня',
        'artifact': '💎 Артефакты',
        'rune': '🔮 Руны',
        'potion': '🧪 Зелья'
    };
    return names[type] || type;
}

function getRacesByRarity(rarity) {
    // Проверяем есть ли загруженные данные
    if (gameData.races && gameData.races[rarity]) {
        const races = gameData.races[rarity];
        
        if (races.length === 0) {
            return '<p>Расы этой редкости не найдены.</p>';
        }
        
        let html = '<div class="data-table-container"><table class="data-table">';
        html += '<thead><tr><th>Раса</th><th>Описание</th><th>Характеристики</th><th>Способность</th><th>Стоимость</th></tr></thead><tbody>';
        
        races.forEach(race => {
            const stats = `💪 ${race.basePower} | ❤️ ${race.baseHP} | ⚔️ ${race.baseAttack} | 🛡️ ${race.baseDefense}`;
            html += `<tr>
                <td><strong class="rarity-${race.rarity.toLowerCase()}">${race.name}</strong></td>
                <td>${race.description}</td>
                <td><small>${stats}</small></td>
                <td>${race.specialAbility || 'Нет'}</td>
                <td>${race.cost}💎</td>
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        return html;
    }
    
    // Fallback на статичные данные если API недоступно
    const racesByRarity = {
        'COMMON': [
            { name: 'Человек', description: 'Универсальная раса', speed: 100, ability: 'Адаптация' },
            { name: 'Эльф', description: 'Быстрая и ловкая раса', speed: 120, ability: 'Меткость' },
            { name: 'Дварф', description: 'Крепкая и выносливая раса', speed: 80, ability: 'Стойкость' },
            { name: 'Орк', description: 'Сильная воинственная раса', speed: 90, ability: 'Ярость' }
        ],
        'RARE': [
            { name: 'Темный Эльф', description: 'Мистическая раса теней', speed: 115, ability: 'Теневая магия' },
            { name: 'Полуорк', description: 'Гибрид человека и орка', speed: 95, ability: 'Гибридная сила' },
            { name: 'Гном', description: 'Мастера инженерии', speed: 85, ability: 'Инженерия' }
        ],
        'EPIC': [
            { name: 'Драконорожденный', description: 'Потомки драконов', speed: 105, ability: 'Драконье дыхание' },
            { name: 'Демон', description: 'Существа из преисподней', speed: 110, ability: 'Демоническая сила' },
            { name: 'Ангел', description: 'Небесные воины', speed: 125, ability: 'Божественная защита' },
            { name: 'Кентавр', description: 'Быстрые кентавры', speed: 140, ability: 'Скоростной рывок' },
            { name: 'Минотавр', description: 'Мощные воины-быки', speed: 75, ability: 'Таран' },
            { name: 'Элементаль', description: 'Существа стихий', speed: 100, ability: 'Стихийная магия' }
        ],
        'MYTHIC': [
            { name: 'Феникс', description: 'Птица возрождения', speed: 130, ability: 'Возрождение' },
            { name: 'Вампир', description: 'Кровопийцы ночи', speed: 115, ability: 'Кровопийство' },
            { name: 'Нежить', description: 'Восставшие мертвецы', speed: 60, ability: 'Иммунитет к смерти' },
            { name: 'Оборотень', description: 'Оборотни-волки', speed: 135, ability: 'Звериная ярость' },
            { name: 'Дракон', description: 'Могучие драконы', speed: 90, ability: 'Драконья мощь' }
        ],
        'LEGENDARY': [
            { name: 'Титан', description: 'Древние гиганты', speed: 70, ability: 'Титаническая сила' },
            { name: 'Бог Войны', description: 'Божества сражений', speed: 95, ability: 'Божественная ярость' },
            { name: 'Древний', description: 'Первородные существа', speed: 85, ability: 'Древняя мудрость' },
            { name: 'Лич', description: 'Могущественные некроманты', speed: 65, ability: 'Некромантия' },
            { name: 'Джинн', description: 'Духи желаний', speed: 120, ability: 'Исполнение желаний' }
        ]
    };
    
    const races = racesByRarity[rarity] || [];
    
    if (races.length === 0) {
        return '<p>Расы этой редкости не найдены.</p>';
    }
    
    let html = '<div class="data-table-container"><table class="data-table">';
    html += '<thead><tr><th>Раса</th><th>Описание</th><th>Скорость</th><th>Способность</th></tr></thead><tbody>';
    
    races.forEach(race => {
        html += `<tr>
            <td><strong>${race.name}</strong></td>
            <td>${race.description}</td>
            <td>${race.speed}</td>
            <td>${race.ability}</td>
        </tr>`;
    });
    
    html += '</tbody></table></div>';
    return html;
}

function getItemsByType(type) {
    if (typeof ITEM_DATA === 'undefined') {
        return '<p>Загрузка данных о предметах...</p>';
    }
    
    // Фильтруем предметы по типу
    const items = Object.values(ITEM_DATA).filter(item => item.type === type);
    
    if (items.length === 0) {
        return `<p>Предметы типа "${getItemTypeName(type)}" не найдены.</p>`;
    }
    
    let html = '<div class="item-grid">';
    items.forEach(item => {
        html += createItemCard(item);
    });
    html += '</div>';
    
    return html;
}

function getSlotName(slot) {
    const names = {
        'weapon': 'Оружие',
        'helmet': 'Шлем',
        'chestplate': 'Нагрудник',
        'leggings': 'Поножи',
        'boots': 'Ботинки',
        'artifact_1': 'Артефакт 1',
        'artifact_2': 'Артефакт 2',
        'rune': 'Руна',
        'potion': 'Зелье'
    };
    return names[slot] || slot;
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    
    // Показываем результаты поиска только если запрос больше 2 символов
    if (query.length > 2) {
        performSearch(query);
    }
}

async function performSearch(query) {
    console.log('Выполняем поиск:', query);
    
    try {
        const response = await fetch(`/api/wiki/search/${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.success) {
            showSearchResults(data.data, query);
        }
    } catch (error) {
        console.error('Ошибка поиска:', error);
    }
}

function showSearchResults(results, query) {
    const contentArea = document.getElementById('content-area');
    const pageTitle = document.getElementById('page-title');
    
    pageTitle.textContent = `Результаты поиска: "${query}"`;
    
    let html = `<div class="content-card">
        <h2><i class="fas fa-search"></i> Результаты поиска</h2>
        <p>Найдено результатов: ${results.races.length + results.items.length + results.potions.length}</p>
    </div>`;
    
    // Расы
    if (results.races.length > 0) {
        html += `<div class="content-card">
            <h3>🧬 Расы (${results.races.length})</h3>
            <div class="search-results">`;
        
        results.races.forEach(race => {
            html += `<div class="search-result-item">
                <h4 class="rarity-${race.rarity.toLowerCase()}">${race.name}</h4>
                <p>${race.description}</p>
                <span class="rarity-badge ${race.rarity.toLowerCase()}">${race.rarity}</span>
            </div>`;
        });
        
        html += `</div></div>`;
    }
    
    // Предметы
    if (results.items.length > 0) {
        html += `<div class="content-card">
            <h3>⚔️ Предметы (${results.items.length})</h3>
            <div class="search-results">`;
        
        results.items.forEach(item => {
            html += `<div class="search-result-item">
                <h4 class="rarity-${item.rarity.toLowerCase()}">${item.name}</h4>
                <p>${item.description}</p>
                <div>
                    <span class="rarity-badge ${item.rarity.toLowerCase()}">${item.rarity}</span>
                    <span class="item-slot">${getSlotName(item.slot)}</span>
                </div>
            </div>`;
        });
        
        html += `</div></div>`;
    }
    
    // Зелья
    if (results.potions.length > 0) {
        html += `<div class="content-card">
            <h3>🧪 Зелья (${results.potions.length})</h3>
            <div class="search-results">`;
        
        results.potions.forEach(potion => {
            html += `<div class="search-result-item">
                <h4>${potion.name}</h4>
                <p>${potion.description}</p>
            </div>`;
        });
        
        html += `</div></div>`;
    }
    
    if (results.races.length === 0 && results.items.length === 0 && results.potions.length === 0) {
        html += `<div class="content-card">
            <p>По запросу "${query}" ничего не найдено. Попробуйте изменить поисковый запрос.</p>
        </div>`;
    }
    
    contentArea.innerHTML = html;
}

function showRaceComparison() {
    const contentArea = document.getElementById('content-area');
    const pageTitle = document.getElementById('page-title');
    
    pageTitle.textContent = 'Сравнение рас';
    
    let html = `
        <div class="content-card">
            <h2><i class="fas fa-chart-bar"></i> Сравнение характеристик рас</h2>
            <p>Интерактивная таблица для сравнения всех рас по характеристикам.</p>
        </div>
        
        <div class="comparison-controls">
            <div class="filter-group">
                <label>Фильтр по редкости:</label>
                <select id="rarity-filter" onchange="filterRaceComparison()">
                    <option value="">Все редкости</option>
                    <option value="COMMON">Обычные</option>
                    <option value="RARE">Редкие</option>
                    <option value="EPIC">Эпические</option>
                    <option value="MYTHIC">Мифические</option>
                    <option value="LEGENDARY">Легендарные</option>
                </select>
            </div>
            
            <div class="sort-group">
                <label>Сортировка:</label>
                <select id="sort-by" onchange="sortRaceComparison()">
                    <option value="name">По имени</option>
                    <option value="power">По силе</option>
                    <option value="hp">По здоровью</option>
                    <option value="attack">По атаке</option>
                    <option value="defense">По защите</option>
                    <option value="speed">По скорости</option>
                    <option value="cost">По стоимости</option>
                </select>
            </div>
        </div>
        
        <div class="comparison-table-container">
            <table class="comparison-table" id="race-comparison-table">
                <thead>
                    <tr>
                        <th>Раса</th>
                        <th>Редкость</th>
                        <th>💪 Сила</th>
                        <th>❤️ HP</th>
                        <th>⚔️ Атака</th>
                        <th>🛡️ Защита</th>
                        <th>🏃 Скорость</th>
                        <th>💎 Стоимость</th>
                        <th>Способность</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody id="comparison-tbody">
                </tbody>
            </table>
        </div>
        
        <div class="race-actions">
            <button class="action-btn" onclick="showSection('races', {view: 'all'})">
                <i class="fas fa-list"></i> Все расы
            </button>
            <button class="action-btn" onclick="exportRaceData()">
                <i class="fas fa-download"></i> Экспорт данных
            </button>
        </div>
    `;
    
    contentArea.innerHTML = html;
    populateRaceComparison();
}

function populateRaceComparison() {
    const tbody = document.getElementById('comparison-tbody');
    if (!tbody || typeof RACE_DATA === 'undefined') return;
    
    let html = '';
    Object.values(RACE_DATA).forEach(race => {
        html += `
            <tr class="race-row rarity-${race.rarity.toLowerCase()}" data-rarity="${race.rarity}">
                <td class="race-name-cell">
                    <div class="race-name-container">
                        <div class="race-mini-icon">${race.name.charAt(0)}</div>
                        <span class="race-name">${race.name}</span>
                    </div>
                </td>
                <td><span class="rarity-badge ${race.rarity.toLowerCase()}">${race.rarity}</span></td>
                <td class="stat-cell">
                    <div class="stat-with-bar">
                        <span class="stat-number">${race.baseStats.power}</span>
                        <div class="mini-stat-bar">
                            <div class="mini-stat-fill" style="width: ${(race.baseStats.power / 300) * 100}%"></div>
                        </div>
                    </div>
                </td>
                <td class="stat-cell">
                    <div class="stat-with-bar">
                        <span class="stat-number">${race.baseStats.hp}</span>
                        <div class="mini-stat-bar">
                            <div class="mini-stat-fill" style="width: ${(race.baseStats.hp / 200) * 100}%"></div>
                        </div>
                    </div>
                </td>
                <td class="stat-cell">
                    <div class="stat-with-bar">
                        <span class="stat-number">${race.baseStats.attack}</span>
                        <div class="mini-stat-bar">
                            <div class="mini-stat-fill" style="width: ${(race.baseStats.attack / 150) * 100}%"></div>
                        </div>
                    </div>
                </td>
                <td class="stat-cell">
                    <div class="stat-with-bar">
                        <span class="stat-number">${race.baseStats.defense}</span>
                        <div class="mini-stat-bar">
                            <div class="mini-stat-fill" style="width: ${(race.baseStats.defense / 100) * 100}%"></div>
                        </div>
                    </div>
                </td>
                <td class="stat-cell">
                    <div class="stat-with-bar">
                        <span class="stat-number">${race.baseStats.speed}</span>
                        <div class="mini-stat-bar">
                            <div class="mini-stat-fill" style="width: ${(race.baseStats.speed / 150) * 100}%"></div>
                        </div>
                    </div>
                </td>
                <td class="cost-cell">${race.cost}💎</td>
                <td class="ability-cell" title="${race.abilityDescription}">${race.specialAbility}</td>
                <td class="actions-cell">
                    <button class="mini-btn" onclick="showRaceDetail('${race.id}')" title="Подробнее">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

function filterRaceComparison() {
    const filter = document.getElementById('rarity-filter').value;
    const rows = document.querySelectorAll('.race-row');
    
    rows.forEach(row => {
        if (!filter || row.dataset.rarity === filter) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function sortRaceComparison() {
    const sortBy = document.getElementById('sort-by').value;
    const tbody = document.getElementById('comparison-tbody');
    const rows = Array.from(tbody.querySelectorAll('.race-row'));
    
    rows.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
            case 'name':
                aValue = a.querySelector('.race-name').textContent;
                bValue = b.querySelector('.race-name').textContent;
                return aValue.localeCompare(bValue);
            case 'cost':
                aValue = parseInt(a.querySelector('.cost-cell').textContent);
                bValue = parseInt(b.querySelector('.cost-cell').textContent);
                return bValue - aValue;
            default:
                // Для числовых характеристик
                const statCells = a.querySelectorAll('.stat-number');
                const statIndex = ['power', 'hp', 'attack', 'defense', 'speed'].indexOf(sortBy);
                if (statIndex >= 0) {
                    aValue = parseInt(statCells[statIndex].textContent);
                    bValue = parseInt(b.querySelectorAll('.stat-number')[statIndex].textContent);
                    return bValue - aValue;
                }
        }
        return 0;
    });
    
    rows.forEach(row => tbody.appendChild(row));
}

function exportRaceData() {
    if (typeof RACE_DATA === 'undefined') return;
    
    const data = Object.values(RACE_DATA).map(race => ({
        name: race.name,
        rarity: race.rarity,
        cost: race.cost,
        power: race.baseStats.power,
        hp: race.baseStats.hp,
        attack: race.baseStats.attack,
        defense: race.baseStats.defense,
        speed: race.baseStats.speed,
        ability: race.specialAbility
    }));
    
    const csv = [
        'Раса,Редкость,Стоимость,Сила,HP,Атака,Защита,Скорость,Способность',
        ...data.map(race => 
            `${race.name},${race.rarity},${race.cost},${race.power},${race.hp},${race.attack},${race.defense},${race.speed},"${race.ability}"`
        )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'zilsor_races.csv';
    link.click();
}

function setupMobileMenu() {
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', function() {
            sidebar.classList.toggle('open');
            
            // Закрываем меню при клике вне его
            document.addEventListener('click', function(e) {
                if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            });
        });
        
        // Закрываем меню при клике на ссылку
        document.querySelectorAll('.nav-list a').forEach(link => {
            link.addEventListener('click', function() {
                sidebar.classList.remove('open');
            });
        });
    }
}

// Загрузка данных из API
async function loadGameData() {
    try {
        console.log('✅ Данные игры загружены');
        
        updateStats({
            races: 24,
            items: 50,
            locations: 12,
            systems: 8
        });
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

function updateStats(stats) {
    const elements = {
        'total-races': stats.races || 23,
        'total-items': stats.items || 50,
        'total-locations': 12, // Статичное значение
        'total-systems': 8 // Статичное значение
    };
    
    Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = elements[id];
        }
    });
}


// Показать раздел локаций
function showLocationsSection(view = 'all') {
    const contentArea = document.getElementById('content-area');
    const pageTitle = document.getElementById('page-title');
    
    if (view === 'bosses') {
        showBosses();
        return;
    }
    
    if (view === 'raids') {
        showRaids();
        return;
    }
    
    // Показываем все локации
    pageTitle.textContent = 'Локации Темного Леса';
    
    let html = `
        <div class="content-card">
            <h2><i class="fas fa-map"></i> Локации приключений</h2>
            <p>12 уникальных локаций с мобами, боссами и сокровищами.</p>
            <div class="quick-actions">
                <button class="action-btn" onclick="showSection('locations', {view: 'all'})">
                    <i class="fas fa-map-marked-alt"></i> Все локации
                </button>
                <button class="action-btn" onclick="showSection('locations', {view: 'bosses'})">
                    <i class="fas fa-dragon"></i> Боссы
                </button>
                <button class="action-btn" onclick="showSection('locations', {view: 'raids'})">
                    <i class="fas fa-skull-crossbones"></i> Рейды
                </button>
            </div>
        </div>
    `;
    
    if (typeof LOCATIONS_DATA !== 'undefined') {
        Object.values(LOCATIONS_DATA).forEach(location => {
            html += `
                <div class="content-card location-card">
                    <h2>📍 ${location.name}</h2>
                    <div class="location-info">
                        <span class="location-levels">Уровни: ${location.levels[0]}-${location.levels[1]}</span>
                    </div>
                    
                    <p>${location.description}</p>
                    
                    <h3>👾 Мобы локации</h3>
                    <div class="data-table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Моб</th>
                                    <th>❤️ HP</th>
                                    <th>⚔️ Атака</th>
                                    <th>🛡️ Защита</th>
                                    <th>💰 Золото</th>
                                    <th>⭐ Опыт</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${location.mobs.map(mob => `
                                    <tr>
                                        <td><strong>${mob.emoji} ${mob.name}</strong></td>
                                        <td>${mob.hp}</td>
                                        <td>${mob.attack}</td>
                                        <td>${mob.defense}</td>
                                        <td>${mob.goldReward[0]}-${mob.goldReward[1]}</td>
                                        <td>${mob.expReward[0]}-${mob.expReward[1]}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    ${location.boss ? `
                        <h3>👑 Босс локации (Уровень ${location.boss.level})</h3>
                        <div class="data-table-container">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Босс</th>
                                        <th>❤️ HP</th>
                                        <th>⚔️ Атака</th>
                                        <th>🛡️ Защита</th>
                                        <th>💰 Золото</th>
                                        <th>⭐ Опыт</th>
                                        <th>💎 Кристаллы</th>
                                        <th>🎁 Шанс дропа</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>${location.boss.emoji} ${location.boss.name}</strong></td>
                                        <td>${location.boss.hp}</td>
                                        <td>${location.boss.attack}</td>
                                        <td>${location.boss.defense}</td>
                                        <td>${location.boss.goldReward}</td>
                                        <td>${location.boss.expReward}</td>
                                        <td>${location.boss.crystalReward[0]}-${location.boss.crystalReward[1]}</td>
                                        <td>${(location.boss.itemDropChance * 100).toFixed(0)}%</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    ` : ''}
                </div>
            `;
        });
    }
    
    contentArea.innerHTML = html;
}

function showBosses() {
    const contentArea = document.getElementById('content-area');
    const pageTitle = document.getElementById('page-title');
    
    pageTitle.textContent = 'Боссы Темного Леса';
    
    let html = `
        <div class="content-card">
            <h2><i class="fas fa-dragon"></i> Боссы локаций</h2>
            <p>Могущественные боссы появляются каждые 10 уровней.</p>
        </div>
    `;
    
    if (typeof LOCATIONS_DATA !== 'undefined') {
        Object.values(LOCATIONS_DATA).forEach(location => {
            if (location.boss) {
                html += `
                    <div class="content-card boss-detail-card">
                        <div class="boss-detail-header">
                            <span class="boss-emoji-large">${location.boss.emoji}</span>
                            <div>
                                <h2>${location.boss.name}</h2>
                                <p class="boss-location">📍 ${location.name} (Уровень ${location.boss.level})</p>
                            </div>
                        </div>
                        
                        <div class="boss-stats-grid">
                            <div class="stat-card">
                                <div class="stat-label">❤️ Здоровье</div>
                                <div class="stat-value">${location.boss.hp}</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">⚔️ Атака</div>
                                <div class="stat-value">${location.boss.attack}</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">🛡️ Защита</div>
                                <div class="stat-value">${location.boss.defense}</div>
                            </div>
                        </div>
                        
                        <div class="boss-rewards-detail">
                            <h3>🎁 Награды</h3>
                            <div class="rewards-grid">
                                <div class="reward-item">
                                    <span class="reward-icon">💰</span>
                                    <span class="reward-text">${location.boss.goldReward} золота</span>
                                </div>
                                <div class="reward-item">
                                    <span class="reward-icon">⭐</span>
                                    <span class="reward-text">${location.boss.expReward} опыта</span>
                                </div>
                                <div class="reward-item">
                                    <span class="reward-icon">💎</span>
                                    <span class="reward-text">${location.boss.crystalReward[0]}-${location.boss.crystalReward[1]} кристаллов</span>
                                </div>
                                <div class="reward-item">
                                    <span class="reward-icon">🎁</span>
                                    <span class="reward-text">${(location.boss.itemDropChance * 100).toFixed(0)}% шанс предмета</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
        });
    }
    
    contentArea.innerHTML = html;
}

function showRaids() {
    const contentArea = document.getElementById('content-area');
    const pageTitle = document.getElementById('page-title');
    
    pageTitle.textContent = 'Рейдовые боссы';
    
    let html = `
        <div class="content-card">
            <h2><i class="fas fa-skull-crossbones"></i> Рейдовые боссы</h2>
            <p>Эпические боссы для командных сражений. Требуется координация и мощная команда!</p>
            <p><strong>⚠️ Минимум 2% урона для получения награды</strong></p>
        </div>
    `;
    
    if (typeof RAID_BOSSES !== 'undefined') {
        Object.values(RAID_BOSSES).forEach(raid => {
            const levelColors = {
                1: 'epic',
                2: 'mythic'
            };
            
            html += `
                <div class="content-card raid-boss-card">
                    <div class="raid-boss-header">
                        <div class="raid-boss-image">
                            <img src="images/${raid.image}" alt="${raid.name}" onerror="this.style.display='none'">
                        </div>
                        <div>
                            <h2>${raid.name}</h2>
                            <span class="rarity-badge ${levelColors[raid.level] || 'epic'}">Уровень ${raid.level}</span>
                            <p class="raid-description">${raid.description}</p>
                        </div>
                    </div>
                    
                    ${raid.requirements ? `
                    <div class="raid-requirements">
                        <h3>📋 Требования</h3>
                        <div class="requirements-grid">
                            ${raid.requirements.min_race_level ? `
                            <div class="requirement-item">
                                <span>Минимальный уровень расы:</span>
                                <strong>${raid.requirements.min_race_level}</strong>
                            </div>
                            ` : ''}
                            ${raid.requirements.required_raid_participation ? `
                            <div class="requirement-item">
                                <span>Требуется победа над:</span>
                                <strong>${raid.requirements.required_raid_participation}</strong>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    ` : `
                    <div class="raid-requirements">
                        <h3>📋 Требования</h3>
                        <p>✅ Доступен всем игрокам</p>
                    </div>
                    `}
                    
                    <div class="raid-stats-grid">
                        <div class="stat-card">
                            <div class="stat-label">❤️ Здоровье</div>
                            <div class="stat-value">${raid.hp.toLocaleString()}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">⏰ Кулдаун</div>
                            <div class="stat-value">${raid.cooldown_hours} часов</div>
                        </div>
                    </div>
                    
                    <div class="raid-lore">
                        <h3>📜 Описание</h3>
                        <p>${raid.description}</p>
                    </div>
                    
                    <div class="raid-rewards">
                        <h3>🎁 Награды (делятся по урону)</h3>
                        <div class="rewards-grid">
                            <div class="reward-item">
                                <span class="reward-icon">💰</span>
                                <span class="reward-text">${raid.rewards.total_gold.toLocaleString()} золота</span>
                            </div>
                            <div class="reward-item">
                                <span class="reward-icon">⭐</span>
                                <span class="reward-text">${raid.rewards.total_exp.toLocaleString()} опыта</span>
                            </div>
                            <div class="reward-item">
                                <span class="reward-icon">💎</span>
                                <span class="reward-text">${raid.rewards.total_crystals} кристаллов</span>
                            </div>
                        </div>
                        ${raid.special_rewards ? `
                        <div class="special-rewards">
                            <h4>🌟 Специальные награды</h4>
                            ${raid.special_rewards.top_1_guaranteed_item ? `
                            <p><strong>Топ-1 по урону:</strong> Гарантированно получает <span class="rarity-badge mythic">${raid.special_rewards.top_1_guaranteed_item}</span></p>
                            ` : ''}
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });
    } else {
        html += `
            <div class="content-card">
                <p>Загрузка данных о рейдовых боссах...</p>
            </div>
        `;
    }
    
    contentArea.innerHTML = html;
}
