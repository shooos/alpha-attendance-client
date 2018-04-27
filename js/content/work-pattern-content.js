const requestParams = {};
location.search.substr(1).split('&').forEach((e) => {
  const e_ = e.split('=');
  requestParams[e_[0]] = e_[1];
});

const extract = () => {
  const workPatternData = {
    workPatternId: requestParams.servTypeId,
  };

  // 勤務形態名称（省略形）
  const name = document.getElementsByClassName('name')[0];
  workPatternData.label = name.textContent.match(/\((.*)\)/)[1];

  // 形態情報
  const valuesTrs = document.querySelectorAll('table.values tr');
  for (let tr of valuesTrs) {
    const nameTag = tr.querySelector('th.values b');
    const valueTag = tr.querySelector('td.values');
    if (nameTag && valueTag) {
      const name = nameTag.textContent;
      const value = valueTag.textContent;
      const matches = value.match(/(\d\d:\d\d)～(\d\d:\d\d)/);

      switch (name) {
      case '就業時間帯':
        workPatternData.startWorkingTime = matches[1];
        workPatternData.endWorkingTime = matches[2];
        break;
      case '標準就業時間帯':
        workPatternData.startStandardTime = matches[1];
        workPatternData.endStandardTime = matches[2];
        break;
      case 'コアタイム':
        workPatternData.startCoreTime = matches[1];
        workPatternData.endCoreTime = matches[2];
        break;
      case 'フレキシブル勤務(コアタイム前)':
        workPatternData.startBeforeCoreTime = matches[1];
        workPatternData.endBeforeCoreTime = matches[2];
        break;
      }
    }
  }

  // タイムテーブル
  const hours = workPatternData.hours = [];
  const timeTables = Array.apply(null, document.querySelectorAll('table.values ~ table'));
  timeTables.pop();
  for (let timeTable of timeTables) {
    const times = Array.apply(null, timeTable.querySelectorAll('td.time'));
    const types = Array.apply(null, timeTable.querySelectorAll('td.mainTime'));

    types.forEach((type, index) => {
      const hour = {};
      const time = times[index];
      const matches = time.textContent.match(/(\d\d:\d\d)\n/);
      if (!matches || matches.length < 2) return;

      hour.startTime = matches[1];
      hour.breakTime = type.classList.contains('rest');
      hours.push(hour);
    });
  }

  return workPatternData;
}

chrome.runtime.sendMessage({
  action: 'getWorkPattern',
  values: {
    id: requestParams.servTypeId
  },
}, (response) => {
  const button = document.createElement('div');
  button.classList.add('alpha-attendance-button');

  let action;
  if (response.data && response.data.length) {
    button.textContent = 'Update';
  } else {
    button.textContent = 'Register';
  }

  button.addEventListener('mousedown', () => {
    const data = extract();

    chrome.runtime.sendMessage({
      action: 'registerWorkPattern',
      values: data,
    }, (response) => {
      if (response.error) return;
      button.textContent = 'Update';
    });
  });

  const titleElement = document.getElementsByClassName('name')[0];
  titleElement.appendChild(button);
});
