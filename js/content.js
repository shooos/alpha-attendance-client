const funcs = {};

funcs.loginForm = (form) => {
  const elements = form.elements;
  let userIDForm, passwordForm;

  for (let element of elements) {
    const type = element.type;

    if (type === 'submit') {
      element.addEventListener('mousedown', () => {
        const utf8arr = CryptoJS.enc.Utf8.parse(passwordForm.value);
        const hash = CryptoJS.SHA256(utf8arr);
        const passwordHash = CryptoJS.enc.Base64.stringify(hash);

        chrome.runtime.sendMessage({
          action: 'login',
          values: {
            id: userIDForm.value,
            password: passwordHash,
          },
        });
      });
    }
    if (type === 'text') {
      userIDForm = element;
    }
    if (type === 'password') {
      passwordForm = element;
    }
  }
}

funcs.mainContent = (view) => {
  view.onload = () => {
    console.log('onload');
  }
}

const form = document.forms['login/loginForm'];
const mainView = parent.view;

if (form) {
  funcs.loginForm(form);
} else if (mainView) {
  funcs.mainContent(mainView);
}
