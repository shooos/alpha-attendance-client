/* Global variable */
let baseUrl;

const Indicator = function () {
  this.loader = document.createElement('div');
  this.loader.classList.add('alpha-attendance-loader');

  this.indicator = document.createElement('div');
  this.indicator.classList.add('alpha-attendance-indicator');
  this.indicator.classList.add('hidden');
  this.indicator.appendChild(this.loader);

  let body = document.body;
  if (body.tagName === 'FRAMESET') {
    body = document.getElementsByTagName('html')[0];
  }
  body.appendChild(this.indicator);
}
Indicator.prototype.show = function () {
  this.indicator.classList.remove('hidden');
}
Indicator.prototype.hide = function () {
  this.indicator.classList.add('hidden');
}

// 一括入力ダイアログを作成する
const createBatchInputDialog = (doc, patterns) => {
  const pageOverlay = doc.createElement('div');
  pageOverlay.classList.add('alpha-attendance-page-overlay');
  pageOverlay.addEventListener('mousedown', () => {
    close();
  });

  const dialog = doc.createElement('div');
  dialog.classList.add('alpha-attendance-dialog');
  dialog.setAttribute('id', 'batch-input-dialog');
  dialog.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });

  // title section
  const titleSection = doc.createElement('section');
  const title = doc.createElement('label');
  title.textContent = '予定一括入力';
  title.classList.add('dialog-title');
  titleSection.appendChild(title);
  dialog.appendChild(titleSection);

  // body section
  const bodySection = doc.createElement('section');
  bodySection.classList.add('body-section');
  // batch input table
  const table = doc.createElement('table');
  table.classList.add('alpha-attendance-table');
  const headRow = table.createTBody().insertRow();
  const headers = ['形態', '開始', '終了'];
  for (let head of headers) {
    const th = doc.createElement('th');
    th.textContent = head;
    headRow.appendChild(th);
  }
  const tr = table.tBodies.item(0).insertRow();
  const elements = [
    createPatternSelector(doc, 'batch-pattern', null, 'FUTURE', 0, patterns),
    createTimePicker(doc, 'batch-start', null, 'FUTURE'),
    createTimePicker(doc, 'batch-end', null, 'FUTURE'),
  ];
  for (let element of elements) {
    const cell = tr.insertCell();
    cell.appendChild(element);
  }
  bodySection.appendChild(table);
  dialog.appendChild(bodySection);

  // buttons section
  const buttonsSection = doc.createElement('section');
  buttonsSection.classList.add('buttons-section');
  // cancel button
  const cancelButton = doc.createElement('div');
  cancelButton.classList.add('dialog-button-cancel');
  cancelButton.textContent = 'Cancel';
  cancelButton.addEventListener('mousedown', () => {
    close();
  });
  buttonsSection.appendChild(cancelButton);
  // done button
  const doneButton = doc.createElement('div');
  doneButton.classList.add('dialog-button-done');
  doneButton.textContent = 'Done';
  doneButton.addEventListener('mousedown', () => {
    const patternTag = elements[0];
    const pattern = patternTag.selectedIndex;
    const startTime = elements[1].value;
    const endTime = elements[2].value;
    const trs = doc.querySelectorAll('body > table.alpha-attendance-table tbody > tr:not(.stateRecognition):not(.statePresent)');

    for (let tr of trs) {
      const dayOffTag = tr.querySelector('[name="day-off"]');
      if (!dayOffTag || dayOffTag.checked) continue;

      const patternTag = tr.querySelector('[name="pattern"]');
      const startTag = tr.querySelector('[name="start"]');
      const endTag = tr.querySelector('[name="end"]');

      patternTag.selectedIndex = pattern;
      startTag.value = startTime;
      endTag.value = endTime;
    }

    close();
  });
  buttonsSection.appendChild(doneButton);
  dialog.appendChild(buttonsSection);

  pageOverlay.appendChild(dialog);
  doc.body.appendChild(pageOverlay);

  /** ダイアログを開く */
  const open = () => {
    pageOverlay.classList.add('opened');
  }

  /** ダイアログを閉じる */
  const close = () => {
    pageOverlay.classList.remove('opened');
  }

  /** ダイアログの位置を設定する */
  const setPosition = (x, y) => {
    dialog.style.left = x + 'px';
    dialog.style.top = y + 'px';
  }

  return {
    open: open,
    close: close,
    setPosition: setPosition,
  }
}

