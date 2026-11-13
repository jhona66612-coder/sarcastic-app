const key = "roast.session.v1";
export async function readToken() {
  return typeof window === "undefined"
    ? null
    : window.sessionStorage.getItem(key);
}
export async function writeToken(token: string) {
  if (token) window.sessionStorage.setItem(key, token);
  else window.sessionStorage.removeItem(key);
}
