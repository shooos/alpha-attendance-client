const elements = {
  user: document.getElementById('user'),
  message: document.getElementById('message'),
  btnLogin: document.getElementById('btn-login'),
  btnRegister: document.getElementById('btn-register'),
  btnChangePassword: document.getElementById('btn-change-password'),
};

chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log(changes, areaName);
});

chrome.storage.local.get(['user', 'status', 'message'], (items) => {
  elements.user.value = items.user || '';
  elements.message.value = items.message || 'No Message';

  switch (items.status) {
  case 'MemberNotFoundError':
    elements.btnChangePassword.classList.remove('hidden');
    elements.btnRegister.classList.remove('hidden');
    elements.message.classList.add('error');
    break;
  case 'LoginFailed':
    elements.btnLogin.classList.remove('hidden');
    elements.message.classList.add('error');
    break;
  case 'Error':
    elements.message.classList.add('error');
    break;
  default:
    elements.message.classList.remove('error');
    break;
  }
});

/* ユーザ登録 */
let registerRequesting = false;
elements.btnRegister.addEventListener('mousedown', (e) => {
  if (registerRequesting) return;
  registerRequesting = true;

  chrome.storage.local.get(['user', 'password'], (items) => {
    chrome.runtime.sendMessage({
      action: 'registerUser',
      values: {
        id: items.user,
        password: items.password,
      },
    });
  });
});

/* ログイン */
let loginRequesting = false;
elements.btnLogin.addEventListener('mousedown', (e) => {
  if (loginRequesting) return;
  loginRequesting = true;

  chrome.storage.local.get(['user', 'password'], (items) => {
    chrome.runtime.sendMessage({
      action: 'login',
      values: {
        id: items.user,
        password: items.password,
      },
    });
  });
});