const tg = window.Telegram?.WebApp;
if (tg) { tg.expand(); tg.ready(); }

const API = window.location.origin + '/api/roulette';

let currentUser = null;
let playerData = null;
let currentRoom = null;
let currentBets = [];
let myBet = null;
let selectedItems = new Set(); // Set of inv_id
let inventoryItems = [];
let polling = null;

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const u = tg?.initDataUnsafe?.user;
    currentUser = u ? { id: u.id, username: u.username || u.first_name }
                    : { id: 0, username: 'Guest' };

    await refresh();
    await loadInventory();
    loadHistory();
    polling = setInterval(pollRoom, 3000);

    document.getElementById('gold-input').addEventListener('input', calcTotal);
    document.getElementById('crystals-input').addEventListener('input', calcTotal);
});

// ── POLLING ───────────────────────────────────────────────────────────────────
async function pollRoom() {
    try {
        const r = await fetch(`${API}/room`);
        if (!r.ok) return;
        const data = await r.json();
        // Только обновляем если комната та же и не крутим
        if (currentRoom && data.room.id === currentRoom.id) {
            currentBets = data.bets;
            myBet = currentBets.find(b => b.user_id == currentUser.id) || null;
            renderPlayers();
            renderTrack();
            syncBetUI();
        } else {
            applyRoomData(data);
        }
    } catch(e) {}
}

async function refresh() {
    try {
        const [roomR, playerR] = await Promise.all([
            fetch(`${API}/room`),
            currentUser.id ? fetch(`${API}/player/${currentUser.id}`) : Promise.resolve(null)
        ]);
        if (roomR.ok) applyRoomData(await roomR.json());
        if (playerR && playerR.ok) applyPlayerData(await playerR.json());
    } catch(e) {}
}

function applyRoomData(data) {
    currentRoom = data.room;
    currentBets = data.bets || [];
    myBet = currentBets.find(b => b.user_id == currentUser.id) || null;
    renderPlayers();
    renderTrack();
    syncBetUI();
    updateStatus();
}

function applyPlayerData(p) {
    playerData = p;
    document.getElementById('gold-balance').textContent = `💰 ${fmt(p.gold)}`;
    document.getElementById('crystal-balance').textContent = `💎 ${p.crystals}`;
}

// ── РЕНДЕР ИГРОКОВ ────────────────────────────────────────────────────────────
function renderPlayers() {
    const list = document.getElementById('players-list');
    document.getElementById('players-count').textContent = `${currentBets.length} игрок(ов)`;
    if (!currentBets.length) {
        list.innerHTML = '<div class="empty-msg">Никого нет — будь первым!</div>';
        return;
    }
    const total = currentBets.reduce((s, b) => s + b.total_value, 0);
    list.innerHTML = currentBets.map(b => {
        const pct = total > 0 ? ((b.total_value / total) * 100).toFixed(1) : 0;
        const parts = [];
        if (b.gold > 0) parts.push(`💰 ${fmt(b.gold)}`);
        if (b.crystals > 0) parts.push(`💎 ${b.crystals}`);
        const items = Array.isArray(b.items) ? b.items : [];
        if (items.length) parts.push(`🎒 ${items.length} пред.`);
        const isMe = b.user_id == currentUser.id;
        return `<div class="player-row ${isMe ? 'is-me' : ''}">
            <div class="pcolor" style="background:${b.color}"></div>
            <div class="pinfo">
                <div class="pname">${b.username}${isMe ? ' (вы)' : ''}</div>
                <div class="pdetail">${parts.join(' · ')}</div>
            </div>
            <div class="pchance" style="background:${b.color}">${pct}%</div>
        </div>`;
    }).join('');
}

// ── РУЛЕТКА-ТРЕК ──────────────────────────────────────────────────────────────
const TRACK_W = 3000;
const REPEATS = 5;

function renderTrack() {
    const track = document.getElementById('roulette-track');
    track.style.transition = 'none';
    track.style.transform = 'translateX(0)';

    if (!currentBets.length) {
        track.innerHTML = `<div class="seg seg-empty" style="width:100%">Ждём игроков...</div>`;
        return;
    }
    const total = currentBets.reduce((s, b) => s + b.total_value, 0);
    let html = '';
    for (let r = 0; r < REPEATS; r++) {
        for (const b of currentBets) {
            const w = Math.max(28, Math.floor((b.total_value / total) * TRACK_W));
            html += `<div class="seg" style="width:${w}px;background:${b.color}">${b.username}</div>`;
        }
    }
    track.innerHTML = html;
}

