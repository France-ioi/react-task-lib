import {jwt, type TokenPayload} from './jwt';
import {getQueryParams} from './url';

/**
 * The task token when no platform provides one — same behavior as TaskToken in bebras
 * miniPlatform.js (which defines `window.task_token`).
 */
export interface TaskTokenLike {
  update(data: TokenPayload): void;
  get(callback?: (token: string) => void): string;
  getAnswerToken(answer: string, callback?: (token: string) => void): string;
}

export class TaskToken implements TaskTokenLike {
  readonly data: TokenPayload;
  private readonly queryToken: string | undefined;

  constructor(data: TokenPayload) {
    this.data = {...data, sHintsRequested: '[]'};
    this.queryToken = getQueryParams()['sToken'];
  }

  update(newData: TokenPayload): void {
    Object.assign(this.data, newData);
  }

  get(callback?: (token: string) => void): string {
    const token = jwt.isDummy && this.queryToken ? this.queryToken : jwt.sign(this.data);
    if (callback) setTimeout(() => callback(token), 0);
    return token;
  }

  getAnswerToken(answer: string, callback?: (token: string) => void): string {
    const token = jwt.sign({...this.data, sAnswer: answer});
    if (callback) setTimeout(() => callback(token), 0);
    return token;
  }

  addHintRequest(hintToken: string, callback?: (token: string) => void): string {
    let hint: unknown = hintToken;
    try {
      hint = jwt.decode<{askedHint: unknown}>(hintToken).askedHint;
    } catch {
      // not a token: keep the raw value
    }
    const hints = JSON.parse(this.data['sHintsRequested'] as string) as unknown[];
    if (hints.indexOf(hint) === -1) {
      hints.push(hint);
      this.data['sHintsRequested'] = JSON.stringify(hints);
    }
    return this.get(callback);
  }
}
