"use client";

import Box from "@mui/material/Box";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { MainContent } from "@/components/MainContent";

export default function Home() {
  return (
    <Box sx={{ display: "flex" }}>
      <Header />
      <Sidebar />
      <MainContent />
    </Box>
  );
}
