import { createSlice } from "@reduxjs/toolkit";

export interface OptionsData {
  maxTechsInDomain?: number;
  companyCategoryOptions: string[];
  countryOptions: string[];
  techOptions: string[];
  techCategoryOptions: string[];
}

interface OptionsState {
  optionsData: OptionsData | null;
  optionsLoading: boolean;
  optionsError: string | null;
}

const initialState: OptionsState = {
  optionsData: null,
  optionsLoading: false,
  optionsError: null,
};

export const optionsSlice = createSlice({
  name: "options",
  initialState,
  reducers: {
    setOptionsData(state, action) {
      state.optionsData = action.payload;
    },
    setOptionsLoading(state, action) {
      state.optionsLoading = action.payload;
    },
    setOptionsError(state, action) {
      state.optionsError = action.payload;
    },
  },
});

export const optionsSliceActions = optionsSlice.actions;
export default optionsSlice.reducer;
