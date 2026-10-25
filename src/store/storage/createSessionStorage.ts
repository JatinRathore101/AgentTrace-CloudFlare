import type { Storage } from "redux-persist";
import { noopStorage } from "./noopStorage";

export function createSessionStorage(): Storage {
  if (typeof window === "undefined") return noopStorage;

  return {
    getItem: (key) => Promise.resolve(window.sessionStorage.getItem(key)),
    setItem: (key, value) => {
      try {
        window.sessionStorage.setItem(key, value);
      } catch {
        // ignore quota errors
      }
      return Promise.resolve();
    },
    removeItem: (key) => {
      window.sessionStorage.removeItem(key);
      return Promise.resolve();
    },
  };
}
