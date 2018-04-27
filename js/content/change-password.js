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

const Indicator = function () {
  this.loader = document.createElement('div');
  this.loader.classList.add('alpha-attendance-loader');

  this.indicator = document.createElement('div');
  this.indicator.classList.add('alpha-attendance-indicator');
  this.indicator.classList.add('hidden');
  this.indicator.appendChild(this.loader);

  let body = document.body;
  if (body.tagName === 'FRAMESET') {
    body = document.getElementsByTagName('html')[0];
  }
  body.appendChild(this.indicator);
}
Indicator.prototype.show = function () {
  this.indicator.classList.remove('hidden');
}
Indicator.prototype.hide = function () {
  this.indicator.classList.add('hidden');
}

const toSHA256 = (str) => {
  const utf8arr = CryptoJS.enc.Utf8.parse(str);
  const hash = CryptoJS.SHA256(utf8arr);
  const base64 = CryptoJS.enc.Base64.stringify(hash);

  return base64;
}

const form = document.forms['changePasswordForm'];
const submitButton = form['changePasswordForm-j_idt32'];
const indicator = new Indicator();
let eventPrevent = true;

const next = () => {
  eventPrevent = false;
  indicator.hide();
  submitButton.click();
}

form.addEventListener('submit', async (e) => {
  if (!eventPrevent) return;
  e.preventDefault();

  indicator.show();

  const form = e.target;
  const user = form['changePasswordForm-userId'].value;
  const oldPassword = toSHA256(form['changePasswordForm-oldPassword'].value);
  const newPassword = toSHA256(form['changePasswordForm-newPassword'].value);

  const items = await getChromeStorage('local', ['user']);
  if (items.user !== user) return next();

  const response = await runtimeSendMessage({
    action: 'changePassword',
    values: {
      id: user,
      oldInfo: {password: oldPassword},
      newInfo: {password: newPassword}
    },
  });

  await setChromeStorage('local', response);
  return next();
});
