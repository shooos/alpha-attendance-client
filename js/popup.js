const elements = {
  user: document.getElementById('user'),
  message: document.getElementById('message'),
  btnLogin: document.getElementById('btn-login'),
  btnRegister: document.getElementById('btn-register'),
  btnChangePassword: document.getElementById('btn-change-password'),
};

// 画面描画処理
const render = (args) => {
  console.log('render: ', args);
  elements.user.value = args.user || '';
  elements.message.value = args.message || '';

  switch (args.status) {
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
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log('changed: ', changes, areaName);
  render(changes);
});

// 初期表示処理
chrome.storage.local.get(['user', 'status', 'message'], (items) => {
  console.log(items);
  render(items);
});

const beginRequest = () => {
  chrome.storage.local.set({
    message: 'Now requesting...',
    status: 'Requesting',
  });
}

/* ユーザ登録 */
let registerRequesting = false;
elements.btnRegister.addEventListener('mousedown', (e) => {
  if (registerRequesting) return;
  registerRequesting = true;
  beginRequest();

  chrome.storage.local.get(['user', 'password'], (items) => {
    chrome.runtime.sendMessage({
      action: 'registerUser',
      values: {
        id: items.user,
        password: items.password,
      },
    }, (response) => {
      console.log('response: ', response);
      registerRequesting = false;
      chrome.storage.local.set(response);
    });
  });
});

/* ログイン */
let loginRequesting = false;
elements.btnLogin.addEventListener('mousedown', (e) => {
  if (loginRequesting) return;
  loginRequesting = true;
  beginRequest();

  chrome.storage.local.get(['user', 'password'], (items) => {
    chrome.runtime.sendMessage({
      action: 'login',
      values: {
        id: items.user,
        password: items.password,
      },
    }, (response) => {
      console.log('response: ', response);
      loginRequesting = false;
      chrome.storage.local.set(response);
    });
  });
});