import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { FLUSH, PAUSE, PERSIST, PURGE, persistReducer, persistStore, REGISTER, REHYDRATE } from "redux-persist";
import themeReducer from "./slices/themeSlice";
import uiReducer from "./slices/uiSlice";
import { createLocalStorage, createSessionStorage } from "./storage";

// Theme is persisted in localStorage so it survives across sessions.
const themePersistConfig = {
  key: "theme",
  storage: createLocalStorage(),
};

// UI state is persisted in sessionStorage so it resets on tab close.
const rootPersistConfig = {
  key: "app-root",
  storage: createSessionStorage(),
  whitelist: ["ui"],
};

const rootReducer = combineReducers({
  ui: uiReducer,
  theme: persistReducer(themePersistConfig, themeReducer),
});

export const store = configureStore({
  reducer: persistReducer(rootPersistConfig, rootReducer),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