/* 登録結果を反映する */
const reflectRegisterResponse = (doc, response) => {
  if (!response || response.error) return;

  const trs = Array.apply(null, doc.querySelectorAll('body > table.alpha-attendance-table tbody > tr:not(.stateRecognition):not(.statePresent)'));
  trs.shift(); // ヘッダ行を捨てる
  const data = response.data;
  for (let tr of trs) {
    const rowDate = getRowDate(tr);
    const record = data.find((rec) => {
      const date = moment(rec[0].date).format('D') - 0;
      return date === rowDate;
    });

    if (record) {
      tr.querySelector('[name="claim"]').value = record[0].estimateHours;
    }
  }
}

// 勤務表テーブル上部にツールボックスを生成する
const createToolBox = (doc, table, patterns, yearMonth) => {
  const indicator = new Indicator();

  const box = doc.createElement('div');
  box.classList.add('alpha-attendance-toolbox');
  const batchInputDialog = createBatchInputDialog(doc, patterns);

  const batchInput = doc.createElement('div');
  batchInput.classList.add('tool-item');
  batchInput.textContent = '一括入力';
  batchInput.addEventListener('mousedown', (e) => {
    batchInputDialog.setPosition(e.clientX, e.clientY);
    batchInputDialog.open();
  });
  box.appendChild(batchInput);

  const register = doc.createElement('div');
  register.classList.add('tool-item');
  register.textContent = '予定登録';

  register.addEventListener('mousedown', async () => {
    indicator.show();

    const estimates = [];
    const trs = doc.querySelectorAll('body > table.alpha-attendance-table > tbody > tr');

    for (let tr of trs) {
      const dayOffTag = tr.querySelector('[name="day-off"]');
      if (!dayOffTag) continue; // ヘッダ行を処理から除外する判定

      const patternTag = tr.querySelector('[name="pattern"]');
      if (patternTag.readOnly) continue; // 過去日の行を無視する

      const pattern = patternTag.options[patternTag.selectedIndex].value;
      const startTag = tr.querySelector('[name="start"]');
      const endTag = tr.querySelector('[name="end"]');
      const unclaimedtag = tr.querySelector('[name="unclaim"]');

      const estimate = {
        date: moment({y: yearMonth.year, M: yearMonth.month - 1, d: getRowDate(tr)}).format('YYYY-MM-DD'),
        dayOff: dayOffTag.checked,
        workPatternId: pattern,
        startTime: startTag.value,
        endTime: endTag.value,
        unclaimedHours: unclaimedtag.value,
      };
      estimates.push(estimate);
    }

    const items = await getChromeStorage('local', ['user']);
    const response = await runtimeSendMessage({
      action: 'registerEstimates',
      values: {
        memberId: items.user,
        detail: estimates,
      },
    });

    reflectRegisterResponse(doc, response);
    indicator.hide();
  });
  box.appendChild(register);

  const thead = table.createTHead();
  const headRow = thead.insertRow();
  const cell = headRow.insertCell();
  cell.colSpan = 16;
  cell.appendChild(box);
}

// 行から日付を取得
const getRowDate = (row) => {
  const dateTag = row.querySelector('td:first-child > a');
  return dateTag.textContent.match(/^\d+/) - 0;
}

