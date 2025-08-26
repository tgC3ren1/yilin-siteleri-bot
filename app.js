/* ========= Config from supabaseClient.js =========
   window.SUPABASE_URL
   window.SUPABASE_ANON_KEY
   window.EDGE_BASE
==================================================*/

/* ====== UI refs ====== */
const openRegister  = document.getElementById('openRegister');
const openLogin     = document.getElementById('openLogin');
const registerModal = document.getElementById('registerModal');
const loginModal    = document.getElementById('loginModal');

const loginBtn       = document.getElementById('openLogin'); // eski isimle uyum
const logoutBtn      = document.getElementById('logoutBtn');
const userInfo       = document.getElementById('userInfo');
const usernameLabel  = document.getElementById('usernameLabel');

const todayStatusEl  = document.getElementById('todayStatus');
const totalSpinsEl   = document.getElementById('totalSpins');
const myPointsEl     = document.getElementById('myPoints');
const totalCounterEl = document.getElementById('totalCounter');
const lbEl           = document.getElementById('leaderboardList');

const adminPanel     = document.getElementById('adminPanel');
const admUser        = document.getElementById('admUser');
const admCount       = document.getElementById('admCount');
const admAddUserSpins= document.getElementById('admAddUserSpins');
const admAllCount    = document.getElementById('admAllCount');
const admAddAllSpins = document.getElementById('admAddAllSpins');

/* wheel */
const spinBtn     = document.getElementById('spinBtn');
const wheelCanvas = document.getElementById('wheelCanvas');
if (window.Wheel) Wheel.drawWheel(wheelCanvas);

/* controls */
const speedSelect  = document.getElementById('speedSelect');
const tickSoundChk = document.getElementById('tickSoundChk');
const flashChk     = document.getElementById('flashChk');

window.Wheel?.setOptions({
  speed: speedSelect?.value || 'normal',
  tick : !!tickSoundChk?.checked,
  flash: !!flashChk?.checked
});
speedSelect?.addEventListener('change', () => Wheel.setOptions({ speed: speedSelect.value }));
tickSoundChk?.addEventListener('change', () => Wheel.setOptions({ tick: tickSoundChk.checked }));
flashChk?.addEventListener('change', () => Wheel.setOptions({ flash: flashChk.checked }));

/* popup */
const popup      = document.getElementById('popup');
const popupTitle = document.getElementById('popupTitle');
const popupMsg   = document.getElementById('popupMsg');
document.getElementById('popupClose')?.addEventListener('click', () => popup.close());

/* ====== Local session ====== */
const getToken   = () => localStorage.getItem('session_token');
const setToken   = (t) => localStorage.setItem('session_token', t);
const clearToken = () => localStorage.removeItem('session_token');

function showError(msg) { popupTitle.textContent = "Hata"; popupMsg.textContent = msg; popup.showModal(); }
function required(name){
  const v = window[name];
  if (!v || typeof v !== 'string' || !v.trim()) throw new Error(`${name} tanımlı değil`);
  return v;
}

/* ====== Auth UI ====== */
function refreshAuthUI(profile) {
  const token = getToken();
  if (!token) {
    userInfo.classList.add('hidden');
  } else {
    userInfo.classList.remove('hidden');
    if (profile?.user?.username) usernameLabel.textContent = '@' + profile.user.username;
  }

  // admin panel
  if (profile?.user?.is_admin) adminPanel.classList.remove('hidden');
  else adminPanel.classList.add('hidden');
}

/* ====== Profile UI ====== */
function updateProfileUI(user = {}, stats = {}, today_remaining = undefined) {
  if (typeof today_remaining === 'number')
    todayStatusEl.textContent = today_remaining > 0 ? `✔ (${today_remaining} hak)` : '—';
  if (typeof user.total_spins === 'number') totalSpinsEl.textContent = user.total_spins;
  if (typeof user.points === 'number')      myPointsEl.textContent   = user.points;
  if (typeof stats.total_spins === 'number') totalCounterEl.textContent = stats.total_spins;
}

