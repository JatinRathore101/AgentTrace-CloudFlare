"use client";

import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import ListAltIcon from "@mui/icons-material/ListAlt";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import { APPBAR_HEIGHT, SIDEBAR_WIDTH } from "@/constants";
import type { RootState } from "@/store";

const NAV = [
  { href: "/", label: "Runs", icon: <ListAltIcon fontSize="small" /> },
  { href: "/compare", label: "Compare", icon: <CompareArrowsIcon fontSize="small" /> },
];

export function Sidebar() {
  const theme = useTheme();
  const pathname = usePathname() ?? "/";
  const sidebarOpen = useSelector((state: RootState) => state.ui?.sidebarOpen ?? true);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" || pathname.startsWith("/runs") : pathname.startsWith(href);

  return (
    <Box
      component="nav"
      sx={{
        position: "fixed",
        top: APPBAR_HEIGHT,
        left: 0,
        bottom: 0,
        width: SIDEBAR_WIDTH,
        transform: sidebarOpen ? "none" : `translateX(-${SIDEBAR_WIDTH}px)`,
        transition: "transform 200ms ease",
        borderRight: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
        display: "flex",
        flexDirection: "column",
        zIndex: theme.zIndex.drawer,
      }}
    >
      <List sx={{ px: 1, pt: 2 }}>
        {NAV.map((item) => (
          <ListItemButton
            key={item.href}
            component={Link}
            href={item.href}
            selected={isActive(item.href)}
            sx={{ borderRadius: 1, mb: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ mt: "auto", p: 2 }}>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
          Workers AI · Agents SDK · Durable Objects
        </Typography>
      </Box>
    </Box>
  );
}
