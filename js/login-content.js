const form = document.forms[0];
if (form != null) {
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
