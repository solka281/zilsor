const tg = window.Telegram.WebApp;
tg.expand();

let currentUser = null;
let userInventory = [];
let marketplaceItems = [];
let auctionItems = [];
let currencyItems = [];
let mySalesItems = [];
let historyItems = [];
let selectedItem = null;
let selectedAuction = null;

const API_BASE = window.location.origin + '/api/marketplace';

document.addEventListener('DOMContentLoaded', async () => {
    initializeApp();
    setupEventListeners();
    await loadUserData();
    await loadMarketplaceData();
});

function initializeApp() {
    tg.ready();
    tg.MainButton.hide();
    
    const user = tg.initDataUnsafe?.user;
    if (user) {
        currentUser = {
            id: user.id,
            username: user.username || user.first_name,
            firstName: user.first_name
        };
    }
}

function setupEventListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchToTab(tabName);
        });
    });

    document.getElementById('item-filter')?.addEventListener('change', filterMarketplaceItems);
    document.getElementById('rarity-filter')?.addEventListener('change', filterMarketplaceItems);
    document.getElementById('history-filter')?.addEventListener('change', filterHistoryItems);

    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', closeModal);
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal();
        }
    });

    document.getElementById('sell-btn')?.addEventListener('click', sellItem);
    document.getElementById('bid-btn')?.addEventListener('click', makeBid);
    
    // Переключение между прямой продажей и аукционом
    document.querySelectorAll('input[name="sale-type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const isAuction = e.target.value === 'auction';
            document.getElementById('direct-sale-options').style.display = isAuction ? 'none' : 'block';
            document.getElementById('auction-options').style.display = isAuction ? 'block' : 'none';
        });
    });
}

function switchToTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    loadTabData(tabName);
}

async function loadTabData(tabName) {
    switch (tabName) {
        case 'marketplace':
            await loadMarketplaceData();
            break;
        case 'auctions':
            await loadAuctionsData();
            break;
        case 'currencies':
            await loadCurrenciesData();
            break;
        case 'inventory':
            await loadInventoryData();
            break;
        case 'my-sales':
            await loadMySalesData();
            break;
        case 'history':
            await loadHistoryData();
            break;
    }
}

async function loadUserData() {
    try {
        const user = tg.initDataUnsafe?.user;
        if (!user) {
            console.error('Пользователь не найден');
            return;
        }
        
        const response = await fetch(`${API_BASE}/user/${user.id}`);
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                updateUserBalance(result.data.gold, result.data.crystals);
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
    }
}

function updateUserBalance(gold, crystals) {
    document.getElementById('gold-balance').textContent = `💰 ${gold.toLocaleString()}`;
    document.getElementById('crystal-balance').textContent = `💎 ${crystals.toLocaleString()}`;
}

async function loadMarketplaceData() {
    try {
        showLoading('marketplace-items');
        const response = await fetch(`${API_BASE}/items`);
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                marketplaceItems = result.data || [];
                displayMarketplaceItems(marketplaceItems);
            } else {
                showError('marketplace-items', result.message || 'Ошибка загрузки');
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки маркетплейса:', error);
        showError('marketplace-items', 'Ошибка загрузки предметов');
    }
}

function displayMarketplaceItems(items) {
    const container = document.getElementById('marketplace-items');
    
    if (items.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>Нет предметов на продаже</h3></div>';
        return;
    }
    
    container.innerHTML = items.map(item => createItemCard(item)).join('');
}

function createItemCard(item) {
    const typeIcon = getItemTypeIcon(item.type);
    const typeName = getItemTypeName(item.type);
    
    return `
        <div class="item-card" onclick="showItemDetails(${item.id})">
            <div class="item-header">
                <div>
                    <div class="item-name">${item.item_name}</div>
                    <div class="item-type">${typeIcon} ${typeName}</div>
                </div>
                <div class="item-rarity ${item.item_rarity}">${item.item_rarity}</div>
            </div>
            <div class="item-stats">${formatItemStats(item)}</div>
            <div class="seller-info">👤 ${item.seller_name}</div>
            <div class="item-price">
                <span class="price-amount">${item.currency === 'gold' ? '💰' : '💎'} ${item.price.toLocaleString()}</span>
                <button class="btn btn-small" onclick="event.stopPropagation(); buyItem(${item.id})">Купить</button>
            </div>
        </div>
    `;
}

function getItemTypeIcon(type) {
    const icons = { weapon: '⚔️', armor: '🛡️', artifact: '💍' };
    return icons[type] || '🎯';
}

