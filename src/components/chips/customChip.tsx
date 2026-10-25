import React from "react";
import { Typography } from "@mui/material";

type ChipState = "BLUE" | "PURPLE" | "RED" | "GREEN" | "YELLOW" | "GREY";

const getChipColors = (color?: ChipState): string => {
  switch (color) {
    case "PURPLE":
      return "#6F6DBE";
    case "RED":
      return "#D76662";
    case "GREEN":
      return "#4DBAA3";
    case "YELLOW":
      return "#FFA500";
    case "GREY":
      return "#919EAB";
    case "BLUE":
      return "#007FC7";
    default:
      return "#A8699F";
  }
};

interface CustomChipProps {
  chipValue: string | number | null | undefined;
  chipState?: ChipState;
  fontSize?: string;
}

const CustomChip: React.FC<CustomChipProps> = ({
  chipValue,
  chipState,
  fontSize = "12px",
}) => {
  if (
    (!chipValue && chipValue !== 0) ||
    (typeof chipValue === "string" && !chipValue.trim())
  ) {
    return null;
  }

  const color = getChipColors(chipValue === 0 ? "GREY" : chipState);

  return (
    <Typography
      sx={{
        color,
        background: `${color}10`,
        border: `1px solid ${color}50`,
        textAlign: "center",
        padding: "2px 6px 0px 6px",
        borderRadius: "4px",
        fontSize,
        fontStyle: "normal",
        width: "fit-content",
        fontFamily: "Lato",
        fontWeight: 700,
      }}
    >
      {typeof chipValue === "string" ? chipValue?.trim() : chipValue}
    </Typography>
  );
};

export default CustomChip;
