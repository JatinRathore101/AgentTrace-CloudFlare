"use client";

import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import { useTheme } from "@mui/material/styles";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/store";
import { optionsSliceActions } from "@/store/slices/optionsSlice";
import { companiesTableSliceActions } from "@/store/slices/companiesTableSlice";
import type { Filters } from "@/store/slices/companiesTableSlice";
import DataTableBody from "@/components/table/dataTableBody";
import { APPBAR_HEIGHT } from "@/constants";
import CompaniesSearchBar from "./companiesSearchBar";
import SaveViewModal from "./saveViewModal";
import ExportCompaniesCsvModal from "./exportCompaniesCsvModal";
import {
  buildRequestBody,
  COMPANY_TABLE_COLUMNS,
  CompanyRow,
} from "./companyTable.config";

export function MainContent() {
  const dispatch = useDispatch();
  const theme = useTheme();
  const { optionsData, optionsLoading, optionsError } = useSelector(
    (state: RootState) => state.options,
  );
  const filters = useSelector(
    (state: RootState) => state.companiesTable.filters,
  );
  const pagination = useSelector(
    (state: RootState) => state.companiesTable.pagination,
  );
  const fetchDataLoading = useSelector(
    (state: RootState) => state.companiesTable.fetchDataLoading,
  );

  const [companiesData, setCompaniesData] = useState<CompanyRow[]>([]);
  const [companiesDomains, setCompaniesDomains] = useState<string[]>([]);
  const [companiesError, setCompaniesError] = useState<string | null>(null);

  const handleSetOptions = async () => {
    dispatch(optionsSliceActions.setOptionsLoading(true));
    try {
      const res = await fetch("/api/get-options");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      dispatch(optionsSliceActions.setOptionsData(json));
      dispatch(
        companiesTableSliceActions.setFilters({
          ...filters,
          maxNumberOfTech: json?.maxTechsInDomain,
        }),
      );
    } catch (err) {
      dispatch(
        optionsSliceActions.setOptionsError(
          err instanceof Error ? err.message : "Failed to fetch options",
        ),
      );
    } finally {
      dispatch(optionsSliceActions.setOptionsLoading(false));
    }
  };

  const fetchCompanies = async (
    currentFilters: Filters,
    page: number,
    rowsPerPage: number,
  ) => {
    dispatch(companiesTableSliceActions.setFetchDataLoading(true));
    setCompaniesError(null);
    try {
      const body = buildRequestBody(currentFilters, page, rowsPerPage);
      const res = await fetch("/api/get-companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setCompaniesData(json.data ?? []);
      setCompaniesDomains(json.domains ?? []);
      dispatch(
        companiesTableSliceActions.setTotalRecords(json.totalCount ?? 0),
      );
    } catch (err) {
      setCompaniesError(
        err instanceof Error ? err.message : "Failed to fetch companies",
      );
    } finally {
      dispatch(companiesTableSliceActions.setFetchDataLoading(false));
    }
  };

  useEffect(() => {
    if (optionsData || optionsLoading) return;
    handleSetOptions();
  }, []);

  useEffect(() => {
    fetchCompanies(filters, pagination.page, pagination.rowsPerPage);
  }, [filters, pagination.page, pagination.rowsPerPage]);

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        p: 3,
        transition: theme.transitions.create("margin", {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
        minHeight: "100vh",
        backgroundColor: theme.palette.background.default,
      }}
    >
      <Box sx={{ height: APPBAR_HEIGHT }} />

      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <CompaniesSearchBar />
        <SaveViewModal />
        <ExportCompaniesCsvModal domains={companiesDomains} />
      </Box>

      {optionsError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {optionsError}
        </Alert>
      )}

      {/* Companies table */}
      <Box sx={{ mt: 4 }}>
        {companiesError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {companiesError}
          </Alert>
        )}
        <DataTableBody<CompanyRow>
          columns={COMPANY_TABLE_COLUMNS}
          data={companiesData}
          page={pagination.page}
          rowsPerPage={pagination.rowsPerPage}
          totalRecords={pagination.totalRecords}
          loading={fetchDataLoading}
          handlePageChange={(value) =>
            dispatch(companiesTableSliceActions.setPage(value))
          }
          handleRowsPerPageChange={(value) => {
            dispatch(companiesTableSliceActions.setPage(0));
            dispatch(companiesTableSliceActions.setRowsPerPage(value));
          }}
          noDataHeading="No companies found"
          noDataSubHeading="Try adjusting your filters"
        />
      </Box>
    </Box>
  );
}
