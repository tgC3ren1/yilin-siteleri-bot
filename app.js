/* ================== Auth / UI ================== */
const loginBtn       = document.getElementById('loginBtn');
const logoutBtn      = document.getElementById('logoutBtn');
const userInfo       = document.getElementById('userInfo');
const usernameLabel  = document.getElementById('usernameLabel');
const loginModal     = document.getElementById('loginModal');
const usernameInput  = document.getElementById('usernameInput');
const confirmLogin   = document.getElementById('confirmLogin');

/* Profil göstergeleri */
const todayStatusEl  = document.getElementById('todayStatus');
const totalSpinsEl   = document.getElementById('totalSpins');
const myPointsEl     = document.getElementById('myPoints');
const totalCounterEl = document.getElementById('totalCounter');

/* Leaderboard (opsiyonel) */
const lbEl = document.getElementById('leaderboardList');

/* ================== Wheel ================== */
const spinBtn     = document.getElementById('spinBtn');
const wheelCanvas = document.getElementById('wheelCanvas');
Wheel.drawWheel(wheelCanvas);

/* Kontroller */
const speedSelect  = document.getElementById('speedSelect');
const tickSoundChk = document.getElementById('tickSoundChk');
const flashChk     = document.getElementById('flashChk');

Wheel.setOptions({
  speed: speedSelect?.value || 'normal',
  tick : !!tickSoundChk?.checked,
  flash: !!flashChk?.checked
});

speedSelect?.addEventListener('change', () => Wheel.setOptions({ speed: speedSelect.value }));
tickSoundChk?.addEventListener('change', () => Wheel.setOptions({ tick: tickSoundChk.checked }));
flashChk?.addEventListener('change', () => Wheel.setOptions({ flash: flashChk.checked }));

/* Popup */
const popup      = document.getElementById('popup');
const popupTitle = document.getElementById('popupTitle');
const popupMsg   = document.getElementById('popupMsg');
const popupClose = document.getElementById('popupClose');
popupClose?.addEventListener('click', () => popup.close());

/* ================== Local auth helpers ================== */
function getUsername()       { return localStorage.getItem('username'); }
function setUsername(u)      { localStorage.setItem('username', u); }
function clearSession()      { localStorage.removeItem('username'); }
function todayKey()          { return new Date().toISOString().slice(0,10); }
function setLocalSpinLock()  { localStorage.setItem(`spun_${todayKey()}`, '1'); }
function hasLocalSpinLock()  { return localStorage.getItem(`spun_${todayKey()}`) === '1'; }

function updateProfileUI(user = {}, stats = {}, today_remaining = undefined) {
  if (typeof today_remaining === 'number') {
    todayStatusEl && (todayStatusEl.textContent = today_remaining > 0 ? `✔ (${today_remaining} hak)` : '—');
  }
  if (typeof user.total_spins === 'number') totalSpinsEl && (totalSpinsEl.textContent = user.total_spins);
  if (typeof user.points      === 'number') myPointsEl    && (myPointsEl.textContent    = user.points);
  if (typeof stats.total_spins=== 'number') totalCounterEl&& (totalCounterEl.textContent = stats.total_spins);
}

function refreshAuthUI() {
  const u = getUsername();
  if (!u) {
    loginBtn?.classList.remove('hidden');
    userInfo?.classList.add('hidden');
  } else {
    loginBtn?.classList.add('hidden');
    userInfo?.classList.remove('hidden');
    if (usernameLabel) usernameLabel.textContent = '@' + u;
  }
  if (hasLocalSpinLock()) spinBtn.disabled = true;
}

loginBtn?.addEventListener('click', () => loginModal?.showModal());
confirmLogin?.addEventListener('click', (e) => {
  e.preventDefault();
  const raw = (usernameInput?.value || '').trim().replace(/^@/,'').toLowerCase();
  if (raw) { setUsername(raw); refreshAuthUI(); refreshProfile(); refreshLeaderboard(); }
  loginModal?.close();
});
logoutBtn?.addEventListener('click', () => {
  clearSession();
  refreshAuthUI();
  updateProfileUI({points:0,total_spins:0},{total_spins:0}, undefined);
  renderLeaderboard([]);
});

/* ================== Helpers ================== */
function showError(msg) {
  popupTitle.textContent = "Hata";
  popupMsg.textContent   = msg;
  popup.showModal();
}

function requiredWindowVar(name) {
  const v = window[name];
  if (!v || typeof v !== 'string' || !v.trim()) throw new Error(`${name} tanımlı değil (supabaseClient.js).`);
  return v;
}

function safeJson(text) { try { return JSON.parse(text); } catch { return null; } }

let isSpinning = false;

