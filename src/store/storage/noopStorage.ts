import type { Storage } from "redux-persist";

export const noopStorage: Storage = {
  getItem: (_key: string) => Promise.resolve<string | null>(null),
  setItem: (_key: string, _value: string) => Promise.resolve<void>(undefined),
  removeItem: (_key: string) => Promise.resolve<void>(undefined),
};
