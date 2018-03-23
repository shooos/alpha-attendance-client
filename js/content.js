let baseUrl;
const funcs = {};

funcs.loginForm = (form) => {
  const elements = form.elements;
  let userIDForm, passwordForm;

  for (let element of elements) {
    const type = element.type;

    if (type === 'submit') {
      element.addEventListener('mousedown', () => {
        const utf8arr = CryptoJS.enc.Utf8.parse(passwordForm.value);
        const hash = CryptoJS.SHA256(utf8arr);
        const passwordHash = CryptoJS.enc.Base64.stringify(hash);

        chrome.runtime.sendMessage({
          action: 'login',
          values: {
            id: userIDForm.value,
            password: passwordHash,
          },
        });
      });
    }
    if (type === 'text') {
      userIDForm = element;
    }
    if (type === 'password') {
      passwordForm = element;
    }
  }
}

funcs.mainContent = (view, menu) => {
  // 現在日付
  const n = new Date();
  const now = {
    year: n.getFullYear(),
    month: n.getMonth() + 1,
    day: n.getDate(),
  };

  view.frameElement.addEventListener('load', (e) => {
    const doc = e.target.contentWindow.document;
    const title = doc.title;

    // STYLEを埋め込み
    const link = doc.createElement('link');
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('type', 'text/css');
    link.setAttribute('href', [baseUrl, 'css/attendance.css'].join('/'));
    doc.head.appendChild(link);

    if (title.startsWith('勤務表')) {
      // 勤務表ページ

      // 表示している勤務表の年月
      const d = doc.forms['dateForm'].date.value;
      const viewYear = d.split('/')[0] - 0;
      const viewMonth = d.split('/')[1] - 0;
      let viewState;
      if (now.year > viewYear || (now.year === viewYear && now.month > viewMonth)) {
        viewState = 'PAST';
      } else if (now.year === viewYear && now.month === viewMonth) {
        viewState = 'CURRENT';
      } else {
        viewState = 'FUTURE';
      }

      let table;
      for (let child of doc.body.childNodes) {
        if (child.textContent === '週／月切替') {
          table = child.nextSibling;
          break;
        }
      }
      table.classList.add('alpha-attendance-table');

      const rowDefinitions = [
        {
          header: '形態（予定）',
          name: 'pattern',
          innerTag: (row) => {
            let tag;
            if (isReadonly(viewState, row, now)) {
              tag = doc.createElement('input');
              tag.classList.add('alpha-attendance-display-pattern');
              tag.setAttribute('readonly', 'readonly');
            } else {
              tag = doc.createElement('select');
              tag.classList.add('alpha-attendance-select-pattern');
            }
            return tag;
          },
        },
        {
          header: '開始（予定）',
          name: 'start',
          innerTag: (row) => {
            const tag = doc.createElement('input');
            tag.classList.add('alpha-attendance-input-time');
            if (isReadonly(viewState, row, now)) {
              tag.setAttribute('readonly', 'readonly');
            }
            return tag;
          },
        },
        {
          header: '終了（予定）',
          name: 'end',
          innerTag: (row) => {
            const tag = doc.createElement('input');
            tag.classList.add('alpha-attendance-input-time');
            if (isReadonly(viewState, row, now)) {
              tag.setAttribute('readonly', 'readonly');
            }
            return tag;
          },
        },
        {
          header: '非請求時間（予定）',
          name: 'unclaimed',
          innerTag: (row) => {
            const tag = doc.createElement('input');
            tag.classList.add('alpha-attendance-input-time');
            if (isReadonly(viewState, row, now)) {
              tag.setAttribute('readonly', 'readonly');
            }
            return tag;
          },
        },
      ];

      const rows = Array.apply(null, table.querySelectorAll('tbody>tr'));
      const headElement = rows.shift();
      for (let definition of rowDefinitions) {
        const th = doc.createElement('th');
        th.textContent = definition.header;
        headElement.appendChild(th);
      }

      for (let row of rows) {
        for (let definition of rowDefinitions) {
          const td = doc.createElement('td');
          td.setAttribute('name', definition.name);
          td.appendChild(definition.innerTag(row));
          row.appendChild(td);
        }
      }
    }
  });
}

const form = document.forms['login/loginForm'];
const mainFrame = parent.view;
const menuFrame = parent.menu;

if (form) {
  funcs.loginForm(form);
} else if (mainFrame && menuFrame) {
  funcs.mainContent(mainFrame, menuFrame);
}

chrome.storage.sync.get({
  ssl: false,
  host: '',
  port: 3000,
}, (items) => {
  const host = items.host;
  const port = items.port;
  if (!host) return;

  const url = [];
  url.push(items.ssl ? 'https:/' : 'http:/');
  url.push(host + ':' + port);
  baseUrl = url.join('/');
});

const isReadonly = (viewState, row, now) => {
  if (viewState === 'FUTURE') return false;
  if (viewState === 'PAST') return true;
  if (viewState === 'CURRENT') {
    const dateTag = row.querySelector('td:first-child > a');
    const date = dateTag.textContent.match(/^\d+/) - 0;
    if (now.day > date) return true;
  }

  return false;
}