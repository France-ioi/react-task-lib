/** Query string of the current page as a plain object (first value of each parameter). */
export function getQueryParams(search: string = window.location.search): Record<string, string> {
  const params: Record<string, string> = {};
  new URLSearchParams(search).forEach((value, key) => {
    if (!(key in params)) params[key] = value;
  });
  return params;
}

/** URL of the current page with the given query parameters. */
export function generateTokenUrl(query: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const key of Object.keys(query)) {
    const value = query[key];
    if (key === '' || value === undefined) continue;
    params.append(key, String(value));
  }
  const stringified = params.toString();
  const {protocol, host, pathname} = window.location;
  return `${protocol}//${host}${pathname}${stringified ? `?${stringified}` : ''}`;
}