function getItemTypeName(type) {
    const names = { weapon: 'Оружие', armor: 'Броня', artifact: 'Артефакт' };
    return names[type] || 'Предмет';
}

function formatItemStats(item) {
    if (!item.stats) return 'Нет характеристик';
    try {
        const stats = typeof item.stats === 'string' ? JSON.parse(item.stats) : item.stats;
        return Object.entries(stats).map(([key, value]) => `${key}: +${value}`).join(', ');
    } catch {
        return 'Нет характеристик';
    }
}

function filterMarketplaceItems() {
    const typeFilter = document.getElementById('item-filter').value;
    const rarityFilter = document.getElementById('rarity-filter').value;
    
    let filteredItems = marketplaceItems;
    
    if (typeFilter !== 'all') {
        filteredItems = filteredItems.filter(item => item.type === typeFilter);
    }
    
    if (rarityFilter !== 'all') {
        filteredItems = filteredItems.filter(item => item.item_rarity === rarityFilter);
    }
    
    displayMarketplaceItems(filteredItems);
}

async function loadInventoryData() {
    try {
        showLoading('inventory-items');
        const user = tg.initDataUnsafe?.user;
        if (!user) {
            showError('inventory-items', 'Пользователь не найден');
            return;
        }
        
        const response = await fetch(`${API_BASE}/inventory/${user.id}`);
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                userInventory = result.data || [];
                displayInventoryItems(userInventory);
            } else {
                showError('inventory-items', result.message || 'Ошибка загрузки');
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки инвентаря:', error);
        showError('inventory-items', 'Ошибка загрузки инвентаря');
    }
}

function displayInventoryItems(items) {
    const container = document.getElementById('inventory-items');
    
    if (items.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>Инвентарь пуст</h3></div>';
        return;
    }
    
    container.innerHTML = items.map(item => createInventoryItemCard(item)).join('');
}

function createInventoryItemCard(item) {
    const typeIcon = getItemTypeIcon(item.type);
    const typeName = getItemTypeName(item.type);
    const isEquipped = item.equipped ? ' (экипирован)' : '';
    const itemName = item.name || item.item_name || 'Предмет';
    const itemRarity = item.rarity || item.item_rarity || 'COMMON';
    const itemCardId = item.inventory_id || item.id;
    
    return `
        <div class="item-card">
            <div class="item-header">
                <div>
                    <div class="item-name">${itemName}${isEquipped}</div>
                    <div class="item-type">${typeIcon} ${typeName}</div>
                </div>
                <div class="item-rarity ${itemRarity}">${itemRarity}</div>
            </div>
            <div class="item-stats">${formatItemStats(item)}</div>
            <div class="item-price">
                ${!item.equipped ? `<button class="btn btn-small" onclick="showSellModal(${itemCardId})">Продать</button>` : '<span>Экипирован</span>'}
            </div>
        </div>
    `;
}

function showItemDetails(itemId) {
    const item = marketplaceItems.find(i => i.id === itemId);
    if (!item) return;
    
    const modal = document.getElementById('item-modal');
    const details = document.getElementById('item-details');
    
    details.innerHTML = `
        <h3>${item.item_name}</h3>
        <p><strong>Тип:</strong> ${getItemTypeIcon(item.type)} ${getItemTypeName(item.type)}</p>
        <p><strong>Редкость:</strong> <span class="item-rarity ${item.item_rarity}">${item.item_rarity}</span></p>
        <p><strong>Характеристики:</strong> ${formatItemStats(item)}</p>
        <p><strong>Цена:</strong> ${item.currency === 'gold' ? '💰' : '💎'} ${item.price.toLocaleString()}</p>
        <p><strong>Продавец:</strong> 👤 ${item.seller_name}</p>
        <p class="commission-info">ℹ️ Комиссия 20%: продавец получит ${Math.floor(item.price * 0.8).toLocaleString()} ${item.currency === 'gold' ? 'золота' : 'кристаллов'}</p>
        <button class="btn" onclick="buyItem(${item.id})">Купить</button>
    `;
    
    modal.style.display = 'block';
}