// ── СТАТУС ────────────────────────────────────────────────────────────────────
function updateStatus() {
    const el = document.getElementById('room-status');
    if (!currentBets.length) {
        el.textContent = 'Сделайте первую ставку';
        el.className = 'room-status';
    } else if (currentBets.length === 1) {
        el.textContent = 'Ждём ещё одного игрока...';
        el.className = 'room-status';
    } else {
        el.textContent = `${currentBets.length} игроков — можно крутить!`;
        el.className = 'room-status ready';
    }
}

// ── КНОПКИ ────────────────────────────────────────────────────────────────────
function syncBetUI() {
    const betBtn = document.getElementById('bet-btn');
    const spinBtn = document.getElementById('spin-btn');
    const alreadyBet = document.getElementById('already-bet');

    if (myBet) {
        betBtn.style.display = 'none';
        alreadyBet.style.display = 'block';
        spinBtn.style.display = currentBets.length >= 2 ? 'block' : 'none';
    } else {
        betBtn.style.display = 'block';
        alreadyBet.style.display = 'none';
        spinBtn.style.display = 'none';
    }
    calcTotal();
    updateStatus();
}

// ── ИНВЕНТАРЬ ─────────────────────────────────────────────────────────────────
async function loadInventory() {
    const list = document.getElementById('inventory-list');
    if (!currentUser.id) { list.innerHTML = '<div class="empty-msg">Войдите через Telegram</div>'; return; }
    try {
        const r = await fetch(`${API}/inventory/${currentUser.id}`);
        inventoryItems = r.ok ? await r.json() : [];
        if (!inventoryItems.length) {
            list.innerHTML = '<div class="empty-msg">Инвентарь пуст</div>'; return;
        }
        list.innerHTML = inventoryItems.map(item => `
            <div class="inv-card" id="icard-${item.inv_id}" onclick="toggleItem(${item.inv_id})">
                <div class="inv-name rarity-${item.rarity}">${item.name}</div>
                <div class="inv-val">💰 ${item.value}</div>
                <div class="inv-check">✓</div>
            </div>`).join('');
    } catch(e) {
        list.innerHTML = '<div class="empty-msg">Ошибка загрузки</div>';
    }
}

function toggleItem(invId) {
    const el = document.getElementById(`icard-${invId}`);
    if (selectedItems.has(invId)) { selectedItems.delete(invId); el.classList.remove('selected'); }
    else { selectedItems.add(invId); el.classList.add('selected'); }
    calcTotal();
}

// ── ПОДСЧЁТ СТАВКИ ────────────────────────────────────────────────────────────
function calcTotal() {
    const g = Math.max(0, parseInt(document.getElementById('gold-input').value) || 0);
    const c = Math.max(0, parseInt(document.getElementById('crystals-input').value) || 0);
    const itemsVal = Array.from(selectedItems).reduce((s, id) => {
        const item = inventoryItems.find(i => i.inv_id === id);
        return s + (item ? item.value : 0);
    }, 0);
    const myTotal = g + c * 5 + itemsVal;
    const poolTotal = currentBets.reduce((s, b) => s + b.total_value, 0) + myTotal;
    const pct = poolTotal > 0 && myTotal > 0 ? ((myTotal / poolTotal) * 100).toFixed(1) : 0;

    document.getElementById('bet-total-value').textContent = fmt(myTotal);
    document.getElementById('bet-chance').textContent = myTotal > 0 ? `~${pct}% шанс` : '';
}

// Быстрые кнопки
function setGold(v) { document.getElementById('gold-input').value = v; calcTotal(); }
function setCrystals(v) { document.getElementById('crystals-input').value = v; calcTotal(); }
function setAllGold() { setGold(playerData?.gold || 0); }
function setAllCrystals() { setCrystals(playerData?.crystals || 0); }

// ── СТАВКА ────────────────────────────────────────────────────────────────────
async function placeBet() {
    const gold = parseInt(document.getElementById('gold-input').value) || 0;
    const crystals = parseInt(document.getElementById('crystals-input').value) || 0;
    const inventoryIds = Array.from(selectedItems);

    if (gold === 0 && crystals === 0 && inventoryIds.length === 0) {
        return toast('Поставьте хотя бы что-нибудь!', 'error');
    }

    const btn = document.getElementById('bet-btn');
    btn.disabled = true; btn.textContent = '⏳ Ставим...';

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
            document.querySelectorAll('.inv-card.selected').forEach(e => e.classList.remove('selected'));
            toast('Ставка принята!', 'ok');
            await refresh();
            if (currentUser.id) {
                const pr = await fetch(`${API}/player/${currentUser.id}`);
                if (pr.ok) applyPlayerData(await pr.json());
            }
        } else {
            toast(data.error || 'Ошибка', 'error');
            btn.disabled = false; btn.textContent = '🎲 Поставить';
        }
    } catch(e) {
        toast('Ошибка соединения', 'error');
        btn.disabled = false; btn.textContent = '🎲 Поставить';
    }
}

