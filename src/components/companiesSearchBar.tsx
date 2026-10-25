import React, { useState } from "react";
import SearchBar from "./searchbar/searchbar";
import { Button, CircularProgress, useTheme } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { companiesTableSliceActions } from "@/store/slices/companiesTableSlice";
import { RootState } from "@/store";
import { FaSearch } from "react-icons/fa";

const CompaniesSearchBar = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const filters = useSelector(
    (state: RootState) => state.companiesTable.filters,
  );
  const fetchDataLoading = useSelector(
    (state: RootState) => state.companiesTable.fetchDataLoading,
  );
  const [searchStr, setSearchStr] = useState<string>(filters.searchStr);
  const handleApply = () => {
    dispatch(companiesTableSliceActions.setSearchStr(searchStr?.trim()));
  };

  return (
    <React.Fragment>
      <SearchBar
        label=""
        placeholder={`Search by company name or domain (e.g., google.com or .co.uk)`}
        value={searchStr}
        setValue={(v) => setSearchStr(v)}
      />
      <Button
        startIcon={
          fetchDataLoading ? (
            <CircularProgress
              size={16}
              style={{ color: theme.palette.background.default }}
            />
          ) : (
            <FaSearch size={16} />
          )
        }
        sx={{
          minWidth: "140px",
          textTransform: "none",
          background: theme.palette.info.main,
          fontWeight: 600,
          color: theme.palette.background.default,
        }}
        variant="contained"
        {...(!fetchDataLoading && { onClick: handleApply })}
      >
        {fetchDataLoading ? "Searching..." : "Search"}
      </Button>
    </React.Fragment>
  );
};

export default CompaniesSearchBar;