async function buyItem(itemId) {
    try {
        const user = tg.initDataUnsafe?.user;
        if (!user) {
            showNotification('Пользователь не найден', 'error');
            return;
        }
        
        const response = await fetch(`${API_BASE}/buy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, itemId: itemId })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification(result.message || 'Предмет успешно куплен!');
            await loadUserData();
            await loadMarketplaceData();
            closeModal();
        } else {
            showNotification(result.message || 'Ошибка покупки', 'error');
        }
    } catch (error) {
        console.error('Ошибка покупки:', error);
        showNotification('Ошибка покупки предмета', 'error');
    }
}

function showSellModal(itemId) {
    const item = userInventory.find(i => i.inventory_id === itemId || i.id === itemId);
    if (!item) return;
    
    selectedItem = item;
    
    const modal = document.getElementById('sell-modal');
    const itemInfo = document.getElementById('sell-item-info');
    
    const itemName = item.name || item.item_name || 'Предмет';
    const itemRarity = item.rarity || item.item_rarity || 'COMMON';
    
    itemInfo.innerHTML = `
        <h4>${itemName}</h4>
        <p>${getItemTypeIcon(item.type)} ${getItemTypeName(item.type)} | <span class="item-rarity ${itemRarity}">${itemRarity}</span></p>
    `;
    
    modal.style.display = 'block';
}

async function sellItem() {
    if (!selectedItem) return;
    
    const saleType = document.querySelector('input[name="sale-type"]:checked').value;
    
    if (saleType === 'auction') {
        await createAuction();
    } else {
        await createDirectSale();
    }
}

async function createDirectSale() {
    const price = document.getElementById('sell-price').value;
    const currency = document.querySelector('input[name="currency"]:checked').value;
    
    if (!price || price <= 0) {
        showNotification('Введите корректную цену', 'error');
        return;
    }
    
    if (!selectedItem) {
        showNotification('Предмет не выбран', 'error');
        return;
    }
    
    try {
        const user = tg.initDataUnsafe?.user;
        if (!user) {
            showNotification('Пользователь не найден', 'error');
            return;
        }
        
        const itemId = selectedItem.item_id || selectedItem.id;
        
        const response = await fetch(`${API_BASE}/sell`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.id,
                itemId: itemId,
                price: parseInt(price),
                currency: currency
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification(result.message || 'Предмет выставлен на продажу!');
            await loadInventoryData();
            await loadMarketplaceData();
            closeModal();
        } else {
            showNotification(result.message || 'Ошибка продажи', 'error');
        }
    } catch (error) {
        console.error('Ошибка продажи:', error);
        showNotification('Ошибка продажи предмета', 'error');
    }
}

async function createAuction() {
    const startPrice = document.getElementById('auction-start-price').value;
    const currency = document.querySelector('input[name="auction-currency"]:checked').value;
    const duration = document.getElementById('auction-duration').value;
    
    if (!startPrice || startPrice <= 0) {
        showNotification('Введите начальную цену', 'error');
        return;
    }
    
    if (!selectedItem) {
        showNotification('Предмет не выбран', 'error');
        return;
    }
    
    try {
        const user = tg.initDataUnsafe?.user;
        if (!user) {
            showNotification('Пользователь не найден', 'error');
            return;
        }
        
        const itemId = selectedItem.item_id || selectedItem.id;
        
        console.log('Creating auction:', {
            userId: user.id,
            itemId: itemId,
            startPrice: parseInt(startPrice),
            currency: currency,
            duration: parseInt(duration),
            selectedItem: selectedItem
        });
        
        const response = await fetch(`${API_BASE}/auction/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.id,
                itemId: itemId,
                startPrice: parseInt(startPrice),
                currency: currency,
                duration: parseInt(duration)
            })
        });
        
        const result = await response.json();
        
        console.log('Auction create result:', result);
        
        if (response.ok && result.success) {
            showNotification(result.message || 'Аукцион создан!');
            await loadInventoryData();
            await loadAuctionsData();
            closeModal();
        } else {
            showNotification(result.message || 'Ошибка создания аукциона', 'error');
        }
    } catch (error) {
        console.error('Ошибка создания аукциона:', error);
        showNotification('Ошибка создания аукциона', 'error');
    }
}

async function loadMySalesData() {
    try {
        showLoading('my-sales-items');
        const user = tg.initDataUnsafe?.user;
        if (!user) {
            showError('my-sales-items', 'Пользователь не найден');
            return;
        }
        
        const response = await fetch(`${API_BASE}/my-sales/${user.id}`);
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                mySalesItems = result.data || [];
                displayMySalesItems(mySalesItems);
            } else {
                showError('my-sales-items', result.message || 'Ошибка загрузки');
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки продаж:', error);
        showError('my-sales-items', 'Ошибка загрузки продаж');
    }
}

function displayMySalesItems(items) {
    const container = document.getElementById('my-sales-items');
    
    if (items.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>Нет активных продаж</h3></div>';
        return;
    }
    
    container.innerHTML = items.map(item => createSaleItemCard(item)).join('');
}

