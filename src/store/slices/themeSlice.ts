import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { PaletteMode } from "@mui/material";

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
