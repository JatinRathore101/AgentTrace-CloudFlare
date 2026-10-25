"use client";

import React, { useState } from "react";
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Button,
  IconButton,
  Modal,
  Typography,
  TextField,
  Alert,
} from "@mui/material";
import { RxCross2 } from "react-icons/rx";
import { MdBookmarkAdd } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/store";
import { savedFiltersSliceActions } from "@/store/slices/savedFiltersSlice";

const MAX_SAVED_FILTERS = 5;

const SaveViewModal: React.FC = () => {
  const theme = useTheme();
  const dispatch = useDispatch();

  const [open, setOpen] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [filterNameError, setFilterNameError] = useState("");

  const filters = useSelector(
    (state: RootState) => state.companiesTable.filters,
  );
  const savedFilters = useSelector((state: RootState) => state.savedFilters);

  const isMaxFilters = savedFilters.length >= MAX_SAVED_FILTERS;

  const handleOpen = () => {
    setFilterName("");
    setFilterNameError("");
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFilterName("");
    setFilterNameError("");
  };

  const handleSave = () => {
    const trimmed = filterName.trim();

    if (!trimmed) {
      setFilterNameError("Filter name is required.");
      return;
    }

    const isDuplicate = savedFilters.some(
      (f) => f.filterName.toLowerCase() === trimmed.toLowerCase(),
    );
    if (isDuplicate) {
      setFilterNameError("A saved view with this name already exists.");
      return;
    }

    dispatch(
      savedFiltersSliceActions.addFilter({
        filterName: trimmed,
        ...filters,
      }),
    );
    handleClose();
  };

  return (
    <>
      <Button
        startIcon={<MdBookmarkAdd size={20} />}
        sx={{
          minWidth: "170px",
          textTransform: "none",
          background: theme.palette.warning.main,
          fontWeight: 600,
          color: theme.palette.background.default,
        }}
        variant="contained"
        onClick={handleOpen}
      >
        Save View
      </Button>

      <Modal
        disableAutoFocus
        open={open}
        onClose={handleClose}
        sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Box
          sx={{
            background: theme.palette.background.paper,
            borderRadius: "16px",
            boxShadow: 24,
            overflow: "auto",
            width: "min(480px, 90vw)",
            border: `1px solid ${theme.palette.secondary.dark}`,
          }}
        >
          {/* Header */}
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
            Save View
            <IconButton
              sx={{ position: "absolute", top: 0, right: "16px" }}
              onClick={handleClose}
            >
              <RxCross2 size={20} color={theme.palette.text.secondary} />
            </IconButton>
          </Box>

          {/* Body */}
          <Box
            sx={{
              px: 4,
              py: 3,
              my: 2,
              background: theme.palette.background.default,
              borderTop: `1px solid ${theme.palette.secondary.dark}`,
              borderBottom: `1px solid ${theme.palette.secondary.dark}`,
              minHeight: "150px",
            }}
          >
            {isMaxFilters ? (
              <Alert severity="error">
                Maximum 5 saved views allowed. Delete an existing view to save a
                new one.
              </Alert>
            ) : (
              <>
                <Typography
                  sx={{
                    color: theme.palette.text.primary,
                    fontWeight: 600,
                    fontSize: { xs: "15px", md: "17px" },
                  }}
                >
                  Filter Name
                </Typography>
                <TextField
                  fullWidth
                  hiddenLabel
                  placeholder="Enter a unique name for this view"
                  value={filterName}
                  onChange={(e) => {
                    setFilterName(e.target.value);
                    setFilterNameError("");
                  }}
                  error={!!filterNameError}
                  helperText={filterNameError}
                  autoFocus
                  size="small"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                  }}
                />
              </>
            )}
          </Box>

          {/* Footer */}
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
              onClick={handleClose}
            >
              Cancel
            </Button>

            {!isMaxFilters && (
              <Button
                sx={{
                  width: "110px",
                  textTransform: "none",
                  background: theme.palette.info.main,
                  fontWeight: 600,
                  color: theme.palette.background.default,
                }}
                variant="contained"
                onClick={handleSave}
              >
                Save
              </Button>
            )}
          </Box>
        </Box>
      </Modal>
    </>
  );
};

export default SaveViewModal;
