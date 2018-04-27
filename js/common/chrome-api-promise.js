// chrome.storage.%area%.get を promise で包んだもの
window.getChromeStorage = async (area, keys) => {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage[area].get(keys, (items) => {
        resolve(items);
      });
    } catch (err) {
      reject(err);
    }
  });
}

// chrome.storage.%area%.set を promise で包んだもの
window.setChromeStorage = async (area, items) => {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage[area].set(items, () => {
        resolve();
      });
    } catch (err) {
      reject(err);
    }
  });
}

// chrome.runtime.sendMessage を promise で包んだもの
window.runtimeSendMessage = async (message) => {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        resolve(response);
      });
    } catch (err) {
      reject(err);
    }
  });
}
