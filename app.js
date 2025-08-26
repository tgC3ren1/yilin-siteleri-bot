// ================== Auth / UI ==================
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const usernameLabel = document.getElementById('usernameLabel');
const loginModal = document.getElementById('loginModal');
const usernameInput = document.getElementById('usernameInput');
const confirmLogin = document.getElementById('confirmLogin');

// Profil göstergeleri
const todayStatusEl = document.getElementById('todayStatus');
const totalSpinsEl  = document.getElementById('totalSpins');
const myPointsEl    = document.getElementById('myPoints');
const totalCounterEl= document.getElementById('totalCounter');

// ================== Wheel ==================
const spinBtn = document.getElementById('spinBtn');
const wheelCanvas = document.getElementById('wheelCanvas');
Wheel.drawWheel(wheelCanvas);

// Kontroller
const speedSelect  = document.getElementById('speedSelect');
const tickSoundChk = document.getElementById('tickSoundChk');
const flashChk     = document.getElementById('flashChk');

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
const popupMsg   = document.getElementById('popupMsg');
const popupClose = document.getElementById('popupClose');
popupClose?.addEventListener('click', () => popup.close());

// ================== Local auth helpers ==================
function getUsername() { return localStorage.getItem('username'); }
function setUsername(u) { localStorage.setItem('username', u); }
function clearSession() { localStorage.removeItem('username'); }

function todayKey() {
  // YYYY-MM-DD
  const d = new Date();
  return d.toISOString().slice(0,10);
}
function setLocalSpinLock() {
  localStorage.setItem(`spun_${todayKey()}`, '1');
}
function hasLocalSpinLock() {
  return localStorage.getItem(`spun_${todayKey()}`) === '1';
}

function updateProfileUI(user = {}, stats = {}, today_remaining = undefined) {
  if (typeof today_remaining === 'number') {
    if (today_remaining > 0) {
      todayStatusEl && (todayStatusEl.textContent = `✔ (${today_remaining} hak)`);
    } else {
      todayStatusEl && (todayStatusEl.textContent = '—');
    }
  }
  if (typeof user.total_spins === 'number') {
    totalSpinsEl && (totalSpinsEl.textContent = user.total_spins);
  }
  if (typeof user.points === 'number') {
    myPointsEl && (myPointsEl.textContent = user.points);
  }
  if (typeof stats.total_spins === 'number') {
    totalCounterEl && (totalCounterEl.textContent = stats.total_spins);
  }
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
  // Yerel kilit varsa butonu kapat (backend yine de kesin kurala bakacak)
  if (hasLocalSpinLock()) {
    spinBtn.disabled = true;
  }
}

loginBtn?.addEventListener('click', () => loginModal?.showModal());
confirmLogin?.addEventListener('click', (e) => {
  e.preventDefault();
  const raw = (usernameInput?.value || '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase();
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

let isSpinning = false;

async function callSpin(username) {
  const EDGE_BASE = requiredWindowVar('EDGE_BASE');            // …/functions/v1 (sonunda / yok)
  const ANON_KEY  = requiredWindowVar('SUPABASE_ANON_KEY');
  const url = `${EDGE_BASE}/spin`;

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 12000);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ username }),
      signal: ac.signal
    });

    const text = await resp.text();
    if (!resp.ok) {
      if (resp.status === 403) {
        // Backend döndürdüyse bugün hakkı yok
        try {
          const d = JSON.parse(text);
          if (d?.reason === 'DAILY_LIMIT') {
            // Yerel kilidi de bas
            setLocalSpinLock();
            updateProfileUI(d.user, d.stats, 0);
            throw new Error("Bugünkü hakkını kullandın.");
          }
        } catch {}
      }
      throw new Error(`Spin isteği başarısız (HTTP ${resp.status}): ${text}`);
    }

    let data;
    try { data = JSON.parse(text); } catch {
      throw new Error(`Geçersiz JSON yanıtı: ${text}`);
    }
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
  const matches = Wheel.WHEEL_SEGMENTS
    .map((seg, i) => [seg.key, i])
    .filter(([k]) => k === resultKey)
    .map(([_, i]) => i);

  if (!matches.length) return 0;
  return matches[Math.floor(Math.random() * matches.length)];
}

// ================== Spin flow ==================
spinBtn?.addEventListener('click', async () => {
  const u = getUsername();
  if (!u) { loginModal?.showModal(); return; }
  if (isSpinning) return;

  try {
    requiredWindowVar('SUPABASE_URL');
    requiredWindowVar('SUPABASE_ANON_KEY');
    requiredWindowVar('EDGE_BASE');
  } catch (e) {
    showError(e.message);
    return;
  }

  // Yerel kilit varsa direkt engelle
  if (hasLocalSpinLock()) {
    showError("Bugünkü hakkını kullandın.");
    spinBtn.disabled = true;
    return;
  }

  isSpinning = true;
  spinBtn.disabled = true;

  try {
    const data = await callSpin(u);

    // Profil/istatistikleri anında güncelle
    updateProfileUI(data.user, data.stats, data.today_remaining);

    const idx = pickIndexForResult(data.result.key);
    Wheel.spinWheelToIndex(wheelCanvas, idx, () => {
      popupTitle.textContent = "Sonuç";
      popupMsg.textContent = "Kazandın: " + Wheel.WHEEL_SEGMENTS[idx].label;
      popup.showModal();

      // Bugünkü hak bitti ise yerel kilidi bas & butonu kapat
      if (!data.today_remaining || data.today_remaining <= 0) {
        setLocalSpinLock();
        spinBtn.disabled = true;
      } else {
        // Ekstra spin varsa buton açık kalsın
        spinBtn.disabled = false;
      }
      isSpinning = false;
    });

  } catch (err) {
    console.error("Spin hatası:", err);
    showError(String(err?.message || err));
    isSpinning = false;

    // Eğer hata limitten geldiyse buton kilitli kalsın
    if (!hasLocalSpinLock()) spinBtn.disabled = false;
  }
});

refreshAuthUI();
