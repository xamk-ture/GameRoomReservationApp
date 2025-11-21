import React, { useEffect, useState } from "react";
import { IconButton, Menu, MenuItem, Typography, Box, Tooltip } from "@mui/material";
import LanguageIcon from "@mui/icons-material/Language";
import { useTranslation } from "react-i18next";
import locales from "../i18n/locales";

const LanguagePicker = () => {
  const { t, i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Initialize language from localStorage or use current i18n language
  useEffect(() => {
    const savedLang = localStorage.getItem("lang");
    if (savedLang && i18n.language !== savedLang) {
      i18n.changeLanguage(savedLang);
    } else if (!savedLang && !i18n.language) {
      // Only set default if no language is set at all
      i18n.changeLanguage("fi");
    }
  }, [i18n]);

  // Convert your locales object to an array of language options.
  const languageOptions = Object.keys(locales)
    .sort((lng1, lng2) => {
      const name1 = locales[lng1].englishName;
      const name2 = locales[lng2].englishName;
      return name1.localeCompare(name2, "en");
    })
    .map((lng) => ({
      code: lng,
      nativeName: locales[lng].nativeName,
      englishName: locales[lng].englishName,
    }));

  // Determine the currently selected language.
  const currentLanguage =
    languageOptions.find((option) => option.code === i18n.language) ||
    languageOptions.find((option) => option.code === "fi") ||
    languageOptions[0];

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageSelect = async (code: string) => {
    if (code === i18n.language) {
      handleClose();
      return;
    }
    localStorage.setItem("lang", code);
    try {
      await i18n.changeLanguage(code);
    } catch (error) {
      console.error("Failed to change language:", error);
    }
    handleClose();
  };

  return (
    <>
      <Tooltip title={t("Language")}>
        <IconButton
          onClick={handleClick}
          size="small"
          sx={{
            backgroundColor: "#ffaa00",
            color: "#000",
            boxShadow: "0 4px 15px rgba(255, 170, 0, 0.4), 0 0 20px rgba(255, 170, 0, 0.2)",
            "&:hover": {
              backgroundColor: "#e69900",
              boxShadow: "0 6px 20px rgba(255, 170, 0, 0.5), 0 0 25px rgba(255, 170, 0, 0.3)",
              transform: "translateY(-1px)",
            },
            "&:active": {
              transform: "translateY(0)",
            },
            transition: "all 0.3s ease",
          }}
          aria-label={t("Language")}
          aria-controls={open ? "language-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
        >
          <LanguageIcon />
        </IconButton>
      </Tooltip>
      <Menu
        id="language-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "language-button",
          onClick: (e) => {
            // Prevent menu from closing when clicking inside it
            e.stopPropagation();
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{
          sx: {
            mt: 1.5,
            minWidth: 180,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          },
        }}
      >
        {languageOptions.map((option) => (
          <MenuItem
            key={option.code}
            onClick={(e) => {
              e.stopPropagation();
              handleLanguageSelect(option.code);
            }}
            selected={option.code === currentLanguage?.code}
            sx={{
              py: 1.5,
              px: 2,
              "&.Mui-selected": {
                backgroundColor: "action.selected",
                "&:hover": {
                  backgroundColor: "action.selected",
                },
              },
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
              <Typography variant="body1" fontWeight={option.code === currentLanguage?.code ? 600 : 400}>
                {option.nativeName}
              </Typography>
              {option.nativeName !== option.englishName && (
                <Typography variant="caption" color="text.secondary">
                  {option.englishName}
                </Typography>
              )}
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default LanguagePicker;
