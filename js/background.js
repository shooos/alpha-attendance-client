const request = {};
request.post = async (url, data, options) => {
  const headers = {'Content-Type': 'application/json'};
  Object.assign(headers, options.headers);

  const responst = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data),
  }).catch((err) => {
    // エラーどうする
  });
}

const actions = {};
actions.login = async (sender, args) => {
  const tab = sender.tab;
  if (tab == null) return;

  // ここでログイン処理してその結果をストレージに詰め込む
  chrome.storage.sync.get({
    ssl: false,
    host: '',
    port: 3000
  }, (items) => {
    const host = items.host;
    const port = items.port;
    if (!host) return;

    const url = [];
    url.push(items.ssl ? 'https:/' : 'http:/');
    url.push(host + ':' + port);
    url.push('alpha/user/login');
    request.post(url.join('/'), data);
  });
}

const requestLogin = (id, password) => {
  chrome.storage.local.set({
    user: args.id,
    status: 'logged in.',
    message: null,
  });
  chrome.browserAction.setBadgeBackgroundColor({color: [0, 200, 0, 10]});
  chrome.browserAction.setBadgeText({text: '👍'});
}

chrome.runtime.onMessage.addListener((message, sender) => {
  actions[message.action](sender, message.values);
});


