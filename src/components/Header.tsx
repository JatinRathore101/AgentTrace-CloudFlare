"use client";

import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import MenuIcon from "@mui/icons-material/Menu";
import TimelineIcon from "@mui/icons-material/Timeline";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { useTheme } from "@mui/material/styles";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/store";
import { themeSliceActions } from "@/store/slices/themeSlice";
import { uiSliceActions } from "@/store/slices/uiSlice";

export function Header() {
  const dispatch = useDispatch();
  const theme = useTheme();
  const themeMode = useSelector((state: RootState) => state.theme?.themeMode ?? "dark");
  const sidebarOpen = useSelector((state: RootState) => state.ui?.sidebarOpen ?? true);

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: theme.zIndex.drawer + 1,
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <IconButton
          edge="start"
          aria-label="toggle sidebar"
          onClick={() => dispatch(uiSliceActions.setSidebarOpen(!sidebarOpen))}
          sx={{ color: theme.palette.text.primary }}
        >
          <MenuIcon />
        </IconButton>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexGrow: 1 }}>
          <TimelineIcon sx={{ color: theme.palette.info.main }} />
          <Typography sx={{ fontSize: { xs: "18px", md: "21px" }, fontWeight: 700 }}>AgentTrace</Typography>
          <Typography sx={{ display: { xs: "none", md: "block" }, color: "text.secondary", fontSize: "14px", ml: 1 }}>
            AI agent observability &amp; debugging
          </Typography>
        </Box>
        <IconButton
          onClick={() => dispatch(themeSliceActions.toggleThemeMode())}
          aria-label="toggle theme"
          sx={{ color: theme.palette.text.primary }}
        >
          {themeMode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
