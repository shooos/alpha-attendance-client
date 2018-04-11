const elements = {
  user: document.getElementById('user'),
  password: document.getElementById('password'),
  displayPassword: document.getElementById('display-password'),
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
  elements.user.value = args.user || '';
  elements.message.value = args.message || '';
  elements.password.value = args.rawPassword || '';

  if (args.status !== 'Requesting') {
    elements.password.parentNode.classList.add('hidden');
    elements.btnChangePassword.classList.add('hidden');
    elements.btnRegister.classList.add('hidden');
    elements.btnLogin.classList.add('hidden');
    elements.message.classList.remove('error');
  }

  if (!args.status) return;

  switch (args.status) {
  case 'Success':
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
  elements.password.parentNode.classList.remove('hidden');
    elements.btnChangePassword.classList.remove('hidden');
    elements.btnRegister.classList.remove('hidden');
    elements.message.classList.add('error');
    popupBadge.setError();
    break;
  case 'LoginFailed':
  case 'AuthenticationError':
  case 'AuthorizationRequired':
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
  const items = await getChromeStorage('local', ['user', 'status', 'message', 'rawPassword']);
  render(items);
});

// 初期表示処理
getChromeStorage('local', ['user', 'status', 'message', 'rawPassword'])
.then((items) => {
  render(items);
});

/* リクエストを開始する */
const beginRequest = async () => {
  indicator.show();
  await setChromeStorage('local', {
    message: 'Now requesting...',
    status: 'Requesting',
  });
}

/* ダイアログを開く */
const dialog = async (dialogId) => {
  const dialog = document.getElementById(dialogId);
  dialog.classList.add('opened');

  return new Promise((resolve, reject) => {
    dialog.addEventListener('click', (e) => {
      const t = e.target;
      if (t.classList.contains('dialog-button-cancel')) {
        reject();
      } else if (t.classList.contains('dialog-button-done')) {
        resolve();
      }
    });
  })
}

/* ユーザ登録 */
let registerRequesting = false;
elements.btnRegister.addEventListener('mousedown', async (e) => {
  if (registerRequesting) return;
  registerRequesting = true;
  await beginRequest();

  const user = elements.user.value;
  const utf8arr = CryptoJS.enc.Utf8.parse(elements.password.value);
  const hash = CryptoJS.SHA256(utf8arr);
  const passwordHash = CryptoJS.enc.Base64.stringify(hash);

  const response = await runtimeSendMessage({
    action: 'registerUser',
    values: {
      id: user,
      password: passwordHash,
    },
  });

  await setChromeStorage('local', response);
  indicator.hide();
  registerRequesting = false;
});

/* パスワード変更 */
let changePasswordRequesting = false;
elements.btnChangePassword.addEventListener('mousedown', async (e) => {

  await dialog('change-password-dialog')
  .catch((err) => {
    throw err;
  });

  if (changePasswordRequesting) return;
  changePasswordRequesting = true;
  await beginRequest();

  const user = elements.user.value;
  const utf8arr = CryptoJS.enc.Utf8.parse(elements.password.value);
  const hash = CryptoJS.SHA256(utf8arr);
  const passwordHash = CryptoJS.enc.Base64.stringify(hash);

  const response = await runtimeSendMessage({
    action: 'changePassword',
    values: {
      id: user,
      password: passwordHash,
    },
  });

  await setChromeStorage('local', response);
  indicator.hide();
  changePasswordRequesting = false;
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

  await setChromeStorage('local', response);
  indicator.hide();
  loginRequesting = false;
});

elements.displayPassword.addEventListener('mousedown', (e) => {
  elements.password.setAttribute('type', 'text');
});

elements.displayPassword.addEventListener('mouseup', (e) => {
  elements.password.setAttribute('type', 'password');
});

elements.displayPassword.addEventListener('mouseleave', (e) => {
  elements.password.setAttribute('type', 'password');
});
