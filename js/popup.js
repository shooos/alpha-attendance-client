const elements = {
  user: document.getElementById('user'),
  message: document.getElementById('message'),
  btnLogin: document.getElementById('btn-login'),
  btnRegister: document.getElementById('btn-register'),
  btnChangePassword: document.getElementById('btn-change-password'),
};

// Badge
const popupBadge = {};
popupBadge.setError = () => {
  chrome.browserAction.setBadgeBackgroundColor({color: [200, 0, 0, 10]});
  chrome.browserAction.setBadgeText({text: '⚡'});
}
popupBadge.setSuccess = () => {
  chrome.browserAction.setBadgeBackgroundColor({color: [0, 200, 0, 10]});
  chrome.browserAction.setBadgeText({text: '👍'});
}

// インジケータ
const Indicator = function () {
  this.loader = document.createElement('div');
  this.loader.classList.add('alpha-attendance-loader');

  this.indicator = document.createElement('div');
  this.indicator.classList.add('alpha-attendance-indicator');
  this.indicator.classList.add('hidden');
  this.indicator.appendChild(this.loader);

  document.body.appendChild(this.indicator);
}
Indicator.prototype.show = function () {
  this.indicator.classList.remove('hidden');
}
Indicator.prototype.hide = function () {
  this.indicator.classList.add('hidden');
}
const indicator = new Indicator();

// 画面描画処理
const render = (args) => {
  elements.user.value = args.user || '';
  elements.message.value = args.message || '';

  switch (args.status) {
  case 'MemberNotFoundError':
    elements.btnChangePassword.classList.remove('hidden');
    elements.btnRegister.classList.remove('hidden');
    elements.message.classList.add('error');
    popupBadge.setError();
    break;
  case 'LoginFailed':
    elements.btnLogin.classList.remove('hidden');
    elements.message.classList.add('error');
    popupBadge.setError();
    break;
  case 'Error':
    elements.message.classList.add('error');
    popupBadge.setError();
    break;
  default:
    elements.message.classList.remove('error');
    popupBadge.setSuccess();
    break;
  }
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;

  chrome.storage.local.get(['user', 'status', 'message'], (items) => {
    render(items);
  });
});

// 初期表示処理
chrome.storage.local.get(['user', 'status', 'message'], (items) => {
  render(items);
});

const beginRequest = () => {
  indicator.show();
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
      chrome.storage.local.set(response, () => {
        indicator.hide();
      });
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
      chrome.storage.local.set(response, () => {
        indicator.hide();
      });
    });
  });
});