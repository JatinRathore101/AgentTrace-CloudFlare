"use client";

import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";

interface MultiSelectProps {
  value: string[];
  options: string[];
  placeholder?: string;
  onChange: (value: string[]) => void;
}

const MultiSelect = ({
  value,
  options,
  placeholder = "Select...",
  onChange,
}: MultiSelectProps) => {
  return (
    <Autocomplete
      multiple
      filterSelectedOptions
      size="small"
      options={options}
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={options.length ? placeholder : "Loading..."}
        />
      )}
      sx={{ width: "100%" }}
    />
  );
};

export default MultiSelect;
