import { createSlice, current } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface Filter {
  filterName: string;
  searchStr: string;
  countries: string[];
  companyCategories: string[];
  includedTechList: string[];
  excludedTechList: string[];
  minNumberOfTech: number;
  maxNumberOfTech: number;
  includedTechCategoryList: string[];
  excludedTechCategoryList: string[];
}

const STORAGE_KEY = "savedFilters";

function loadFromLocalStorage(): Filter[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(filters: Filter[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
}

export const savedFiltersSlice = createSlice({
  name: "savedFilters",
  initialState: loadFromLocalStorage() as Filter[],
  reducers: {
    addFilter(state, action: PayloadAction<Filter>) {
      state.push(action.payload);
      saveToLocalStorage(current(state));
    },
    deleteFilter(state, action: PayloadAction<string>) {
      const idx = state.findIndex((f) => f.filterName === action.payload);
      if (idx !== -1) state.splice(idx, 1);
      saveToLocalStorage(current(state));
    },
  },
});

export const savedFiltersSliceActions = savedFiltersSlice.actions;
export default savedFiltersSlice.reducer;
