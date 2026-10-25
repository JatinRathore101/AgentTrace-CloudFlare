"use client";

import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { Box, IconButton, InputAdornment, TextField, Typography } from "@mui/material";
import type React from "react";
import { useEffect, useState } from "react";

type SearchBarProps = {
  label?: string;
  placeholder?: string;
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  debounceMs?: number;
};

const SearchBar: React.FC<SearchBarProps> = ({
  label,
  placeholder = "Search...",
  value,
  setValue,
  error = false,
  helperText = "",
  disabled = false,
  debounceMs = 300,
}) => {
  const [inputValue, setInputValue] = useState<string>(value);

  // Sync with parent if value changes externally
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Debounce update
  useEffect(() => {
    const timer = setTimeout(() => {
      setValue(inputValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [inputValue, setValue, debounceMs]);

  return (
    <>
      {label && (
        <Typography
          sx={{
            color: (theme) => theme.palette.text.primary,
            fontSize: "14px",
            fontWeight: 400,
            mb: 1,
          }}
        >
          {label}
        </Typography>
      )}

      <TextField
        size="small"
        fullWidth
        disabled={disabled}
        placeholder={placeholder}
        hiddenLabel
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        error={error}
        slotProps={{
          input: {
            startAdornment: (
              <Box sx={{ mr: 2, display: "flex", alignItems: "center" }}>
                <SearchIcon fontSize="small" color="action" />
              </Box>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {inputValue && (
                  <IconButton onClick={() => setInputValue("")} edge="end" aria-label="clear">
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
              </InputAdornment>
            ),
          },
        }}
      />

      {helperText && (
        <Typography
          sx={{
            color: (theme) => theme.palette.text.secondary,
            fontSize: "12px",
            fontWeight: 400,
            mt: "4px",
          }}
        >
          {helperText}
        </Typography>
      )}
    </>
  );
};

export default SearchBar;
