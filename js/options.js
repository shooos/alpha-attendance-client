function saveOptions() {
  const form = document.forms['options'];

  chrome.storage.sync.set({
    host: form.host.value,
    port: form.port.value
  });
}

function restoreOptions() {
  chrome.storage.sync.get({
    host: 'host',
    port: 3000
  }, function(items) {
    const form = document.forms['options'];
    form.host.value = items.host;
    form.port.value = items.port;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.forms['options'].addEventListener('input', saveOptions);
