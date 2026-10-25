import React from "react";
import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";

type RangeSliderProps = {
  value: [number, number];
  setValue: (value: [number, number]) => void;
  minVal?: number;
  maxVal?: number;
};

export default function RangeSlider({
  value,
  setValue,
  minVal = 0,
  maxVal = 100,
}: RangeSliderProps) {
  const handleChange = (_: Event, newValue: number | number[]) => {
    setValue(newValue as [number, number]);
  };

  return (
    <Box sx={{ width: 300 }}>
      <Slider
        color="info"
        value={value}
        onChange={handleChange}
        min={minVal}
        max={maxVal}
        valueLabelDisplay="auto"
      />
    </Box>
  );
}
