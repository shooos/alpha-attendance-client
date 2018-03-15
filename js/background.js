const actions = {}

actions.login = async (sender, args) => {
  const tab = sender.tab;
  if (tab == null) return;

  // ここでログイン処理してその結果をストレージに詰め込む
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
