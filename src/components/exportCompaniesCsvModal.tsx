import React, { useState } from "react";
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Button,
  IconButton,
  Modal,
  Typography,
  CircularProgress,
} from "@mui/material";
import { RxCross2 } from "react-icons/rx";
import CustomChip from "./chips/customChip";
import { MdOutlineFileDownload } from "react-icons/md";
import { VscExport } from "react-icons/vsc";

type Props = {
  domains: string[];
};

const ExportCompaniesCsvModal: React.FC<Props> = ({ domains }) => {
  const theme = useTheme();
  const [open, setOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const handleDownload = async (): Promise<void> => {
    setLoading(true);

    try {
      const response = await fetch("/api/export-companies-csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domains,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const blob = await response.blob();

      // Extract filename from header if present
      const disposition = response.headers.get("Content-Disposition");
      let filename = "companies.csv";

      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?(.+?)"?$/);
        if (match?.[1]) {
          filename = match[1];
        }
      }

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;

      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);

      setOpen(false);
    } catch (error) {
      console.error(
        error instanceof Error ? error.message : "Failed to download CSV",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        endIcon={<VscExport size={24} />}
        sx={{
          minWidth: "200px",
          textTransform: "none",
          background: theme.palette.success.main,
          fontWeight: 600,
          color: theme.palette.background.default,
        }}
        variant="contained"
        onClick={() => setOpen(true)}
        disabled={!domains?.length}
      >
        Export Data
      </Button>

      <Modal
        disableAutoFocus
        open={open}
        onClose={() => setOpen(false)}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            background: theme.palette.background.paper,
            borderRadius: "16px",
            boxShadow: 24,
            overflow: "auto",
            width: "min(600px,90vw)",
            border: `1px solid ${theme.palette.secondary.dark}`,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mt: 2,
              p: "16px 16px 0px 32px",
              alignItems: "center",
              fontSize: { md: "24px", xs: "18px" },
              color: theme.palette.text.primary,
              fontWeight: 600,
              position: "relative",
            }}
          >
            Export Companies Data
            <IconButton
              sx={{ position: "absolute", top: 0, right: "16px" }}
              onClick={() => setOpen(false)}
            >
              <RxCross2 size={20} color={theme.palette.text.secondary} />
            </IconButton>
          </Box>

          <Box
            sx={{
              fontSize: { md: "14px", xs: "12px" },
              color: theme.palette.text.secondary,
              px: 4,
              py: 2,
              my: 2,
              wordWrap: "break-word",
              background: theme.palette.background.default,
              borderTop: `1px solid ${theme.palette.secondary.dark}`,
              borderBottom: `1px solid ${theme.palette.secondary.dark}`,
              minHeight: "100px",
            }}
          >
            <Typography
              sx={{
                color: theme.palette.text.primary,
                fontWeight: 600,
                fontSize: { xs: "15px", md: "17px" },
              }}
            >
              Download companies data as CSV
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Typography
                sx={{
                  color: theme.palette.text.primary,
                  fontWeight: 600,
                  fontSize: { xs: "15px", md: "17px" },
                }}
              >
                {`Number of companies`}
              </Typography>
              <CustomChip
                chipValue={domains?.length}
                chipState="PURPLE"
                fontSize="14px"
              />
            </Box>

            <Typography sx={{ color: theme.palette.text.secondary, mt: 8 }}>
              {`Note: The CSV may contain more rows than ${domains?.length} as
              single Company can have multiple technologies resulting in
              multiple rows`}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              px: 4,
              gap: 2,
              mb: 4,
            }}
          >
            <Button
              sx={{
                width: "110px",
                textTransform: "none",
                fontWeight: 600,
                color: theme.palette.text.secondary,
                border: `1px solid ${theme.palette.text.secondary}70`,
              }}
              variant="outlined"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>

            <Button
              sx={{
                width: "200px",
                textTransform: "none",
                background: theme.palette.info.main,
                fontWeight: 600,
                color: theme.palette.background.default,
              }}
              variant="contained"
              onClick={handleDownload}
              disabled={!domains?.length || loading}
              startIcon={
                loading ? (
                  <CircularProgress
                    size={16}
                    style={{ color: theme.palette.background.default }}
                  />
                ) : (
                  <MdOutlineFileDownload size={24} />
                )
              }
            >
              {loading ? "Downloading..." : "Download as CSV"}
            </Button>
          </Box>
        </Box>
      </Modal>
    </>
  );
};

export default ExportCompaniesCsvModal;
