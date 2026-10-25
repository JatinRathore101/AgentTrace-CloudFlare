"use client";

import Box from "@mui/material/Box";
import { useSelector } from "react-redux";
import { APPBAR_HEIGHT, SIDEBAR_WIDTH } from "@/constants";
import type { RootState } from "@/store";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

/** Header + sidebar + scrollable content area shared by every page. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const sidebarOpen = useSelector((state: RootState) => state.ui?.sidebarOpen ?? true);
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Header />
      <Sidebar />
      <Box
        component="main"
        sx={{
          pt: `${APPBAR_HEIGHT + 24}px`,
          pb: 4,
          px: { xs: 2, md: 4 },
          ml: { xs: 0, md: sidebarOpen ? `${SIDEBAR_WIDTH}px` : 0 },
          transition: "margin-left 200ms ease",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