function createSaleItemCard(item) {
    return `
        <div class="item-card">
            <div class="item-header">
                <div>
                    <div class="item-name">${item.item_name}</div>
                    <div class="item-type">${getItemTypeIcon(item.type)} ${getItemTypeName(item.type)}</div>
                </div>
                <div class="item-rarity ${item.item_rarity}">${item.item_rarity}</div>
            </div>
            <div class="item-price">
                <span class="price-amount">${item.currency === 'gold' ? '💰' : '💎'} ${item.price.toLocaleString()}</span>
                <button class="btn btn-danger btn-small" onclick="removeSale(${item.id})">Снять</button>
            </div>
        </div>
    `;
}

async function removeSale(itemId) {
    try {
        const user = tg.initDataUnsafe?.user;
        if (!user) {
            showNotification('Пользователь не найден', 'error');
            return;
        }
        
        const response = await fetch(`${API_BASE}/remove-sale`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, saleId: itemId, type: 'item' })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification(result.message || 'Предмет снят с продажи');
            await loadMySalesData();
            await loadMarketplaceData();
        } else {
            showNotification(result.message || 'Ошибка снятия с продажи', 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка снятия с продажи', 'error');
    }
}

async function loadHistoryData() {
    try {
        showLoading('history-items');
        const user = tg.initDataUnsafe?.user;
        if (!user) {
            showError('history-items', 'Пользователь не найден');
            return;
        }
        
        const response = await fetch(`${API_BASE}/history/${user.id}`);
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                historyItems = result.data || [];
                displayHistoryItems(historyItems);
            } else {
                showError('history-items', result.message || 'Ошибка загрузки');
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
        showError('history-items', 'Ошибка загрузки истории');
    }
}

function displayHistoryItems(items) {
    const container = document.getElementById('history-items');
    
    if (items.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>История пуста</h3></div>';
        return;
    }
    
    container.innerHTML = items.map(item => createHistoryItem(item)).join('');
}

function createHistoryItem(item) {
    const date = new Date(item.created_at).toLocaleString('ru-RU');
    const type = item.type === 'purchase' ? '🛒 Покупка' : '💰 Продажа';
    const otherUser = item.type === 'purchase' ? `у ${item.other_user_name}` : `игроку ${item.other_user_name}`;
    
    let itemDescription = '';
    if (item.item_type === 'item') {
        itemDescription = item.item_name;
    } else if (item.item_type === 'currency') {
        itemDescription = `${item.currency_type === 'gold' ? 'Золото' : 'Кристаллы'}`;
    }
    
    const commission = item.commission ? ` (комиссия: ${item.commission})` : '';
    
    return `
        <div class="history-item">
            <div class="history-info">
                <div class="history-type">${type} ${otherUser}</div>
                <div class="history-details">${itemDescription} - ${item.currency === 'gold' ? '💰' : '💎'} ${item.price.toLocaleString()}${commission}</div>
                <div class="history-date">${date}</div>
            </div>
        </div>
    `;
}

function filterHistoryItems() {
    const filter = document.getElementById('history-filter').value;
    
    let filteredItems = historyItems;
    
    if (filter !== 'all') {
        filteredItems = historyItems.filter(item => item.type === filter.replace('es', ''));
    }
    
    displayHistoryItems(filteredItems);
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '<div class="loading">Загрузка...</div>';
    }
}

function showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `<div class="empty-state"><h3>Ошибка</h3><p>${message}</p></div>`;
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Аукционы
async function loadAuctionsData() {
    try {
        showLoading('auctions-items');
        const response = await fetch(`${API_BASE}/auctions`);
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                auctionItems = result.data || [];
                displayAuctionItems(auctionItems);
            } else {
                showError('auctions-items', result.message || 'Ошибка загрузки');
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки аукционов:', error);
        showError('auctions-items', 'Ошибка загрузки аукционов');
    }
}

function displayAuctionItems(items) {
    const container = document.getElementById('auctions-items');
    
    if (items.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>Нет активных аукционов</h3></div>';
        return;
    }
    
    container.innerHTML = items.map(item => createAuctionCard(item)).join('');
}

