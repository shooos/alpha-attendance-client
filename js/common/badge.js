window.popupBadge = {};

popupBadge.setError = () => {
  chrome.browserAction.setBadgeBackgroundColor({color: [200, 0, 0, 10]});
  chrome.browserAction.setBadgeText({text: '⚡'});
}

popupBadge.setSuccess = () => {
  chrome.browserAction.setBadgeBackgroundColor({color: [0, 200, 0, 10]});
  chrome.browserAction.setBadgeText({text: '👍'});
}

popupBadge.setRequesting = () => {
  chrome.browserAction.setBadgeBackgroundColor({color: [0, 0, 200, 10]});
  chrome.browserAction.setBadgeText({text: '🔃'});
}

popupBadge.clear = () => {
  chrome.browserAction.setBadgeText({text: ''});
}
