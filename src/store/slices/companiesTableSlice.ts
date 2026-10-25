import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface Filters {
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

interface Pagination {
  page: number;
  rowsPerPage: number;
  totalRecords: number;
}

interface CompaniesTableState {
  filters: Filters;
  pagination: Pagination;
  fetchDataLoading: boolean;
}

const initialFilters: Filters = {
  searchStr: "",
  countries: [],
  companyCategories: [],
  includedTechList: [],
  excludedTechList: [],
  minNumberOfTech: 0,
  maxNumberOfTech: 0,
  includedTechCategoryList: [],
  excludedTechCategoryList: [],
};

const initialPagination: Pagination = {
  page: 0,
  rowsPerPage: 5,
  totalRecords: 0,
};

const initialState: CompaniesTableState = {
  filters: initialFilters,
  pagination: initialPagination,
  fetchDataLoading: false,
};

export const companiesTableSlice = createSlice({
  name: "companiesTable",
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Filters>) {
      state.filters = action.payload;
      state.pagination.page = 0;
    },
    setSearchStr(state, action: PayloadAction<string>) {
      state.filters.searchStr = action.payload;
      state.pagination.page = 0;
    },
    setPage(state, action: PayloadAction<number>) {
      state.pagination.page = action.payload;
    },
    setRowsPerPage(state, action: PayloadAction<number>) {
      state.pagination.rowsPerPage = action.payload;
    },
    setTotalRecords(state, action: PayloadAction<number>) {
      state.pagination.totalRecords = action.payload;
    },
    setFetchDataLoading(state, action: PayloadAction<boolean>) {
      state.fetchDataLoading = action.payload;
    },
  },
});

export const companiesTableSliceActions = companiesTableSlice.actions;
export default companiesTableSlice.reducer;
