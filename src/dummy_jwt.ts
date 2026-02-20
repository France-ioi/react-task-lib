// Code extracted from miniPlatform.js
function sign(data: any, ..._args: any[]) {
  var header = { alg: "HS256", typ: "JWT" };
  // Dummy signature because it would require
  // installing a crypto library to calculate the real one
  var signature = 'bcM4TMh3PG77_0P7DwqeUAR07XKIvgNce58uJEEP_6A';
  var claim = Object.assign(data, { "sub": 1234567890 });

  return encode64(JSON.stringify(header)) + '.' +
  encode64(JSON.stringify(claim)) + '.' +
  (signature || '');
}
function decode(token: string) {
  var parts = token.split('.');
  return JSON.parse(decode64(parts[1]));
}
function encode64(value: string) {
  // encode in base64
  var encoded = btoa(unescape(encodeURIComponent(value)));
  // base64 -> base64url
  return encoded
    .replace(/\//g, '_')
    .replace(/\+/g, '-')
    .replace(/=+$/g, '');
}
function decode64(value: string) {
  // base64url -> base64 (padding is optional for atob)
  var v = value.replace(/-/g, '+').replace(/_/g, '/');
  // decode base64
  return decodeURIComponent(escape(atob(v)));
}

export const jwt = {
  isDummy: true,
  sign,
  decode,
  encode64,
  decode64
}
