// 認証ヘッダ作成
const createAutorizationHeader = async () => {
  const items = await getChromeStorage('local', ['token']);
  const token = items.token;
  if (!token) return null;

  const headers = new Headers();
  headers.append('authorization', 'Bearer ' + token);
  return headers;
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
  const headers = new Headers();
  headers.append('Content-Type', 'text/plain');

  const response = await request.get([url, 'css', 'attendance.css'].join('/'), headers)
  .catch((err) => {
    return '';
  });

  return response;
}

/* ユーザ認証 */
actions.signIn = async (sender, args, baseUrl) => {
  const data = {id: args.user};

  const response = await request.post([baseUrl, 'user'].join('/'), null, data)
  .catch((err) => ({
    status: STATUS.SIGN_IN_FAILED,
    message: err.message,
  }));

  if (response.err) {
    response.status = STATUS.SIGN_IN_FAILED;
    response.message = response.message;
  }

  return response;
}

/* ログアウト */
actions.logout = async (sender, args, baseUrl) => {
  await request.post([baseUrl, 'user', 'logout'].join('/'), null, {id: args.id})
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
  if (!headers) return null;

  const response = await request.post([baseUrl, 'workPattern', 'register'].join('/'), headers, args);
  return response;
}

/* 勤務形態取得 */
actions.getWorkPattern = async (sender, args, baseUrl) => {
  const headers = await createAutorizationHeader();
  if (!headers) return null;

  const response = await request.get([baseUrl, 'workPattern', 'id', args.id].join('/'), headers);
  return response;
}

/* 勤務形態リスト取得 */
actions.getPatterns = async (sender, args, baseUrl) => {
  const headers = await createAutorizationHeader();
  if (!headers) return null;

  const response = await request.get([baseUrl, 'workPattern', 'list'].join('/'), headers);
  return response;
}

/* 稼働予定を取得 */
actions.getUserEstimates = async (sender, args, baseUrl) => {
  const headers = await createAutorizationHeader();
  const url = [baseUrl, 'attendance', 'estimates', args.user, args.year, args.month].join('/')

  const response = await request.get(url, headers);
  return response;
}

/* 稼働予定を登録 */
actions.registerEstimates = async (sender, args, baseUrl) => {
  const headers = await createAutorizationHeader();
  if (!headers) return null;
  const url = [baseUrl, 'attendance', 'estimate'].join('/');

  const response = await request.post(url, headers, args);
  return response;
}

/* 実績を取得 */
actions.getUserActuals = async (sender, args, baseUrl) => {
  const headers = await createAutorizationHeader();
  if (!headers) return null;
  const url = [baseUrl, 'attendance', 'actuals', args.user, args.year, args.month].join('/');

  const response = await request.get(url, headers);
  return response;
}

/* 実績を登録 */
actions.registerActual = async (sender, args, baseUrl) => {
  const headers = await createAutorizationHeader();
  if (!headers) return null;
  const url = [baseUrl, 'attendance', 'actual'].join('/');

  const response = await request.post(url, headers, args);
  return response;
}

/* 稼働月間サマリを取得 */
actions.getSummary = async (sender, args, baseUrl) => {
  const headers = await createAutorizationHeader();
  if (!headers) return null;
  const path = [baseUrl, 'attendance', 'summary', args.year, args.month];
  args.user && path.push(args.user);
  const url = path.join('/');

  const response = await request.get(url, headers);
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
