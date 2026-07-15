const tg = window.Telegram?.WebApp;
if (tg) { tg.expand(); tg.ready(); }

const API = window.location.origin + '/api/roulette';

let currentUser = null;
let playerData = null;
let currentRoom = null;
let currentBets = [];
let myBet = null;
let selectedItems = new Set();
let pollInterval = null;

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', async () => {
    const user = tg?.initDataUnsafe?.user;
    if (user) {
        currentUser = { id: user.id, username: user.username || user.first_name };
    } else {
        currentUser = { id: 1456932347, username: 'testuser' }; // dev
    }
    await loadPlayerData();
    await loadRoom();
    loadInventory();
    loadHistory();
    pollInterval = setInterval(loadRoom, 3000);
});

async function loadPlayerData() {
    try {
        const r = await fetch(`/api/marketplace/player/${currentUser.id}`);
        if (r.ok) {
            playerData = await r.json();
            document.getElementById('gold-balance').textContent = `💰 ${fmt(playerData.gold || 0)}`;
            document.getElementById('crystal-balance').textContent = `💎 ${playerData.crystals || 0}`;
        }
    } catch(e) {}
}

async function loadRoom() {
    try {
        const r = await fetch(`${API}/room`);
        if (!r.ok) return;
        const data = await r.json();
        currentRoom = data.room;
        currentBets = data.bets || [];
        myBet = currentBets.find(b => b.user_id == currentUser.id) || null;
        renderPlayers();
        renderRoulette();
        updateBetUI();
        updateStatusText();
    } catch(e) {}
}

function renderPlayers() {
    const list = document.getElementById('players-list');
    const cnt = document.getElementById('players-count');
    const totalValue = currentBets.reduce((s, b) => s + b.total_value, 0);
    cnt.textContent = `${currentBets.length} игроков`;
    if (currentBets.length === 0) {
        list.innerHTML = '<div class="loading">Никого нет. Будь первым!</div>';
        return;
    }
    list.innerHTML = currentBets.map(bet => {
        const chance = totalValue > 0 ? ((bet.total_value / totalValue) * 100).toFixed(1) : 0;
        const parts = [];
        if (bet.gold > 0) parts.push(`💰${fmt(bet.gold)}`);
        if (bet.crystals > 0) parts.push(`💎${bet.crystals}`);
        const items = JSON.parse(bet.items || '[]');
        if (items.length > 0) parts.push(`🎒${items.length} пред.`);
        return `
        <div class="player-row">
            <div class="player-color" style="background:${bet.color}"></div>
            <div class="player-info">
                <div class="player-name">${bet.username}${bet.user_id == currentUser.id ? ' (вы)' : ''}</div>
                <div class="player-bet-detail">${parts.join(' · ')}</div>
            </div>
            <div class="player-chance" style="background:${bet.color}">${chance}%</div>
        </div>`;
    }).join('');
}

function renderRoulette() {
    const track = document.getElementById('roulette-track');
    if (currentBets.length === 0) {
        track.innerHTML = '<div class="roulette-segment" style="width:100%;background:#1a1a2e;color:#555">Ждём игроков...</div>';
        track.style.transform = '';
        return;
    }
    const totalValue = currentBets.reduce((s, b) => s + b.total_value, 0);
    const TRACK_WIDTH = 2400; // px
    // Создаём сегменты пропорционально вкладу
    const segments = [];
    for (const bet of currentBets) {
        const widthPx = Math.max(30, Math.floor((bet.total_value / totalValue) * TRACK_WIDTH));
        segments.push({ bet, widthPx });
    }
    // Дублируем 4 раза для анимации
    let html = '';
    for (let rep = 0; rep < 4; rep++) {
        for (const seg of segments) {
            html += `<div class="roulette-segment" style="width:${seg.widthPx}px;background:${seg.bet.color}">
                ${seg.bet.username}<br><span style="font-size:9px;opacity:0.8">${((seg.bet.total_value/totalValue)*100).toFixed(0)}%</span>
            </div>`;
        }
    }
    track.innerHTML = html;
    track.style.transform = '';
}

function updateStatusText() {
    const el = document.getElementById('room-status');
    if (currentBets.length === 0) {
        el.textContent = 'Первая ставка открывает раунд';
        el.className = 'room-status';
    } else if (currentBets.length === 1) {
        el.textContent = 'Ждём ещё минимум 1 игрока для старта';
        el.className = 'room-status';
    } else {
        el.textContent = `${currentBets.length} игроков готовы! Можно крутить.`;
        el.className = 'room-status ready';
    }
}

