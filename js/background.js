const request = {};
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

  return response;
}

const actions = {};
/* ログイン処理 */
actions.login = async (sender, args) => {
  const tab = sender.tab;
  if (tab == null) return;

  // ここでログイン処理してその結果をストレージに詰め込む
  chrome.storage.sync.get({
    ssl: false,
    host: '',
    port: 3000
  }, async (items) => {
    const host = items.host;
    const port = items.port;
    if (!host) return;

    const url = [];
    url.push(items.ssl ? 'https:/' : 'http:/');
    url.push(host + ':' + port);
    url.push('alpha/user/login');
    const data = {
      id: args.id,
      password: args.password,
    };
    const response = await request.post(url.join('/'), data).catch((err) => {
      // エラーだったとき
    });

    chrome.storage.local.set({
      user: args.id,
      status: 'LOGGED-IN',
      message: null,
    });
    chrome.browserAction.setBadgeBackgroundColor({color: [0, 200, 0, 10]});
    chrome.browserAction.setBadgeText({text: '👍'});
  });
}

chrome.runtime.onMessage.addListener(async (message, sender) => {
  await actions[message.action](sender, message.values);
});
