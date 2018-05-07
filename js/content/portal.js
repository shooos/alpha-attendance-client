let retryCount = 100;
const intervalId = setInterval(() => {
  retryCount--;
  if (!retryCount) clearInterval(intervalId);

  const userElement = document.querySelector('span#info_0_user');

  if (userElement) {
    clearInterval(intervalId);
    const user = userElement.textContent;

    runtimeSendMessage({
      action: 'signIn',
      values: {id: user},
    }).then((response) => {
      if (response.error) {
        setChromeStorage('local', {user: null, status: STATUS.UNAUTHENTICATED});
      } else if (response.data) {
        response.data.status = '';
        setChromeStorage('local', response.data);
      }
    });
  } else {
    setChromeStorage('local', {user: null, status: STATUS.UNAUTHENTICATED});
  }
}, 100);
