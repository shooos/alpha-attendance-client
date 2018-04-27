const func = () => {
  transform_url = (a) => {
    const c = fgt_sslvpn_transform_url_path(a, !1, "web");
    const b = window.open(c);
    try {
      b.opener = null
    } catch (d) {console.error(d);}
  }
}

const str = 'javascript: (' + func.toString().replace(/\n/g, '').replace(/\s/g, '%20') + ')()';
location.href = str;