// 時刻・時間入力アイテム作成
const createTimePicker = (doc, name, now, viewState, rowDate) => {
  const tag = doc.createElement('input');
  tag.setAttribute('name', name);
  tag.classList.add('alpha-attendance-input-time');
  tag.readOnly = isReadonly(viewState, rowDate, now);

  if (!tag.readOnly) {
    tag.addEventListener('focus', (e) => {
      tag.select();
    });
    tag.addEventListener('input', (e) => {
      const input = e.data;
      const value = e.target.value;
      if (input && !(/[0-9]/.test(input))) {
        e.target.value = value.slice(0, -1);
      } else if (input && value.length === 2) {
        e.target.value += ':';
      } else if (input && value.length > 5) {
        e.target.value = value.substr(0, 5);
      }
    });
  }

  return tag;
}

// 勤務形態選択アイテム作成
const createPatternSelector = (doc, name, now, viewState, rowDate, patterns) => {
  let tag;
  if (isReadonly(viewState, rowDate, now)) {
    tag = doc.createElement('input');
    tag.classList.add('alpha-attendance-display-pattern');
    tag.readOnly = true;
  } else {
    tag = doc.createElement('select');
    tag.classList.add('alpha-attendance-select-pattern');
    for (let pattern of patterns) {
      const option = doc.createElement('option');
      option.value = pattern.workPatternId || null;
      option.textContent = pattern.label || pattern.workPatternId || '';
      tag.appendChild(option);
    }
  }
  tag.setAttribute('name', name);

  return tag;
}

// 読み取り専用にするか
const isReadonly = (viewState, rowDate, now) => {
  return (viewState === 'PAST' || (viewState === 'CURRENT' && now.day >= rowDate));
}

// 表示中の勤務表の年月を取得
const getYearMonth = (doc, now) => {
  // 表示している勤務表の年月
  const d = doc.forms['dateForm'].date.value;
  const y = d.split('/')[0] - 0;
  const m = d.split('/')[1] - 0;
  let state;
  if (now.year > y || (now.year === y && now.month > m)) {
    state = 'PAST';
  } else if (now.year === y && now.month === m) {
    state = 'CURRENT';
  } else {
    state = 'FUTURE';
  }

  return {
    year: y,
    month: m,
    state: state,
  };
}

/* 追加列の定義を生成 */
const createExtendColumnDefinitions = () => {
  const isDayOff = (row) => {
    const dayOff = row.querySelector('[name="day-off"]');
    return dayOff.checked;
  }

  return [
    {
      header: '登録済',
      type: 'actual',
      classes: ['alpha-attendance-center'],
      innerTag: (doc, data) => {
        const tag = doc.createElement('span');
        if (data) tag.classList.add('alpha-attendance-icon-checkmark');
        return tag;
      },
    },
    {
      header: '休暇(予定)',
      type: 'estimate',
      classes: ['alpha-attendance-center'],
      innerTag: (doc, viewState, now, rowDate, row, data, patterns) => {
        const tag = doc.createElement('label');
        const checkbox = doc.createElement('input');
        checkbox.setAttribute('type', 'checkbox');
        checkbox.checked = data ? data.dayOff : row.firstElementChild.classList.contains('holiday');
        checkbox.disabled = isReadonly(viewState, rowDate, now);
        checkbox.setAttribute('name', 'day-off');

        tag.addEventListener('change', () => {
          tag.style.background = checkbox.checked ? '#f99' : '';
          const inputs = row.querySelectorAll('select, input');
          for (let input of inputs) {
            if (input !== checkbox) {
              input.disabled = checkbox.checked;
            }
          }
        });
        tag.style.background = checkbox.checked ? '#f99' : '';
        tag.appendChild(checkbox);

        return tag;
      }
    },
    {
      header: '形態(予定)',
      type: 'estimate',
      innerTag: (doc, viewState, now, rowDate, row, data, patterns) => {
        const tag = createPatternSelector(doc, 'pattern', now, viewState, rowDate, patterns);

        if (data && tag.tagName === 'INPUT') {
          const pattern = patterns.filter((pattern) => pattern.workPatternId === data.workPatternId)[0];
          tag.value = pattern ? pattern.label : '';
        } else if (data && tag.tagName === 'SELECT') {
          const option = tag.querySelector('option[value="' + data.workPatternId + '"]');
          const list = Array.apply(null, tag.querySelectorAll('option'));
          tag.selectedIndex = list.indexOf(option);
        }

        tag.disabled = isDayOff(row);
        return tag;
      },
    },
    {
      header: '開始(予定)',
      type: 'estimate',
      classes: ['right'],
      innerTag: (doc, viewState, now, rowDate, row, data) => {
        const tag = createTimePicker(doc, 'start', now, viewState, rowDate);
        if (data) tag.value = data.startTime;
        tag.disabled = isDayOff(row);
        return tag;
      },
    },
    {
      header: '終了(予定)',
      type: 'estimate',
      classes: ['right'],
      innerTag: (doc, viewState, now, rowDate, row, data) => {
        const tag = createTimePicker(doc, 'end', now, viewState, rowDate);
        if (data) tag.value = data.endTime;
        tag.disabled = isDayOff(row);
        return tag;
      },
    },
    {
      header: '非請求(予定)',
      type: 'estimate',
      classes: ['right'],
      innerTag: (doc, viewState, now, rowDate, row, data) => {
        const tag = createTimePicker(doc, 'unclaim', now, viewState, rowDate);
        if (data) tag.value = data.unclaimedHours === '0:00' ? '' : data.unclaimedHours;
        tag.disabled = isDayOff(row);
        return tag;
      },
    },
    {
      header: '稼働(予定)',
      type: 'estimate',
      classes: ['right'],
      innerTag: (doc, viewState, now, rowDate, row, data) => {
        const tag = createTimePicker(doc, 'claim', null, 'PAST', null);
        if (data) tag.value = data.estimateHours
        return tag;
      },
    },
  ];
}

