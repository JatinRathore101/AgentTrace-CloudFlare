import type { Storage } from "redux-persist";
import { noopStorage } from "./noopStorage";

export function createLocalStorage(): Storage {
  if (typeof window === "undefined") return noopStorage;

  return {
    getItem: (key) => Promise.resolve(window.localStorage.getItem(key)),
    setItem: (key, value) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // ignore quota errors
      }
      return Promise.resolve();
    },
    removeItem: (key) => {
      window.localStorage.removeItem(key);
      return Promise.resolve();
    },
  };
}
