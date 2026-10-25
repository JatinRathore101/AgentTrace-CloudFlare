import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import uiReducer from "./slices/uiSlice";
import optionsReducer from "./slices/optionsSlice";
import themeReducer from "./slices/themeSlice";
import companiesTableReducer from "./slices/companiesTableSlice";
import savedFiltersReducer from "./slices/savedFiltersSlice";
import { createLocalStorage, createSessionStorage } from "./storage";

// Theme is persisted in localStorage so it survives across sessions
const themePersistConfig = {
  key: "theme",
  storage: createLocalStorage(),
};

// UI state is persisted in sessionStorage so it resets on tab close
const rootPersistConfig = {
  key: "app-root",
  storage: createSessionStorage(),
  whitelist: ["ui", "options", "companiesTable"],
};

const rootReducer = combineReducers({
  ui: uiReducer,
  theme: persistReducer(themePersistConfig, themeReducer),
  options: optionsReducer,
  companiesTable: companiesTableReducer,
  savedFilters: savedFiltersReducer,
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