/* 勤務表を拡張する */
const extendAttendanceList = async (doc, now, yearMonth) => {
  const summaryTable = doc.forms['dateForm'].nextSibling.querySelector('td:first-child > table');
  summaryTable.classList.add('alpha-attendance-summary-table');

  let attendanceTable;
  for (let child of doc.body.childNodes) {
    if (child.textContent === '週／月切替') {
      attendanceTable = child.nextSibling;
      break;
    }
  }
  attendanceTable.classList.add('alpha-attendance-table');

  const items = await getChromeStorage('local', ['user']);
  await appendSummaryInfo(doc, summaryTable, now, yearMonth, items.user)

  // 勤務形態リストを取得する
  const responses = await runtimeSendMessage({
    actions: ['getPatterns', 'getUserEstimates', 'getUserActuals'],
    values: [{}, {
      year: yearMonth.year,
      month: yearMonth.month,
      user: items.user,
    }, {
      year: yearMonth.year,
      month: yearMonth.month,
      user: items.user,
    }],
  });
  await appendAttendanceColumns(responses, doc, attendanceTable, now, yearMonth);
}

/* 勤務時間サマリテーブルに情報を追加する */
const appendSummaryInfo = async (doc, summaryTable, now, yearMonth, user) => {
  const response = await runtimeSendMessage({
    action: 'getSummary',
    values: {
      year: yearMonth.year,
      month: yearMonth.month,
      user: user,
    },
  });
  if (response.error) {
    await setChromeStorage('local', {
      status: response.error,
      message: response.message,
    });
    await runtimeSendMessage({
      action: 'setBadge',
      values: {type: 'error'},
    });
    return;
  }
  const summaryInfo = response.data ? response.data : {};
  const estimateSummaryInfo = summaryInfo.estimates[user];
  const actualSummaryInfo = summaryInfo.actuals[user] || {};
  const th = doc.createElement('th');

  const extendTableInfo = [
    {type: 'tr'},
    {
      text: '請求稼働(予定)',
      type: 'th',
      classes: [],
    },
    {
      text: estimateSummaryInfo ? estimateSummaryInfo.claimed : '0:00',
      type: 'td',
      classes: ['right'],
    },
    {
      text: '非請求稼働(予定)',
      type: 'th',
      classes: [],
    },
    {
      text: estimateSummaryInfo ? estimateSummaryInfo.unclaimed : '0:00',
      type: 'td',
      classes: ['right'],
    },
    {type: 'tr'},
    {
      text: '稼働実績',
      type: 'th',
      classes: [],
      colSpan: 2,
    },
  ];

  for (let pCode of Object.keys(actualSummaryInfo)) {
    extendTableInfo.push({type: 'tr'});
    extendTableInfo.push({
      text: pCode,
      type: 'th',
      classes: [],
    });
    extendTableInfo.push({
      text: actualSummaryInfo[pCode],
      type: 'td',
      classes: ['right'],
    });
  }

  let row;
  for (let info of extendTableInfo) {
    if (info.type === 'tr') {
      row = summaryTable.insertRow();
      row.classList.add('alpha-attendance-summary-info');
      continue;
    }

    let cell;
    if (info.type === 'th') {
      cell = th.cloneNode();
      row.appendChild(cell);
    } else {
      cell = row.insertCell();
    }
    cell.textContent = info.text;
    info.classes.forEach(clazz => cell.classList.add(clazz));
    if (info.colSpan) cell.colSpan = info.colSpan;
  }

}

