const popupBadge = {};
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

const getChromeStorage = async (area, keys) => {
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

const setChromeStorage = async (area, items) => {
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

const request = {};
request.head = async (url, options) => {
  const response = await fetch(url, {
    method: 'HEAD'
  });
  if (!response.ok) throw new Error(response.statusText);
}
request.get = async (url, options) => {
  const headers = {'Content-Type': 'application/json'};
  if (options && options.headers) {
    Object.assign(headers, options.headers);
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: headers,
  });
  if (!response.ok) throw new Error(response.statusText);

  if (headers['Content-Type'] === 'text/plain') return response.text();
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
  });
  if (!response.ok) throw new Error(response.statusText);

  return response.json();
}
request.put = async (url, data, options) => {
  const headers = {'Content-Type': 'application/json'};
  if (options && options.headers) {
    Object.assign(headers, options.headers);
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: headers,
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(response.statusText);

  return response.json();
}

// 認証ヘッダ作成
const createAutorizationHeader = async () => {
  const items = await getChromeStorage('local', ['token']);
  const token = items.token;
  if (!token) return {};
  return {'authorization': 'Bearer ' + token};
}

const actions = {};

/* バッジをセットする */
actions.setBadge = async (sender, args) => {
  switch (args.type) {
  case 'error':
    popupBadge.setError();
    break;
  case 'success':
    popupBadge.setSuccess();
    break;
  case 'requesting':
    popupBadge.setRequesting();
    break;
  case 'clear':
    popupBadge.clear();
    break;
  }

  return;
}

/* コネクションの確認 */
actions.connection = async (sender, args, baseUrl) => {
  await request.head([baseUrl, ''].join('/'))
  .catch((err) => {
    popupBadge.setError();
    setChromeStorage('local', {
      status: 'ConnectionFailed',
      message: 'Unable to connect to the server.',
    });
    throw err;
  });
  return;
}

/* スタイルシートを取得 */
actions.getStyleSheet = async (sender, args, baseUrl) => {
  const url = baseUrl.split('/').slice(0, -1).join('/');
  const response = await request.get([url, 'css', 'attendance.css'].join('/'), {headers: {'Content-Type': 'text/plain'}})
  .catch((err) => {
    return '';
  });

  return response;
}

/* ユーザ登録 */
actions.registerUser = async (sender, args, baseUrl) => {
  const data = {
    id: args.id,
    password: args.password,
  };

  let response = await request.post([baseUrl, 'user'].join('/'), data)
  .catch((err) => {
    return {
      status: 'RegisterUserFailed',
      message: response.message,
    };
  });

  if (response.err) {
    response = {
      status: 'RegisterUserFailed',
      message: response.message,
    };
  } else {
    response = await actions.login(sender, args, baseUrl);
  }

  return response;
}

/* パスワード変更 */
actions.changePassword = async (sender, args, baseUrl) => {
  const data = {
    id: args.id,
    oldInfo: args.oldInfo,
    newInfo: args.newInfo,
  };

  let response = await request.put([baseUrl, 'user'].join('/'), data)
  .catch((err) => {
    return {
      status: err.name,
      message: response.message,
    };
  });

  if (response.err) {
    response = {
      status: response.err,
      message: response.message,
    };
  } else {
    response = await actions.login(sender, args, baseUrl);
  }

  return response;
}

/* ログイン処理 */
actions.login = async (sender, args, baseUrl) => {
  const result = {
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
    return {
      error: 'LoginFailed',
      message: err.name === 'TypeError' ? 'Login request failed.' : err.message,
    };
  });

  if (response && response.error) {
    popupBadge.setError();
    result.status = response.error;
    result.message = response.message;
  } else if (response && response.data) {
    popupBadge.setSuccess();
    result.status = 'LoggedIn';
    result.token = response.data.token;
  }
  return result;
}

/* ログアウト */
actions.logout = async (sender, args, baseUrl) => {
  await request.post([baseUrl, 'user', 'logout'].join('/'), {id: args.id})
  .catch((err) => {
    popupBadge.setError();
    setChromeStorage({
      status: 'LogoutFailed',
      message: 'Logout failed.',
    });
    throw err;
  });

  return;
}

/* 勤務形態登録 */
actions.registerWorkPattern = async (sender, args, baseUrl) => {
  const headers = await createAutorizationHeader();
  const response = await request.post([baseUrl, 'workPattern', 'register'].join('/'), args, {headers: headers});
  return response;
}

/* 勤務形態取得 */
actions.getWorkPattern = async (sender, args, baseUrl) => {
  const headers = await createAutorizationHeader();
  const response = await request.get([baseUrl, 'workPattern', 'id', args.id].join('/'), {headers: headers});
  return response;
}

/* 勤務形態リスト取得 */
actions.getPatterns = async (sender, args, baseUrl) => {
  const headers = await createAutorizationHeader();
  const response = await request.get([baseUrl, 'workPattern', 'list'].join('/'), {headers: headers});
  return response;
}

/* 稼働予定を取得 */
actions.getUserEstimates = async (sender, args, baseUrl) => {
  const headers = await createAutorizationHeader();
  const url = [baseUrl, 'attendance', 'estimates', args.user, args.year, args.month].join('/')
  const response = await request.get(url, {headers: headers});
  return response;
}

/* 稼働予定を登録 */
actions.registerEstimates = async (sender, args, baseUrl) => {
  const headers = await createAutorizationHeader();
  const url = [baseUrl, 'attendance', 'estimate'].join('/');
  const response = await request.post(url, args, {headers: headers});
  return response;
}

/* 実績を取得 */
actions.getUserActuals = async (sender, args, baseUrl) => {
  const headers = await createAutorizationHeader();
  const url = [baseUrl, 'attendance', 'actuals', args.user, args.year, args.month].join('/');
  const response = await request.get(url, {headers: headers});
  return response;
}

/* 実績を登録 */
actions.registerActual = async (sender, args, baseUrl) => {
  const headers = await createAutorizationHeader();
  const url = [baseUrl, 'attendance', 'actual'].join('/');
  const response = await request.post(url, args, {headers: headers});
  return response;
}

/* 稼働月間サマリを取得 */
actions.getSummary = async (sender, args, baseUrl) => {
  const headers = await createAutorizationHeader();
  const path = [baseUrl, 'attendance', 'summary', args.year, args.month];
  args.user && path.push(args.user);
  const url = path.join('/');
  const response = await request.get(url, {headers: headers})
  .catch((err) => {
    return {
      error: err.name,
      messgae: err.message,
    };
  });
  return response;
}

/* メッセージリスナ */
chrome.runtime.onMessage.addListener((message, sender, callback) => {
  chrome.storage.sync.get(['ssl', 'host', 'port'], async (items) => {
    const host = items.host;
    const port = items.port;
    if (!host) return;

    const baseUrl = [];
    baseUrl.push(items.ssl ? 'https:/' : 'http:/');
    baseUrl.push(host + ':' + port);
    baseUrl.push('alpha');

    // action に応じて処理振り分け
    if (message.action) {
      const response = await actions[message.action](sender, message.values, baseUrl.join('/'))
      .catch((err) => {
        return {
          status: err.name,
          message: err.message,
        };
      });
      callback(response);
    } else if (message.actions) {
      const actionList = [];
      message.actions.forEach((action, index) => {
        actionList.push(actions[action](sender, message.values[index], baseUrl.join('/')));
      });
      const responses = await Promise.all(actionList)
      .catch((err) => {
        return {
          status: err.name,
          message: err.message,
        };
      });
      callback(responses);
    }
  });

  return true;
});