function updateBetUI() {
    const betBtn = document.getElementById('bet-btn');
    const spinBtn = document.getElementById('spin-btn');
    if (myBet) {
        betBtn.style.display = 'none';
        spinBtn.style.display = currentBets.length >= 2 ? 'block' : 'none';
    } else {
        betBtn.style.display = 'block';
        spinBtn.style.display = 'none';
    }
    updateBetTotal();
}

async function loadInventory() {
    const list = document.getElementById('inventory-list');
    try {
        const r = await fetch(`${API}/inventory/${currentUser.id}`);
        if (!r.ok) { list.innerHTML = '<div class="loading">Нет предметов</div>'; return; }
        const items = await r.json();
        if (items.length === 0) {
            list.innerHTML = '<div class="loading">Инвентарь пуст</div>';
            return;
        }
        list.innerHTML = items.map(item => `
            <div class="inv-item" id="item-${item.inv_id}" onclick="toggleItem(${item.inv_id}, ${item.value})">
                <div class="inv-item-name rarity-${item.rarity}">${item.name}</div>
                <div class="inv-item-info">💰 ${item.value}</div>
            </div>`).join('');
    } catch(e) {
        list.innerHTML = '<div class="loading">Ошибка загрузки</div>';
    }
}

function toggleItem(invId, value) {
    const el = document.getElementById(`item-${invId}`);
    if (selectedItems.has(invId)) {
        selectedItems.delete(invId);
        el.classList.remove('selected');
    } else {
        selectedItems.add(invId);
        el.classList.add('selected');
    }
    updateBetTotal();
}

function updateBetTotal() {
    const gold = parseInt(document.getElementById('gold-input').value) || 0;
    const crystals = parseInt(document.getElementById('crystals-input').value) || 0;
    const itemsVal = Array.from(selectedItems).reduce((s, id) => {
        const el = document.getElementById(`item-${id}`);
        const info = el?.querySelector('.inv-item-info')?.textContent || '';
        return s + (parseInt(info.replace('💰 ', '')) || 0);
    }, 0);
    const total = gold + crystals * 5 + itemsVal;
    document.getElementById('bet-total-value').textContent = `💰 ${fmt(total)}`;
    // Шанс
    const currentTotal = currentBets.reduce((s, b) => s + b.total_value, 0) + total;
    if (currentTotal > 0 && total > 0) {
        const chance = ((total / currentTotal) * 100).toFixed(1);
        document.getElementById('bet-chance').textContent = `(~${chance}% шанс)`;
    } else {
        document.getElementById('bet-chance').textContent = '';
    }
}

document.getElementById('gold-input').addEventListener('input', updateBetTotal);
document.getElementById('crystals-input').addEventListener('input', updateBetTotal);

function setGold(v) { document.getElementById('gold-input').value = v; updateBetTotal(); }
function setCrystals(v) { document.getElementById('crystals-input').value = v; updateBetTotal(); }
function setAllGold() { if (playerData) setGold(playerData.gold || 0); }
function setAllCrystals() { if (playerData) setCrystals(playerData.crystals || 0); }

