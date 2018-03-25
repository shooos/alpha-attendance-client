const elements = {
  user: document.getElementById('user'),
  message: document.getElementById('message'),
  btnRegister: document.getElementById('btn-register'),
  btnChangePassword: document.getElementById('btn-change-password'),
};

chrome.storage.local.get(['user', 'status', 'message'], (items) => {
  elements.user.value = items.user;
  elements.message.value = items.message || 'No Message';

  switch (items.status) {
  case 'MemberNotFoundError':
    elements.btnChangePassword.classList.remove('hidden');
    elements.btnRegister.classList.remove('hidden');
    break;
  default:
    elements.btnChangePassword.classList.add('hidden');
    elements.btnRegister.classList.add('hidden');
    break;
  }
});

let registerRequesting = false;
/* ユーザ登録 */
elements.btnRegister.addEventListener('mousedown', (e) => {
  if (registerRequesting) return;
  registerRequesting = true;

  chrome.storage.local.get(['user', 'password'], (items) => {
    chrome.runtime.sendMessage({
      action: 'registerUser',
      value: {
        user: items.user,
        password: items.password,
      },
    }, (response) => {
      registerRequesting = false;
      if (!response.error) {
        elements.btnRegister.classList.remove('hidden');
      }
    });
  });
});
