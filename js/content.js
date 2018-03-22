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

funcs.mainContent = (view, menu) => {
  view.frameElement.addEventListener('load', (e) => {
    const title = e.target.contentWindow.document.title;
    if (title.startsWith('勤務表')) {
      console.log('勤務表');
    }
  });
}

const form = document.forms['login/loginForm'];
const mainFrame = parent.view;
const menuFrame = parent.menu;

if (form) {
  funcs.loginForm(form);
} else if (mainFrame && menuFrame) {
  funcs.mainContent(mainFrame, menuFrame);
}
