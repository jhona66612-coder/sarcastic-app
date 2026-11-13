import * as SecureStore from "expo-secure-store";
const key = "roast.session.v1";
export const readToken = () => SecureStore.getItemAsync(key);
export const writeToken = (token: string) =>
  token
    ? SecureStore.setItemAsync(key, token)
    : SecureStore.deleteItemAsync(key);
