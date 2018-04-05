const elements = {
  status: document.getElementById('status'),
  user: document.getElementById('user'),
  message: document.getElementById('message'),
  btnLogin: document.getElementById('btn-login'),
  btnRegister: document.getElementById('btn-register'),
  btnChangePassword: document.getElementById('btn-change-password'),
};

// chrome.storage.%area%.get を promise で包んだもの
const getChromeStorage = async (area, keys) => {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage[area].get(keys, (items) => {
        resolve(items);
      });
    } catch (err) {
      reject(err);
    }
  });
}

// chrome.storage.%area%.set を promise で包んだもの
const setChromeStorage = async (area, items) => {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage[area].set(items, () => {
        resolve();
      });
    } catch (err) {
      reject(err);
    }
  });
}

// chrome.runtime.sendMessage を promise で包んだもの
const runtimeSendMessage = async (message) => {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        resolve(response);
      });
    } catch (err) {
      reject(err);
    }
  });
}

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
popupBadge.setRequesting = () => {
  chrome.browserAction.setBadgeBackgroundColor({color: [0, 0, 200, 10]});
  chrome.browserAction.setBadgeText({text: '🔃'});
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
  elements.status.value = args.status || '';
  elements.user.value = args.user || '';
  elements.message.value = args.message || '';

  if (args.status !== 'Requesting') {
    elements.btnChangePassword.classList.add('hidden');
    elements.btnRegister.classList.add('hidden');
    elements.btnLogin.classList.add('hidden');
    elements.message.classList.remove('error');
  }

  if (!args.status) return;

  switch (args.status) {
  case 'Success':
  case 'AlreadyLoginError':
  case 'LoggedIn':
    popupBadge.setSuccess();
    break;
  case 'Requesting':
    popupBadge.setRequesting();
    break;
  case 'Error':
    elements.message.classList.add('error');
    popupBadge.setError();
    break;
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
  default:
    elements.message.classList.add('error');
    popupBadge.setError();
  }
}

// ストレージの変更監視
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== 'local') return;
  const items = await getChromeStorage('local', ['user', 'status', 'message']);
  render(items);
});

// 初期表示処理
getChromeStorage('local', ['user', 'status', 'message'])
.then((items) => {
  render(items);
});

const beginRequest = async () => {
  indicator.show();
  await setChromeStorage('local', {
    message: 'Now requesting...',
    status: 'Requesting',
  });
}

/* ユーザ登録 */
let registerRequesting = false;
elements.btnRegister.addEventListener('mousedown', async (e) => {
  if (registerRequesting) return;
  registerRequesting = true;
  await beginRequest();

  const items = await getChromeStorage('local', ['user', 'password']);
  const response = await runtimeSendMessage({
    action: 'registerUser',
    values: {
      id: items.user,
      password: items.password,
    },
  });
  registerRequesting = false;
  await setChromeStorage('local', response);
  indicator.hide();
});

/* ログイン */
let loginRequesting = false;
elements.btnLogin.addEventListener('mousedown', async (e) => {
  if (loginRequesting) return;
  loginRequesting = true;
  await beginRequest();

  const items = await getChromeStorage('local', ['user', 'password']);
  const response = await runtimeSendMessage({
    action: 'login',
    values: {
      id: items.user,
      password: items.password,
    },
  });
  loginRequesting = false;
  await setChromeStorage('local', response);
  indicator.hide();
});
