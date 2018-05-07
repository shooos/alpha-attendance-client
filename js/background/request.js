window.request = {};

request.request = async (method, url, headers, data) => {
  const init = {
    method: method,
    headers: headers
  };

  if (!headers) {
    init.headers = new Headers();
  }
  if (!init.headers.has('Content-Type')) {
    init.headers.append('Content-Type', 'application/json');
  }

  if ((method === 'PUT' || method === 'POST') && data) {
    init.body = JSON.stringify(data);
  }

  const response = await fetch(url, init);
  if (!response.ok) throw new Error(response.statusText);

  const contentType = response.headers.get('Content-Type');

  switch (contentType.split(';')[0]) {
  case 'application/json':
    return response.json();
  default:
    return response.text();
  }
}

request.head = async (url) => {
  const response = await request.request('HEAD', url);
  return response;
}

request.get = async (url, headers) => {
  const response = await request.request('GET', url, headers);
  return response;
}

request.post = async (url, headers, data) => {
  const response = await request.request('POST', url, headers, data);
  return response;
}

request.put = async (url, headers, data) => {
  const response = await request.request('PUT', url, headers, data);
  return response;
}
