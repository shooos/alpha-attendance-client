const funcs = {};

funcs.loginForm = (form) => {
  const elements = form.elements;
  let userIDForm, passwordForm;

  for (let element of elements) {
    const type = element.type;

    if (type === 'submit') {
      element.addEventListener('mousedown', () => {
        chrome.runtime.sendMessage({
          action: 'login',
          values: {
            id: userIDForm.value,
            password: passwordForm.value,
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

funcs.mainContent = (frame) => {

}

const form = document.forms['login/loginForm'];
const contentFrame = document.getElementById('contentFrame');

if (form) {
  funcs.loginForm(form);
} else if (contentFrame) {
  funcs.mainContent(contentFrame);
}
