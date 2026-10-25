import { createTheme } from "@mui/material/styles";
import type { PaletteMode } from "@mui/material";

export function createAppTheme(mode: PaletteMode) {
  return createTheme({
    palette: {
      mode,
      ...(mode === "dark"
        ? {
            background: {
              default: "#000000",
              paper: "#0F0F10",
            },
            text: {
              primary: "#FFFFFF",
              secondary: "#919EAB",
            },
            primary: {
              main: "#212B36",
              light: "#222223",
            },
            secondary: {
              main: "#B3C3D1",
              dark: "#27282D",
              light: "#0F0F10",
            },
            success: {
              main: "#009D7B",
            },
            error: {
              main: "#FF8884",
            },
            warning: {
              main: "#FFAA55",
            },
            info: {
              main: "#40BFF7",
              light: "#222223",
              dark: "linear-gradient(135deg, #202B36 0%, #000000 100%)",
            },
          }
        : {
            background: {
              default: "#FFFFFF",
              paper: "#FAFAFA",
            },
            text: {
              primary: "#000000",
              secondary: "#637381",
            },
            primary: {
              main: "#AAAAAA",
              light: "#F4F4F5",
            },
            secondary: {
              main: "#637381",
              dark: "#E4E7EB",
              light: "#FAFAFA",
            },
            success: {
              main: "#009D7B",
            },
            error: {
              main: "#D76662",
            },
            warning: {
              main: "#FFAA55",
            },
            info: {
              main: "#108FC7",
              light: "#F0F0F1",
              dark: "linear-gradient(135deg, rgba(255, 126, 95, 0.10), rgba(28, 146, 210, 0.15)), #fff",
            },
          }),
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: "inherit",
      h6: { fontWeight: 600 },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: { backgroundImage: "none" },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: { backgroundImage: "none" },
        },
      },
    },
  });
}
