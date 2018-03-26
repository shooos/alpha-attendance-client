const requestParams = {};
location.search.substr(1).split('&').forEach((e) => {
  const e_ = e.split('=');
  requestParams[e_[0]] = e_[1];
});

chrome.runtime.sendMessage({
  action: 'getWorkPattern',
  values: {
    id: requestParams.servTypeId
  },
}, (response) => {
  console.log('callback');
  const registerButton = document.createElement('div');
  registerButton.classList.add('alpha-attendance-button-register');

  if (response.data && response.data.length) {
    registerButton.textContent = 'Update';
  } else {
    registerButton.textContent = 'Register';
  }

  const titleElement = document.getElementsByClassName('name')[0];
  titleElement.appendChild(registerButton);
});
