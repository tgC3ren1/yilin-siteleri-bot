const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const usernameLabel = document.getElementById('usernameLabel');
const loginModal = document.getElementById('loginModal');
const usernameInput = document.getElementById('usernameInput');
const confirmLogin = document.getElementById('confirmLogin');

const spinBtn = document.getElementById('spinBtn');
const wheelCanvas = document.getElementById('wheelCanvas');
Wheel.drawWheel(wheelCanvas);

const popup = document.getElementById('popup');
const popupTitle = document.getElementById('popupTitle');
const popupMsg = document.getElementById('popupMsg');
const popupClose = document.getElementById('popupClose');

function getUsername() { return localStorage.getItem('username'); }
function setUsername(u) { localStorage.setItem('username', u); }
function clearSession() { localStorage.removeItem('username'); }

function refreshAuthUI() {
  const u = getUsername();
  if (!u) {
    loginBtn.classList.remove('hidden');
    userInfo.classList.add('hidden');
  } else {
    loginBtn.classList.add('hidden');
    userInfo.classList.remove('hidden');
    usernameLabel.textContent = '@' + u;
  }
}

loginBtn.addEventListener('click', () => loginModal.showModal());
confirmLogin.addEventListener('click', (e) => {
  e.preventDefault();
  const raw = usernameInput.value.trim().replace(/^@/,'');
  if (raw) { setUsername(raw); refreshAuthUI(); }
  loginModal.close();
});
logoutBtn.addEventListener('click', () => { clearSession(); refreshAuthUI(); });

popupClose.addEventListener('click', () => popup.close());

spinBtn.addEventListener('click', async () => {
  const u = getUsername();
  if (!u) { loginModal.showModal(); return; }
  spinBtn.disabled = true;

  // Normalde backend çağrılır. Şimdilik demo sonucu:
  const idx = Math.floor(Math.random()*Wheel.WHEEL_SEGMENTS.length);
  Wheel.spinWheelToIndex(wheelCanvas, idx, () => {
    popupTitle.textContent = "Sonuç";
    popupMsg.textContent = "Kazandın: " + Wheel.WHEEL_SEGMENTS[idx].label;
    popup.showModal();
    spinBtn.disabled = false;
  });
});

refreshAuthUI();