/* 勤務表に列を追加する */
const appendAttendanceColumns = async (responses, doc, attendanceTable, now, yearMonth) => {
  // 追加列の定義
  const columnDefinitions = createExtendColumnDefinitions();

  const workPatternsResponse = responses.shift();
  const estimatesResponse = responses.shift();
  const actualsResponse = responses.shift();

  if (workPatternsResponse.error || estimatesResponse.error || actualsResponse.error) {
    const messages = [];
    workPatternsResponse.error && messages.push(workPatternsResponse.message);
    estimatesResponse.error && messages.push(estimatesResponse.message);
    actualsResponse.error && messages.push(actualsResponse.message);

    await setChromeStorage('local', {
      status: 'GetEstimatesInfoFailed',
      message: messages.join('\n'),
    });
    await runtimeSendMessage({
      action: 'setBadge',
      values: {type: 'error'},
    });
    return;
  }

  const patterns = workPatternsResponse.data;
  patterns.unshift('');
  const estimates = estimatesResponse.data;
  const actuals = actualsResponse.data;

  createToolBox(doc, attendanceTable, patterns, yearMonth);

  // 列ヘッダを追加する
  const rows = Array.apply(null, attendanceTable.querySelectorAll('tbody>tr'));
  const headElement = rows.shift();
  for (let definition of columnDefinitions) {
    const th = doc.createElement('th');
    th.textContent = definition.header;
    headElement.appendChild(th);
  }

  // 各行に列を追加する
  for (let row of rows) {
    const rowDate = getRowDate(row);
    let estimateData;
    let actualData;
    let breakFlag = 0;

    while (estimates.length || actuals.length) {
      const estimate = estimates[0];
      const estimateDate = estimate ? (moment(estimate.date).format('D') - 0) : 32;
      const actual = actuals[0];
      const actualDate = actual ? (moment(actual.date).format('D') - 0) : 32;

      if (estimateDate > rowDate && actualDate > rowDate) {
        // 対象日のデータでない場合はスキップ
        break;
      }

      if (estimateDate < rowDate) {
        // 表示対象でないデータは読み捨てる
        estimates.shift();
      } else if (estimateDate === rowDate) {
        // 行の日付と一致するデータを使う
        estimateData = estimates.shift();
        breakFlag |= 1;
      }

      if (actualDate < rowDate) {
        // 表示対象でないデータは読み捨てる
        actuals.shift();
      } else if (actualDate === rowDate) {
        // 行の日付と一致するデータを使う
        actualData = actuals.shift();
        breakFlag |= 2;
      }

      if (breakFlag === 3) break;
    }

    for (let definition of columnDefinitions) {
      const td = doc.createElement('td');
      if (definition.classes) {
        for (let clazz of definition.classes) {
          td.classList.add(clazz);
        }
      }

      if (definition.type === 'actual') {
        td.appendChild(definition.innerTag(doc, actualData));
      } else {
        td.appendChild(definition.innerTag(doc, yearMonth.state, now, rowDate, row, estimateData, patterns));
      }

      row.appendChild(td);
    }
  }
}

