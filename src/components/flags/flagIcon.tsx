import { COUNTRY_NAME_MAP } from "@/constants";
import { Box } from "@mui/material";

interface FlagProps {
  code: string;
}

export default function FlagIcon({ code }: FlagProps) {
  if (!(typeof code === "string" && COUNTRY_NAME_MAP?.[code])) {
    return null;
  }
  return (
    <Box
      sx={{
        minWidth: "30px",
        maxWidth: "30px",
        minHeight: "17px",
        maxHeight: "17px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "4px",
      }}
    >
      <img
        src={`https://flagcdn.com/w20/${code.toLowerCase()?.trim()}.png`}
        alt={code}
        width={"26px"}
        style={{ objectFit: "cover", borderRadius: "2px" }}
      />
    </Box>
  );
}