/* ================== Backend calls ================== */
async function callSpin(username) {
  const EDGE_BASE = requiredWindowVar('EDGE_BASE');     // ...supabase.co/functions/v1
  const ANON_KEY  = requiredWindowVar('SUPABASE_ANON_KEY');
  const url = `${EDGE_BASE}/spin`;

  const ac = new AbortController();
  const t  = setTimeout(() => ac.abort(), 12000);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({ username }),
      signal: ac.signal
    });

    const text = await resp.text();
    if (!resp.ok) {
      if (resp.status === 403) {
        const d = safeJson(text);
        if (d?.reason === 'DAILY_LIMIT') {
          setLocalSpinLock();
          updateProfileUI(d.user, d.stats, 0);
          throw new Error("Bugünkü hakkını kullandın.");
        }
      }
      throw new Error(`Spin isteği başarısız (HTTP ${resp.status}): ${text}`);
    }

    const data = safeJson(text);
    if (!data?.ok || !data?.result?.key) throw new Error(`Eksik/yanlış yanıt: ${text}`);
    return data;
  } finally { clearTimeout(t); }
}

/* result.key -> doğru dilimin index'i */
function pickIndexForResult(resultKey) {
  const matches = Wheel.WHEEL_SEGMENTS
    .map((seg, i) => [seg.key, i])
    .filter(([k]) => k === resultKey)
    .map(([, i]) => i);
  if (!matches.length) return 0;
  return matches[Math.floor(Math.random() * matches.length)];
}

/* ================== Profile & Leaderboard Fetch ================== */
async function refreshProfile() {
  const u = getUsername();
  if (!u) return;
  try {
    const EDGE_BASE = requiredWindowVar('EDGE_BASE');
    const ANON_KEY  = requiredWindowVar('SUPABASE_ANON_KEY');
    // *** Backend: GET /spin?username=... ***
    const resp = await fetch(`${EDGE_BASE}/spin?username=${encodeURIComponent(u)}`, {
      headers: { Authorization: `Bearer ${ANON_KEY}` }
    });
    if (!resp.ok) return;
    const data = await resp.json(); // { ok, user, stats, today_remaining }
    if (!data?.ok) return;

    updateProfileUI(data.user, data.stats, data.today_remaining);
    if (typeof data.today_remaining === 'number') {
      spinBtn.disabled = (data.today_remaining <= 0) || hasLocalSpinLock();
    }
  } catch { /* sessiz */ }
}

function renderLeaderboard(items = []) {
  if (!lbEl) return;
  if (!Array.isArray(items) || !items.length) {
    lbEl.innerHTML = '<li>Henüz kimse yok</li>';
    return;
  }
  lbEl.innerHTML = items.map((it, i) =>
    `<li><strong>${i+1}.</strong> @${it.username} — ${it.points ?? 0} puan (spin: ${it.total_spins ?? 0})</li>`
  ).join('');
}

async function refreshLeaderboard() {
  if (!lbEl) return;
  try {
    const EDGE_BASE = requiredWindowVar('EDGE_BASE');
    const ANON_KEY  = requiredWindowVar('SUPABASE_ANON_KEY');
    // *** Backend: GET /spin?leaderboard=1&top=10 ***
    const resp = await fetch(`${EDGE_BASE}/spin?leaderboard=1&top=10`, {
      headers: { Authorization: `Bearer ${ANON_KEY}` }
    });
    if (!resp.ok) return;
    const data = await resp.json(); // { ok, leaderboard: [...] }
    if (data?.ok) renderLeaderboard(data.leaderboard || data.items || []);
  } catch { /* sessiz */ }
}

/* ================== Spin flow ================== */
spinBtn?.addEventListener('click', async () => {
  const u = getUsername();
  if (!u) { loginModal?.showModal(); return; }
  if (isSpinning) return;

  try {
    requiredWindowVar('SUPABASE_URL');
    requiredWindowVar('SUPABASE_ANON_KEY');
    requiredWindowVar('EDGE_BASE');
  } catch (e) { showError(e.message); return; }

  if (hasLocalSpinLock()) {
    showError("Bugünkü hakkını kullandın.");
    spinBtn.disabled = true;
    return;
  }

  isSpinning = true;
  spinBtn.disabled = true;

  try {
    const data = await callSpin(u);

    updateProfileUI(data.user, data.stats, data.today_remaining);

    const idx = pickIndexForResult(data.result.key);
    Wheel.spinWheelToIndex(wheelCanvas, idx, async () => {
      popupTitle.textContent = "Sonuç";
      popupMsg.textContent   = "Kazandın: " + Wheel.WHEEL_SEGMENTS[idx].label;
      popup.showModal();

      await refreshProfile();
      await refreshLeaderboard();

      if (!data.today_remaining || data.today_remaining <= 0) {
        setLocalSpinLock();
        spinBtn.disabled = true;
      } else {
        spinBtn.disabled = false; // extra spin varsa açık kalsın
      }
      isSpinning = false;
    });

  } catch (err) {
    console.error("Spin hatası:", err);
    showError(String(err?.message || err));
    isSpinning = false;
    if (!hasLocalSpinLock()) spinBtn.disabled = false;
  }
});

/* ================== İlk yüklemede çek ================== */
refreshAuthUI();
refreshProfile();
refreshLeaderboard();