/* 報告書作成を拡張する */
const extendCreateReport = async (doc) => {
  const indicator = new Indicator();

  const inputForm = doc.forms['inputForm'];
  let submitButton = inputForm.querySelector('[value="提出"]');
  if (!submitButton) {
    submitButton = doc.createElement('input');
    submitButton.setAttribute('type', 'button');
    submitButton.value = '再送信';
    inputForm.appendChild(submitButton);
  }

  const response = await runtimeSendMessage({
    action: 'getPatterns',
    values: {},
  });

  const indexForm = doc.forms['indexForm'];
  const patternCell = indexForm.querySelector('tbody > tr:nth-child(2) > td:nth-child(2)');
  const patternName = patternCell.textContent.replace(/\n/g, '');
  const patterns = response.data || [];
  const pattern = patterns.filter((pattern) => pattern.label === patternName)[0];
  const workPatternId = pattern ? pattern.workPatternId : null;

  const items = await getChromeStorage('local', ['user']);
  const user = items.user;
  const targetDate = doc.querySelector('span.current').textContent.replace(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2}).*/, '$1-$2-$3');

  const detail = [];
  const trs = Array.apply(null, indexForm.querySelectorAll('tbody > tr:nth-child(n+2)')).reverse();
  let nextBeginTime;
  for (let tr of trs) {
    const cells = tr.querySelectorAll('td');
    const record = {
      beginTime: cells.item(6).firstElementChild.textContent.replace(/\n/g, ''),
      finishTime: cells.item(7).firstElementChild.textContent.replace(/\n/g, '') || nextBeginTime,
      pCode: cells.item(4).textContent.replace(/\n/g, ''),
    };
    nextBeginTime = record.beginTime;

    if (record.beginTime && record.finishTime) {
      detail.unshift(record);
    }
  }

  const values = {
    memberId: user,
    date: moment(targetDate, 'YYYY-M-D').format('YYYY-MM-DD'),
    workPatternId: workPatternId,
    detail: detail,
  };

  // 提出時にサーバに送信する
  submitButton.addEventListener('mousedown', async () => {
    if (!detail.length) return;

    indicator.show();
    await runtimeSendMessage({
      action: 'registerActual',
      values: values,
    });
    indicator.hide();
  });
}

/* 全員分のサマリ情報テーブルを追加する */
const appendAllMembersSummary = async (doc, yearMonth) => {
  const attendanceTable = doc.createElement('table');
  attendanceTable.setAttribute('id', 'alpha-attendance-list-all-' + yearMonth.month);
  attendanceTable.classList.add('alpha-attendance-table');

  const caption = attendanceTable.createCaption();
  caption.textContent = yearMonth.month + '月';
  caption.classList.add('alpha-attendance-table-caption');

  const columns = [
    {
      label: 'ユーザID',
      rowSpan: 2,
    },
    {
      label: '予測稼働時間',
      subColumns: [
        {label: '請求稼働'},
        {label: '非請求稼働'},
      ],
    },
    {
      label: '稼働実績',
      subColumns: [],
    }
  ];

  const responses = await runtimeSendMessage({
    action: 'getSummary',
    values: {
      year: yearMonth.year,
      month: yearMonth.month,
    },
  });
  if (!responses) return;
  if (responses.error) {
    await setChromeStorage('local', {
      status: responses.error,
      message: responses.message,
    });
    await runtimeSendMessage({
      action: 'setBadge',
      values: {type: 'error'},
    });
    return;
  }

  const data = responses.data;
  const actuals = data.actuals;
  const estimates = data.estimates;

  // 全ユーザ分のP-Codeのリストを作る
  const pCodeList = [];
  for (let actual of Object.values(actuals)) {
    Object.keys(actual).forEach(pCode => {
      if (!pCodeList.includes(pCode)) {
        pCodeList.push(pCode);
      }
    });
  }
  pCodeList.sort();
  pCodeList.forEach(pCode => columns[2].subColumns.push({label: pCode}));
  if (!pCodeList.length) columns[2].subColumns.push({label: ''});

  const tBody = attendanceTable.createTBody();

  // Header
  const headRow = tBody.insertRow();
  const subHeadRow = tBody.insertRow();
  for (let column of columns) {
    const th = doc.createElement('th');
    th.textContent = column.label;
    if (column.rowSpan) th.rowSpan = column.rowSpan;
    if (column.subColumns) {
      th.colSpan = column.subColumns.length;
      for (let sub of column.subColumns) {
        const th = doc.createElement('th');
        th.textContent = sub.label;
        subHeadRow.appendChild(th);
      }
    }
    headRow.appendChild(th);
  }

  // Body

  // ユーザのリスト
  const users = Object.keys(actuals);
  Object.keys(estimates).forEach(userId => !users.includes(userId) && users.push(userId));
  users.sort();

  for (let user of users) {
    const row = tBody.insertRow();
    const cell = row.insertCell();
    cell.textContent = user;

    const estimate = estimates[user];
    const claim = row.insertCell();
    const unclaim = row.insertCell();
    if (estimate) {
      claim.textContent = estimate.claimed || '0:00';
      claim.classList.add('right');
      unclaim.textContent = estimate.unClaimed || '0:00';
      unclaim.classList.add('right');
    }

    const actual = actuals[user];
    for (let pCode of pCodeList) {
      const cell = row.insertCell();
      if (actual[pCode]) {
        cell.textContent = actual[pCode];
        cell.classList.add('right');
      }
    }
    if (!pCodeList.length) row.insertCell();
  }

  doc.body.insertBefore(attendanceTable, doc.getElementsByClassName('contents')[0].nextSibling);
}

