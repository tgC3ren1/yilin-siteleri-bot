// ================== Auth / UI ==================
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const usernameLabel = document.getElementById('usernameLabel');
const loginModal = document.getElementById('loginModal');
const usernameInput = document.getElementById('usernameInput');
const confirmLogin = document.getElementById('confirmLogin');

// ================== Wheel ==================
const spinBtn = document.getElementById('spinBtn');
const wheelCanvas = document.getElementById('wheelCanvas');
Wheel.drawWheel(wheelCanvas);

// Kontroller
const speedSelect = document.getElementById('speedSelect');
const tickSoundChk = document.getElementById('tickSoundChk');
const flashChk = document.getElementById('flashChk');

// Varsayılanları aktar
Wheel.setOptions({
  speed: speedSelect?.value || 'normal',
  tick: !!tickSoundChk?.checked,
  flash: !!flashChk?.checked
});

// Değişiklikleri dinle
speedSelect?.addEventListener('change', () =>
  Wheel.setOptions({ speed: speedSelect.value })
);
tickSoundChk?.addEventListener('change', () =>
  Wheel.setOptions({ tick: tickSoundChk.checked })
);
flashChk?.addEventListener('change', () =>
  Wheel.setOptions({ flash: flashChk.checked })
);

// Popup
const popup = document.getElementById('popup');
const popupTitle = document.getElementById('popupTitle');
const popupMsg = document.getElementById('popupMsg');
const popupClose = document.getElementById('popupClose');
popupClose?.addEventListener('click', () => popup.close());

// ================== Local auth helpers ==================
function getUsername() { return localStorage.getItem('username'); }
function setUsername(u) { localStorage.setItem('username', u); }
function clearSession() { localStorage.removeItem('username'); }

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
}

loginBtn?.addEventListener('click', () => loginModal?.showModal());
confirmLogin?.addEventListener('click', (e) => {
  e.preventDefault();
  const raw = (usernameInput?.value || '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase(); // biraz normalize edelim
  if (raw) { setUsername(raw); refreshAuthUI(); }
  loginModal?.close();
});
logoutBtn?.addEventListener('click', () => { clearSession(); refreshAuthUI(); });

// ================== Yardımcılar ==================
function showError(msg) {
  popupTitle.textContent = "Hata";
  popupMsg.textContent = msg;
  popup.showModal();
}

function requiredWindowVar(name) {
  const val = window[name];
  if (!val || typeof val !== 'string' || !val.trim()) {
    throw new Error(`${name} tanımlı değil (supabaseClient.js dosyasını kontrol et).`);
  }
  return val;
}

// Edge function çağrısında zaman aşımı ve iyi hata mesajları
async function callSpin(username) {
  const EDGE_BASE = requiredWindowVar('EDGE_BASE');            // …/functions/v1  (sonunda / YOK)
  const ANON_KEY  = requiredWindowVar('SUPABASE_ANON_KEY');

  const url = `${EDGE_BASE}/spin`;

  // 12 sn timeout
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 12000);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANON_KEY}`,   // 🔒 zorunlu
      },
      body: JSON.stringify({ username }),
      signal: ac.signal
    });

    const text = await resp.text(); // her durumda loglayabilelim
    if (!resp.ok) {
      // 401/403 gibi durumlar için anlaşılır mesaj
      if (resp.status === 401 || resp.status === 403) {
        throw new Error(`Yetkilendirme reddedildi (HTTP ${resp.status}). \
Authorization header ve anon key doğru mu? Yanıt: ${text}`);
      }
      throw new Error(`Spin isteği başarısız (HTTP ${resp.status}): ${text}`);
    }

    let data;
    try { data = JSON.parse(text); } catch {
      throw new Error(`Geçersiz JSON yanıtı: ${text}`);
    }

    // Beklenen şema
    if (!data?.ok || !data?.result?.key) {
      throw new Error(`Eksik/yanlış yanıt: ${text}`);
    }

    return data;
  } finally {
    clearTimeout(t);
  }
}

// result.key -> doğru dilimin index'i
function pickIndexForResult(resultKey) {
  // Wheel.WHEEL_SEGMENTS: [{ key: 'points_10', label: '+10', color: ... }, ...]
  const matches = Wheel.WHEEL_SEGMENTS
    .map((seg, i) => [seg.key, i])
    .filter(([k]) => k === resultKey)
    .map(([_, i]) => i);

  // Hiç eşleşme yoksa 0'a dön (fallback)
  if (!matches.length) return 0;

  // Aynı tipten birden fazla dilim varsa rastgele birini seç
  return matches[Math.floor(Math.random() * matches.length)];
}

// ================== Spin flow ==================
spinBtn?.addEventListener('click', async () => {
  const u = getUsername();
  if (!u) { loginModal?.showModal(); return; }

  try {
    // supabaseClient.js yüklenmiş mi?
    requiredWindowVar('SUPABASE_URL');
    requiredWindowVar('SUPABASE_ANON_KEY');
    requiredWindowVar('EDGE_BASE');
  } catch (e) {
    showError(e.message);
    return;
  }

  spinBtn.disabled = true;

  try {
    const data = await callSpin(u);

    const idx = pickIndexForResult(data.result.key);
    Wheel.spinWheelToIndex(wheelCanvas, idx, () => {
      popupTitle.textContent = "Sonuç";
      popupMsg.textContent = "Kazandın: " + Wheel.WHEEL_SEGMENTS[idx].label;
      popup.showModal();
      spinBtn.disabled = false;
    });
  } catch (err) {
    console.error("Spin hatası:", err);
    showError(String(err?.message || err));
    spinBtn.disabled = false;
  }
});

refreshAuthUI();
