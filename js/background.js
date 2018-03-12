const actions = {}

actions.login = async (sender, args) => {
  const tab = sender.tab;
  if (tab == null) return;

  // ここでログイン処理
  chrome.tabs.sendMessage(tab.id, {
    user: args.id,
    status: 'logged in.',
    message: null,
  });
}

chrome.runtime.onMessage.addListener((message, sender) => {
  console.log(message, sender);
  actions[message.action](sender, message.values);
});
