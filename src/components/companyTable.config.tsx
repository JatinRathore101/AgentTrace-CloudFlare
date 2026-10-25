"use client";

import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Column } from "@/components/table/dataTableBody";
import { COUNTRY_NAME_MAP } from "@/constants";
import FlagIcon from "./flags/flagIcon";
import { Tooltip } from "@mui/material";
import CustomChip from "./chips/customChip";
import type { Filters } from "@/store/slices/companiesTableSlice";

export type CompanyRow = {
  domain: string;
  companyName?: string;
  companyCategory?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
  tech?: string[];
  techCategory?: string[];
};

export function buildRequestBody(
  filters: Filters,
  page: number,
  rowsPerPage: number,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    skip: page * rowsPerPage,
    limit: rowsPerPage,
  };

  if (filters.searchStr.trim()) body.searchStr = filters.searchStr.trim();
  if (filters.countries.length) body.countries = filters.countries;
  if (filters.companyCategories.length)
    body.companyCategories = filters.companyCategories;
  if (filters.includedTechList.length)
    body.includedTechList = filters.includedTechList;
  if (filters.excludedTechList.length)
    body.excludedTechList = filters.excludedTechList;
  if (filters.includedTechCategoryList.length)
    body.includedTechCategoryList = filters.includedTechCategoryList;
  if (filters.excludedTechCategoryList.length)
    body.excludedTechCategoryList = filters.excludedTechCategoryList;
  body.minNumberOfTech = filters.minNumberOfTech;
  if (filters.maxNumberOfTech >= filters.minNumberOfTech)
    body.maxNumberOfTech = filters.maxNumberOfTech;

  return body;
}

export const COMPANY_TABLE_COLUMNS: Column<CompanyRow>[] = [
  {
    accessor: "company",
    Header: "Company",
    Cell: ({ row: { domain, companyName } }) => (
      <Box sx={{ display: "flex", flexDirection: "column", gap: "1px" }}>
        {typeof companyName === "string" &&
          !["unknown", "null", "undefined", ""]?.includes(
            companyName?.toLowerCase()?.trim(),
          ) && (
            <Typography
              sx={{ fontFamily: "Lato", fontSize: "15px", fontWeight: 600 }}
            >
              {companyName}
            </Typography>
          )}
        <Typography
          sx={{ fontFamily: "monospace", color: "#108FC7", fontSize: "14px" }}
        >
          {domain}
        </Typography>
      </Box>
    ),
  },
  {
    accessor: "companyCategory",
    Header: "Category",
    Cell: ({ value }) =>
      typeof value === "string" &&
      !["unknown", "null", "undefined", ""]?.includes(
        value?.toLowerCase()?.trim(),
      ) ? (
        <Typography
          sx={{ fontFamily: "Lato", fontSize: "15px", fontWeight: 600 }}
        >
          {String(value)}
        </Typography>
      ) : (
        "- - - - - - - - - - - -"
      ),
  },
  {
    accessor: "tech",
    Header: "Technologies",
    Cell: ({ value }) =>
      Array.isArray(value) && value?.length > 0 ? (
        <Tooltip
          title={
            Array.isArray(value) && value?.length > 3 ? value?.join(", ") : ""
          }
        >
          <Box sx={{ display: "flex", gap: "4px" }}>
            <CustomChip
              chipValue={value?.length}
              chipState="PURPLE"
              fontSize="13px"
            />
            {value?.[0] && (
              <CustomChip chipValue={value?.[0]} chipState="GREEN" />
            )}
            {value?.[1] && (
              <CustomChip chipValue={value?.[1]} chipState="BLUE" />
            )}
            {value?.[2] && (
              <CustomChip chipValue={value?.[2]} chipState="YELLOW" />
            )}
            {value?.length > 3 && (
              <Typography sx={{ fontFamily: "Lato", fontSize: "15px" }}>
                ...
              </Typography>
            )}
          </Box>
        </Tooltip>
      ) : (
        "- - - - - - - - - - - -"
      ),
  },
  {
    accessor: "country",
    Header: "Country",
    Cell: ({ value }) =>
      COUNTRY_NAME_MAP[String(value)] ? (
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Typography
            sx={{ fontFamily: "Lato", fontSize: "15px", fontWeight: 600 }}
          >
            {COUNTRY_NAME_MAP[String(value)]}
          </Typography>
          <FlagIcon code={String(value)} />
        </Box>
      ) : (
        "- - - - - - - - - - - -"
      ),
  },
  {
    accessor: "address",
    Header: "Address",
    Cell: ({ row: { city, state, zipcode } }) => {
      const address = [
        ...(typeof city === "string" ? [city?.trim()] : []),
        ...(typeof zipcode === "string"
          ? [zipcode?.toUpperCase()?.trim()]
          : []),
        ...(typeof state === "string" ? [state?.trim()] : []),
      ]
        ?.filter(
          (value) =>
            Boolean(value) &&
            !["unknown", "null", "undefined", ""]?.includes(
              value?.toLowerCase()?.trim(),
            ),
        )
        ?.join(", ")
        ?.trim();

      if (address) {
        return (
          <Typography
            sx={{ fontFamily: "Lato", fontSize: "15px", fontWeight: 600 }}
          >
            {address}
          </Typography>
        );
      } else {
        return "- - - - - - - - - - - -";
      }
    },
  },
];