async function placeBet() {
    const gold = parseInt(document.getElementById('gold-input').value) || 0;
    const crystals = parseInt(document.getElementById('crystals-input').value) || 0;
    const inventoryIds = Array.from(selectedItems);

    if (gold === 0 && crystals === 0 && inventoryIds.length === 0) {
        alert('Поставьте хотя бы что-нибудь!');
        return;
    }

    const btn = document.getElementById('bet-btn');
    btn.disabled = true;
    btn.textContent = 'Ставим...';

    try {
        const r = await fetch(`${API}/bet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, username: currentUser.username, gold, crystals, inventoryIds })
        });
        const data = await r.json();
        if (data.success) {
            document.getElementById('gold-input').value = '';
            document.getElementById('crystals-input').value = '';
            selectedItems.clear();
            document.querySelectorAll('.inv-item.selected').forEach(el => el.classList.remove('selected'));
            await loadPlayerData();
            await loadRoom();
        } else {
            alert(data.error || 'Ошибка ставки');
            btn.disabled = false;
            btn.textContent = '🎲 Поставить';
        }
    } catch(e) {
        alert('Ошибка соединения');
        btn.disabled = false;
        btn.textContent = '🎲 Поставить';
    }
}

async function spinRoulette() {
    if (!currentRoom) return;
    if (currentBets.length < 2) { alert('Нужно минимум 2 игрока!'); return; }

    const btn = document.getElementById('spin-btn');
    btn.disabled = true;
    btn.textContent = '🎰 Крутим...';
    clearInterval(pollInterval);

    try {
        const r = await fetch(`${API}/spin/${currentRoom.id}`, { method: 'POST' });
        const data = await r.json();
        if (data.success) {
            animateSpin(data, data.spinResult);
        } else {
            alert(data.error || 'Ошибка');
            btn.disabled = false;
            btn.textContent = '🎰 КРУТИТЬ!';
            pollInterval = setInterval(loadRoom, 3000);
        }
    } catch(e) {
        alert('Ошибка соединения');
        btn.disabled = false;
        btn.textContent = '🎰 КРУТИТЬ!';
        pollInterval = setInterval(loadRoom, 3000);
    }
}

function animateSpin(result, spinResult) {
    const track = document.getElementById('roulette-track');
    const totalValue = result.bets.reduce((s, b) => s + b.total_value, 0);
    const SEGMENT_REPEAT = 4;
    const TRACK_WIDTH = 2400;

    // Считаем позицию победителя в треке
    let winnerOffset = 0;
    let cumulative = 0;
    for (const bet of result.bets) {
        const segW = Math.max(30, Math.floor((bet.total_value / totalValue) * TRACK_WIDTH));
        if (bet.user_id === result.winner.user_id) {
            winnerOffset = cumulative + segW / 2;
            break;
        }
        cumulative += segW;
    }

    // Смещаемся так чтобы победитель оказался под стрелкой
    const containerW = track.parentElement.offsetWidth;
    const targetX = (TRACK_WIDTH * (SEGMENT_REPEAT - 1)) + winnerOffset - containerW / 2;
    const finalTranslate = -targetX;

    track.style.transition = 'none';
    track.style.transform = 'translateX(0)';

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            track.style.transition = 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
            track.style.transform = `translateX(${finalTranslate}px)`;
        });
    });

    setTimeout(() => showResult(result), 5500);
}

function showResult(result) {
    const isWinner = result.winner.user_id == currentUser.id;
    const modal = document.getElementById('result-modal');
    const content = document.getElementById('result-content');

    content.innerHTML = `
        <div style="font-size:48px">${isWinner ? '🎉' : '💀'}</div>
        <div class="winner-name">${result.winner.username}</div>
        <div style="color:#aaa;font-size:13px;margin-bottom:12px">победил в рулетке!</div>
        <div class="win-details">
            💰 ${fmt(result.totalGold)} золота<br>
            💎 ${result.totalCrystals} кристаллов<br>
            🎒 ${result.totalItems} предметов
        </div>
        ${isWinner ? '<div style="color:#2ecc71;font-weight:700;margin-top:12px;font-size:15px">Это ВЫ! 🏆</div>' : ''}
    `;

    modal.style.display = 'flex';
    if (tg) tg.HapticFeedback?.notificationOccurred(isWinner ? 'success' : 'error');
}

function closeResult() {
    document.getElementById('result-modal').style.display = 'none';
    currentRoom = null;
    currentBets = [];
    myBet = null;
    selectedItems.clear();
    loadRoom();
    loadInventory();
    loadPlayerData();
    loadHistory();
    pollInterval = setInterval(loadRoom, 3000);
}

async function loadHistory() {
    try {
        const r = await fetch(`${API}/history`);
        if (!r.ok) return;
        const items = await r.json();
        const list = document.getElementById('history-list');
        if (!items.length) { list.innerHTML = '<div class="loading">Нет игр</div>'; return; }
        list.innerHTML = items.map(item => `
            <div class="history-row">
                <span class="history-winner">🏆 ${item.winner_username || '?'}</span>
                <span class="history-value">💰 ${fmt(item.total_value)}</span>
            </div>`).join('');
    } catch(e) {}
}

function fmt(n) {
    n = parseInt(n) || 0;
    if (n >= 1e9) return (n/1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n/1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n/1e3).toFixed(1) + 'K';
    return n.toString();
}
