chrome.storage.local.get(['user', 'status', 'message'], (result) => {
  console.log(result);
  document.getElementById('user').value = result.user;
  document.getElementById('message').value = result.message || 'No Message';
});