function createAuctionCard(item) {
    const typeIcon = getItemTypeIcon(item.item_slot);
    const typeName = getItemTypeName(item.item_slot);
    const endsAt = new Date(item.ends_at);
    const timeLeft = Math.max(0, Math.floor((endsAt - new Date()) / 1000 / 60));
    
    return `
        <div class="item-card auction-card" onclick="showAuctionDetails(${item.id})">
            <div class="item-header">
                <div>
                    <div class="item-name">${item.item_name}</div>
                    <div class="item-type">${typeIcon} ${typeName}</div>
                </div>
                <div class="item-rarity ${item.item_rarity}">${item.item_rarity}</div>
            </div>
            <div class="item-stats">${formatAuctionStats(item)}</div>
            <div class="seller-info">👤 ${item.seller_name}</div>
            <div class="auction-info">
                <div>⚡ Ставок: ${item.bid_count}</div>
                <div>⏰ ${timeLeft} мин</div>
            </div>
            ${item.highest_bidder_name ? `<div class="bidder-info">🏆 Лидер: ${item.highest_bidder_name}</div>` : ''}
            <div class="item-price">
                <span class="price-amount">${item.currency === 'gold' ? '💰' : '💎'} ${item.current_bid.toLocaleString()}</span>
                <button class="btn btn-small" onclick="event.stopPropagation(); showAuctionBid(${item.id})">Ставка</button>
            </div>
        </div>
    `;
}

function formatAuctionStats(item) {
    const stats = [];
    if (item.power_bonus) stats.push(`Сила: +${item.power_bonus}`);
    if (item.hp_bonus) stats.push(`HP: +${item.hp_bonus}`);
    if (item.attack_bonus) stats.push(`Атака: +${item.attack_bonus}`);
    if (item.defense_bonus) stats.push(`Защита: +${item.defense_bonus}`);
    return stats.length > 0 ? stats.join(', ') : 'Нет характеристик';
}

function showAuctionDetails(auctionId) {
    const auction = auctionItems.find(a => a.id === auctionId);
    if (!auction) return;
    
    const modal = document.getElementById('item-modal');
    const details = document.getElementById('item-details');
    
    const endsAt = new Date(auction.ends_at);
    const timeLeft = Math.max(0, Math.floor((endsAt - new Date()) / 1000 / 60));
    
    details.innerHTML = `
        <h3>${auction.item_name}</h3>
        <p><strong>Тип:</strong> ${getItemTypeIcon(auction.item_slot)} ${getItemTypeName(auction.item_slot)}</p>
        <p><strong>Редкость:</strong> <span class="item-rarity ${auction.item_rarity}">${auction.item_rarity}</span></p>
        <p><strong>Характеристики:</strong> ${formatAuctionStats(auction)}</p>
        <p><strong>Текущая ставка:</strong> ${auction.currency === 'gold' ? '💰' : '💎'} ${auction.current_bid.toLocaleString()}</p>
        <p><strong>Ставок:</strong> ${auction.bid_count}</p>
        ${auction.highest_bidder_name ? `<p><strong>Лидер:</strong> 🏆 ${auction.highest_bidder_name}</p>` : ''}
        <p><strong>Осталось:</strong> ${timeLeft} минут</p>
        <p><strong>Продавец:</strong> 👤 ${auction.seller_name}</p>
        <button class="btn" onclick="showAuctionBid(${auction.id})">Сделать ставку</button>
    `;
    
    modal.style.display = 'block';
}

function showAuctionBid(auctionId) {
    const auction = auctionItems.find(a => a.id === auctionId);
    if (!auction) return;
    
    selectedAuction = auction;
    
    const modal = document.getElementById('auction-modal');
    const details = document.getElementById('auction-details');
    
    const minBid = auction.current_bid + Math.ceil(auction.current_bid * 0.05); // +5% минимум
    
    details.innerHTML = `
        <h4>${auction.item_name}</h4>
        <p>Продавец: 👤 ${auction.seller_name}</p>
        <p>Текущая ставка: ${auction.currency === 'gold' ? '💰' : '💎'} ${auction.current_bid.toLocaleString()}</p>
        ${auction.highest_bidder_name ? `<p>Лидер: 🏆 ${auction.highest_bidder_name}</p>` : ''}
        <p>Минимальная ставка: ${auction.currency === 'gold' ? '💰' : '💎'} ${minBid.toLocaleString()}</p>
        <p class="commission-info">ℹ️ При победе в аукционе продавец получит 80% от вашей ставки (комиссия 20%)</p>
    `;
    
    document.getElementById('bid-amount').value = minBid;
    document.getElementById('bid-amount').min = minBid;
    
    closeModal();
    modal.style.display = 'block';
}

