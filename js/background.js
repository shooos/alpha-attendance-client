const popupBadge = {};
popupBadge.setError = () => {
  chrome.browserAction.setBadgeBackgroundColor({color: [200, 0, 0, 10]});
  chrome.browserAction.setBadgeText({text: '⚡'});
}
popupBadge.setSuccess = () => {
  chrome.browserAction.setBadgeBackgroundColor({color: [0, 200, 0, 10]});
  chrome.browserAction.setBadgeText({text: '👍'});
}

const request = {};
request.get = async (url, options) => {
  const headers = {'Content-Type': 'application/json'};
  if (options && options.headers) {
    Object.assign(headers, options.headers);
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: headers,
  }).catch((err) => {
    throw err;
  });

  if (response.status >= 400) {
    throw new Error(response.statusText);
  }
  return response.json();
}
request.post = async (url, data, options) => {
  const headers = {'Content-Type': 'application/json'};
  if (options && options.headers) {
    Object.assign(headers, options.headers);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data),
  }).catch((err) => {
    throw err;
  });

  if (response.status >= 300) {
    throw new Error(response.statusText);
  }
  return response.json();
}

const actions = {};
/* ログイン処理 */
actions.login = async (sender, args, baseUrl) => {
  const tab = sender.tab;
  if (tab == null) return;

  const local = {
    user: args.id,
    password: args.password,
    status: null,
    message: null,
    token: null,
  };
  const data = {
    id: args.id,
    password: args.password,
  };
  const response = await request.post([baseUrl, 'user', 'login'].join('/'), data)
    .catch((err) => {
      popupBadge.setError();
      local.status = 'ERROR';
      local.message = err.message;
    });

  if (response.error) {
    popupBadge.setError();
    local.status = response.error;
    local.message = response.message;
  } else if (response.data) {
    popupBadge.setSuccess();
    local.status = 'LOGGED-IN';
    local.token = response.data.token;
  }

  chrome.storage.local.set(local);
}
/* 勤務形態取得 */
actions.getWorkPattern = async (sender, args, baseUrl, callback) => {
  chrome.storage.local.get(['token'], async (items) => {
    const token = items.token;
    if (!token) return;

    const headers = {'authorization': 'Bearer ' + token};
    const response = await request.get([baseUrl, 'workPattern', 'id', args.id].join('/'), {headers: headers});
    callback(response);
  });
}
/* 勤務形態リスト取得 */
actions.getPatterns = async (sender, args, baseUrl, callback) => {
  chrome.storage.local.get(['token'], async (items) => {
    const token = items.token;
    if (!token) return;

    const headers = {'authorization': 'Bearer ' + token};
    const response = await request.get([baseUrl, 'workPattern', 'list'].join('/'), {headers: headers});
    callback(response);
  });
}
/* ユーザ登録 */
actions.registerUser = async (sender, args, baseUrl, callback) => {
  const data = {
    id: args.user,
    password: args.password,
  };
  const response = await request.post([baseUrl, 'user', 'register'].join('/'), data);
  callback(response);
}

chrome.runtime.onMessage.addListener((message, sender, callback) => {
  console.log('onMessage', message, sender, callback);
  chrome.storage.sync.get(['ssl', 'host', 'port'], async (items) => {
    const host = items.host;
    const port = items.port;
    if (!host) return;

    const baseUrl = [];
    baseUrl.push(items.ssl ? 'https:/' : 'http:/');
    baseUrl.push(host + ':' + port);
    baseUrl.push('alpha');
    await actions[message.action](sender, message.values, baseUrl.join('/'), callback);
  });

  return true;
});
