/**
 * Dummy JWT, as in bebras miniPlatform.js: tokens are readable but not really signed
 * (the signature is a constant). Real signatures are handled by the platform / graders.
 */
export type TokenPayload = Record<string, unknown>;

const DUMMY_SIGNATURE = 'bcM4TMh3PG77_0P7DwqeUAR07XKIvgNce58uJEEP_6A';

export function encode64(value: string): string {
  return btoa(unescape(encodeURIComponent(value)))
    .replace(/\//g, '_')
    .replace(/\+/g, '-')
    .replace(/=+$/g, '');
}

export function decode64(value: string): string {
  return decodeURIComponent(escape(atob(value.replace(/-/g, '+').replace(/_/g, '/'))));
}

export const jwt = {
  isDummy: true,
  sign(data: TokenPayload): string {
    const header = {alg: 'HS256', typ: 'JWT'};
    const claim = {...data, sub: 1234567890};
    return `${encode64(JSON.stringify(header))}.${encode64(JSON.stringify(claim))}.${DUMMY_SIGNATURE}`;
  },
  /** Throws on malformed tokens. */
  decode<T = TokenPayload>(token: string): T {
    const payload = token.split('.')[1];
    if (payload === undefined) throw new Error('Invalid token');
    return JSON.parse(decode64(payload)) as T;
  },
};
