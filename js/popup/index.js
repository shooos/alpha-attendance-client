const elements = {
  user: document.getElementById('user')
};

// 画面描画処理
const render = (args) => {
  elements.user.value = args.user || '';
}

// 初期表示処理
getChromeStorage('local', ['user'])
.then((items) => {
  render(items);
});