/* ====== Backend ====== */
async function api(path, { method='GET', body, admin=false } = {}) {
  const EDGE_BASE = required('EDGE_BASE');
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };

  if (token) headers['x-session-token'] = token;
  if (admin) headers['x-admin-key'] = window.ADMIN_API_KEY || ''; // istersen buradan set edebilirsin

  const resp = await fetch(`${EDGE_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await resp.text();
  let data; try { data = JSON.parse(text); } catch { data = null; }
  if (!resp.ok) throw new Error(data?.error || text || `HTTP ${resp.status}`);
  return data;
}

async function loadProfile() {
  try {
    const data = await api('/spin', { method:'GET' });
    updateProfileUI(data.user, data.stats, data.today_remaining);
    refreshAuthUI({ user: data.user });
  } catch (e) {
    // oturum yoksa sessiz
    refreshAuthUI();
  }
}

async function loadLeaderboard() {
  try {
    const data = await api('/spin?leaderboard=1&top=10', { method:'GET' });
    const items = data.leaderboard || [];
    if (!lbEl) return;
    if (!items.length) lbEl.innerHTML = '<li>Henüz kimse yok</li>';
    else lbEl.innerHTML = items.map((it, i) => `<li><strong>${i+1}.</strong> @${it.username} — ${it.points} puan (spin: ${it.total_spins})</li>`).join('');
  } catch {}
}

/* ====== Modals open ====== */
openRegister?.addEventListener('click', () => registerModal.showModal());
openLogin?.addEventListener('click', () => loginModal.showModal());

/* ====== Register ====== */
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('regUsername').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const phone    = document.getElementById('regPhone').value.trim();
  const password = document.getElementById('regPassword').value;

  try {
    const data = await api('/auth/register', { method:'POST', body:{ username, email, phone, password } });
    setToken(data.token);
    registerModal.close();
    await loadProfile();
    await loadLeaderboard();
  } catch (err) { showError(err.message); }
});

/* ====== Login ====== */
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const data = await api('/auth/login', { method:'POST', body:{ username, password } });
    setToken(data.token);
    loginModal.close();
    await loadProfile();
    await loadLeaderboard();
  } catch (err) { showError(err.message); }
});

/* ====== Logout ====== */
logoutBtn?.addEventListener('click', async () => {
  clearToken();
  refreshAuthUI();
  updateProfileUI({points:0,total_spins:0},{total_spins:0}, undefined);
  if (lbEl) lbEl.innerHTML = '';
});

/* ====== Spin ====== */
spinBtn?.addEventListener('click', async () => {
  try {
    const data = await api('/spin', { method:'POST' });
    updateProfileUI(data.user, data.stats, data.today_remaining);

    const idx = pickIndexForResult(data.result.key);
    Wheel.spinWheelToIndex(wheelCanvas, idx, async () => {
      popupTitle.textContent = "Sonuç";
      popupMsg.textContent   = "Kazandın: " + Wheel.WHEEL_SEGMENTS[idx].label;
      popup.showModal();
      await loadProfile();
      await loadLeaderboard();
    });
  } catch (err) { showError(err.message); }
});

function pickIndexForResult(resultKey) {
  const matches = Wheel.WHEEL_SEGMENTS
    .map((seg, i) => [seg.key, i])
    .filter(([k]) => k === resultKey)
    .map(([, i]) => i);
  if (!matches.length) return 0;
  return matches[Math.floor(Math.random()*matches.length)];
}

/* ====== Admin ====== */
admAddUserSpins?.addEventListener('click', async () => {
  try {
    const username = (admUser.value || '').trim();
    const amount   = Number(admCount.value || 0);
    if (!username || !Number.isFinite(amount)) throw new Error("Kullanıcı ve sayı gerekli");
    await api('/admin/add-spins', { method:'POST', body:{ username, amount }, admin:true });
    await loadProfile();
    alert('Eklendi');
  } catch (err) { showError(err.message); }
});
admAddAllSpins?.addEventListener('click', async () => {
  try {
    const amount = Number(admAllCount.value || 0);
    if (!Number.isFinite(amount)) throw new Error("Sayı gerekli");
    await api('/admin/add-spins-all', { method:'POST', body:{ amount }, admin:true });
    await loadProfile();
    alert('Herkese eklendi');
  } catch (err) { showError(err.message); }
});

/* ====== İlk yükleme ====== */
loadProfile();
loadLeaderboard();
