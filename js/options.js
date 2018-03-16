function saveOptions() {
  const form = document.forms['options'];

  chrome.storage.sync.set({
    ssl:  form.ssl.checked,
    host: form.host.value,
    port: form.port.value
  });
}

function restoreOptions() {
  chrome.storage.sync.get({
    ssl: false,
    host: '',
    port: 3000
  }, function(items) {
    const form = document.forms['options'];
    form.ssl.checked = items.ssl;
    form.host.value = items.host;
    form.port.value = items.port;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.forms['options'].addEventListener('input', saveOptions);
document.forms['options'].addEventListener('change', saveOptions);
