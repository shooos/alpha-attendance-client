let statusWindow;

const xhr = new XMLHttpRequest();
xhr.onload = () => {
  statusWindow = xhr.responseXML.getElementById('alpha-attendance-client-status-window');
  const footer = document.getElementsByClassName('footer')[0];
  const frameset = document.getElementsByTagName('frameset')[0];

  if (footer != null) {
    document.body.insertBefore(statusWindow, footer);
  } else if (frameset != null) {
    const html = document.getElementsByTagName('html')[0];
    html.insertBefore(statusWindow, frameset);
  }
};
const url = chrome.extension.getURL('/status-window.html');
xhr.open('GET', url, true);
xhr.responseType = 'document';
xhr.send();

const empty = (node) => {
  if (node == null) return;

  for (let child of node.childNodes) {
    node.removeChild(child);
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (statusWindow != null) {
    const user = document.getElementById('alpha-attendance-client-user');
    if (user != null) {
      empty(user);
      user.appendChild(document.createTextNode(message.user));
    }

    const status = document.getElementById('alpha-attendance-client-status');
    if (status != null) {
      empty(status);
      status.appendChild(document.createTextNode(message.status));
    }

    const msg = document.getElementById('alpha-attendance-client-message');
    if (msg != null && message.message != null) {
      empty(msg);
      msg.appendChild(document.createTextNode(message.message));
    }
  }
});
