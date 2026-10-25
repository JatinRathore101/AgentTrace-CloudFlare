import type { PaletteMode } from "@mui/material";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";

interface ThemeState {
  themeMode: PaletteMode;
}

const initialState: ThemeState = {
  themeMode: "dark",
};

export const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setThemeMode(state, action: PayloadAction<PaletteMode>) {
      state.themeMode = action.payload;
    },
    toggleThemeMode(state) {
      state.themeMode = state.themeMode === "dark" ? "light" : "dark";
    },
  },
});

export const themeSliceActions = themeSlice.actions;
export default themeSlice.reducer;