async function makeBid() {
    if (!selectedAuction) return;
    
    const bidAmount = parseInt(document.getElementById('bid-amount').value);
    const minBid = selectedAuction.current_bid + Math.ceil(selectedAuction.current_bid * 0.05);
    
    if (!bidAmount || bidAmount < minBid) {
        showNotification(`Минимальная ставка: ${minBid}`, 'error');
        return;
    }
    
    try {
        const user = tg.initDataUnsafe?.user;
        if (!user) {
            showNotification('Пользователь не найден', 'error');
            return;
        }
        
        const response = await fetch(`${API_BASE}/auction/bid`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.id,
                auctionId: selectedAuction.id,
                bidAmount: bidAmount
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification(result.message || 'Ставка сделана!');
            await loadAuctionsData();
            await loadUserData();
            closeModal();
        } else {
            showNotification(result.message || 'Ошибка ставки', 'error');
        }
    } catch (error) {
        console.error('Ошибка ставки:', error);
        showNotification('Ошибка ставки', 'error');
    }
}

// Валюты
async function loadCurrenciesData() {
    try {
        showLoading('currencies-items');
        const response = await fetch(`${API_BASE}/currencies`);
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                currencyItems = result.data || [];
                displayCurrencyItems(currencyItems);
            } else {
                showError('currencies-items', result.message || 'Ошибка загрузки');
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки валют:', error);
        showError('currencies-items', 'Ошибка загрузки валют');
    }
}

function displayCurrencyItems(items) {
    const container = document.getElementById('currencies-items');
    
    if (items.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>Нет валют на продаже</h3></div>';
        return;
    }
    
    container.innerHTML = items.map(item => createCurrencyCard(item)).join('');
}

function createCurrencyCard(item) {
    const currencyIcon = item.currency_type === 'gold' ? '💰' : '💎';
    const priceIcon = item.price_currency === 'gold' ? '💰' : '💎';
    
    return `
        <div class="item-card currency-card">
            <div class="item-header">
                <div>
                    <div class="item-name">${currencyIcon} ${item.amount.toLocaleString()} ${item.currency_type === 'gold' ? 'золота' : 'кристаллов'}</div>
                    <div class="item-type">${item.rate_text}</div>
                </div>
            </div>
            <div class="item-price">
                <span class="price-amount">${priceIcon} ${item.total_price.toLocaleString()}</span>
                <button class="btn btn-small" onclick="buyCurrency(${item.id})">Купить</button>
            </div>
            <div class="seller-info">Продавец: ${item.seller_name}</div>
        </div>
    `;
}

async function sellCurrency() {
    const currencyType = document.getElementById('currency-type-sell').value;
    const amount = parseInt(document.getElementById('currency-amount').value);
    const pricePerUnit = parseInt(document.getElementById('currency-price').value);
    
    if (!amount || !pricePerUnit) {
        showNotification('Заполните все поля', 'error');
        return;
    }
    
    if (currencyType === 'gold' && amount < 1000) {
        showNotification('Минимум 1000 золота', 'error');
        return;
    }
    
    if (currencyType === 'crystals' && amount < 1) {
        showNotification('Минимум 1 кристалл', 'error');
        return;
    }
    
    try {
        const user = tg.initDataUnsafe?.user;
        if (!user) {
            showNotification('Пользователь не найден', 'error');
            return;
        }
        
        const response = await fetch(`${API_BASE}/sell-currency`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.id,
                currencyType: currencyType,
                amount: amount,
                pricePerUnit: pricePerUnit
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification(result.message || 'Валюта выставлена на продажу!');
            document.getElementById('currency-amount').value = '';
            document.getElementById('currency-price').value = '';
            await loadCurrenciesData();
            await loadUserData();
        } else {
            showNotification(result.message || 'Ошибка продажи', 'error');
        }
    } catch (error) {
        console.error('Ошибка продажи валюты:', error);
        showNotification('Ошибка продажи валюты', 'error');
    }
}

async function buyCurrency(currencyId) {
    try {
        const user = tg.initDataUnsafe?.user;
        if (!user) {
            showNotification('Пользователь не найден', 'error');
            return;
        }
        
        const response = await fetch(`${API_BASE}/buy-currency`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.id,
                currencyId: currencyId
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification(result.message || 'Валюта куплена!');
            await loadCurrenciesData();
            await loadUserData();
        } else {
            showNotification(result.message || 'Ошибка покупки', 'error');
        }
    } catch (error) {
        console.error('Ошибка покупки валюты:', error);
        showNotification('Ошибка покупки валюты', 'error');
    }
}