// ── КРУТИТЬ ───────────────────────────────────────────────────────────────────
async function spinRoulette() {
    if (!currentRoom) return;
    if (currentBets.length < 2) return toast('Нужно минимум 2 игрока!', 'error');

    clearInterval(polling);
    const btn = document.getElementById('spin-btn');
    btn.disabled = true; btn.textContent = '🎰 Крутим...';

    try {
        const r = await fetch(`${API}/spin/${currentRoom.id}`, { method: 'POST' });
        const data = await r.json();
        if (data.success) {
            animateSpin(data);
        } else {
            toast(data.error || 'Ошибка', 'error');
            btn.disabled = false; btn.textContent = '🎰 КРУТИТЬ!';
            polling = setInterval(pollRoom, 3000);
        }
    } catch(e) {
        toast('Ошибка соединения', 'error');
        btn.disabled = false; btn.textContent = '🎰 КРУТИТЬ!';
        polling = setInterval(pollRoom, 3000);
    }
}

function animateSpin(result) {
    const track = document.getElementById('roulette-track');
    const total = result.bets.reduce((s, b) => s + b.total_value, 0);
    const containerW = track.parentElement.offsetWidth;

    // Пересчитываем трек с актуальными данными
    currentBets = result.bets;
    renderTrack();

    // Позиция победителя в одном повторе
    let offset = 0;
    for (const b of result.bets) {
        const w = Math.max(28, Math.floor((b.total_value / total) * TRACK_W));
        if (b.user_id === result.winner.user_id) {
            offset += w / 2;
            break;
        }
        offset += w;
    }

    // Прокручиваем к победителю в предпоследнем повторе
    const target = TRACK_W * (REPEATS - 2) + offset - containerW / 2;

    requestAnimationFrame(() => requestAnimationFrame(() => {
        track.style.transition = 'transform 5s cubic-bezier(0.17,0.67,0.12,0.99)';
        track.style.transform = `translateX(${-target}px)`;
    }));

    setTimeout(() => showResultModal(result), 5600);
}

function showResultModal(result) {
    const isWinner = result.winner.user_id == currentUser.id;
    document.getElementById('result-content').innerHTML = `
        <div style="font-size:52px;margin-bottom:8px">${isWinner ? '🏆' : '💀'}</div>
        <div class="winner-name" style="color:${result.winner.color || '#f1c40f'}">${result.winner.username}</div>
        <div style="color:#888;font-size:13px;margin:4px 0 12px">победил в рулетке</div>
        <div class="win-details">
            💰 ${fmt(result.totalGold)} золота<br>
            💎 ${result.totalCrystals} кристаллов<br>
            🎒 ${result.wonItems} предметов
        </div>
        ${isWinner ? '<div style="color:#2ecc71;font-weight:700;font-size:16px;margin-top:12px">ЭТО ВЫ! 🎉</div>' : ''}
    `;
    document.getElementById('result-modal').style.display = 'flex';
    tg?.HapticFeedback?.notificationOccurred(isWinner ? 'success' : 'error');
}

function closeResult() {
    document.getElementById('result-modal').style.display = 'none';
    currentRoom = null; currentBets = []; myBet = null;
    selectedItems.clear();
    refresh();
    loadInventory();
    loadHistory();
    polling = setInterval(pollRoom, 3000);
}

// ── ИСТОРИЯ ───────────────────────────────────────────────────────────────────
async function loadHistory() {
    try {
        const r = await fetch(`${API}/history`);
        if (!r.ok) return;
        const items = await r.json();
        const el = document.getElementById('history-list');
        el.innerHTML = items.length
            ? items.map(i => `
                <div class="hist-row">
                    <span class="hist-winner">🏆 ${i.winner_username || '?'}</span>
                    <span class="hist-val">💰 ${fmt(i.total_value || 0)}</span>
                </div>`).join('')
            : '<div class="empty-msg">Нет завершённых игр</div>';
    } catch(e) {}
}

// ── УТИЛИТЫ ───────────────────────────────────────────────────────────────────
function fmt(n) {
    n = parseInt(n) || 0;
    if (n >= 1e9) return (n/1e9).toFixed(1)+'B';
    if (n >= 1e6) return (n/1e6).toFixed(1)+'M';
    if (n >= 1e3) return (n/1e3).toFixed(1)+'K';
    return String(n);
}

function toast(msg, type = 'ok') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2800);
}
