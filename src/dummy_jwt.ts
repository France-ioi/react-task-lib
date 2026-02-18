// Code extracted from miniPlatform.js
export const jwt = {
    isDummy: true,
    sign: function (data: any, ..._args: any[]) {
        var header = { alg: "HS256", typ: "JWT" };
        // Dummy signature because it would require
        // installing a crypto library to calculate the real one
        var signature = 'bcM4TMh3PG77_0P7DwqeUAR07XKIvgNce58uJEEP_6A';
        var claim = Object.assign(data, { "sub": 1234567890 });

        return window.jwt.encode64(JSON.stringify(header)) + '.' +
            window.jwt.encode64(JSON.stringify(claim)) + '.' +
            (signature || '');
    },
    decode: function (token: string) {
        var parts = token.split('.');

        return JSON.parse(window.jwt.decode64(parts[1]));
    },
    encode64: function (value: string) {
        var encoded = btoa(unescape(encodeURIComponent(value)));

        return encoded
            .replace(/\//g, '_')
            .replace(/\+/g, '-')
            .replace(/=+$/g, '');
    },
    decode64: function (value: string) {
        return decodeURIComponent(escape(atob(value)));
    }
}