/* トップページを拡張する */
const extendTopPage = async (doc, now) => {
  await appendAllMembersSummary(doc, now);

  const lastMonth = Object.assign({}, now);
  lastMonth.month--;
  await appendAllMembersSummary(doc, lastMonth);
}

/* 画面に応じて処理分岐 */
const steering = async () => {
  const items = await getChromeStorage('sync', ['ssl', 'host', 'port']);
  const host = items.host;
  const port = items.port;
  if (!host) return;

  const url = [];
  url.push(items.ssl ? 'https:/' : 'http:/');
  url.push(host + ':' + port);
  baseUrl = url.join('/');
  await runtimeSendMessage({action: 'connection'})
  .catch((err) => {
    setChromeStorage('local', {
      status: 'ConnectionConfirmationFailure',
      message: 'Connection confirmation failure.',
    });
    throw err;
  });

  const mainFrame = parent.view;
  const menuFrame = parent.menu;

  if (mainFrame && menuFrame) {
    funcs.mainContent(mainFrame, menuFrame);
  }
}

const funcs = {};

/* メインページ */
funcs.mainContent = (view, menu) => {
  const indicator = new Indicator();

  // 現在日付
  const n = new Date();
  const now = {
    year: n.getFullYear(),
    month: n.getMonth() + 1,
    day: n.getDate(),
  };

  // view frame
  view.frameElement.addEventListener('load', async (e) => {
    const doc = e.target.contentWindow.document;
    const title = doc.title;

    // Style Sheet を埋め込む
    const style = doc.createElement('style');
    const styleSheet = await runtimeSendMessage({action: 'getStyleSheet'});
    style.textContent = styleSheet;
    doc.head.appendChild(style);

    if (title.startsWith('勤務表')) {
      // 勤務表
      const yearMonth = getYearMonth(doc, now);
      await extendAttendanceList(doc, now, yearMonth)
      .catch(err => console.error(err));
    } else if (title.startsWith('報告書作成')) {
      // 報告書作成
      await extendCreateReport(doc).catch(err => console.error(err));
    } else if (title === '勤務報告システム' && !doc.getElementById('j_idt3')) {
      // トップページ
      await extendTopPage(doc, now).catch(err => console.error(err));
    }
  });
}

// すべてのはじまり
steering().then(() => null).catch((err) => console.error(err));
