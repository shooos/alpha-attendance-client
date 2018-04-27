const userElement = document.getElementById('info_0_user');

if (userElement) {
  const user = userElement.textContent;
  runtimeSendMessage({
    action: 'signIn',
    values: {id: user},
  }).then((response) => {
    setChromeStorage('local', response);
  });
} else {
  setChromeStorage('local', {user: null, status: STATUS.UNAUTHENTICATED});
}
