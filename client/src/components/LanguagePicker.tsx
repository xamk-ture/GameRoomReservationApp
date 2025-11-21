import React, { useEffect } from "react";
import { Autocomplete, TextField, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import locales from "../i18n/locales";

// Example: Map locale code to icon URL if available.
// Uncomment and adjust the paths if you have flag icons.
// import fi from "../assets/icons/finland-flag.png";
// import en from "../assets/icons/england-flag.png";
// import ar from "../assets/icons/saudiarabia-flag.png";
// const localeIcons: Record<string, string> = {
//   fi,
//   en,
//   ar,
// };

// const localeIcons: Record<string, any> = {
//   // If you have flag icons, map them here, otherwise leave empty.
// };

const LanguagePicker = () => {
  const { t, i18n } = useTranslation();

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
  // Use i18n.language if available; if not, force the default "fi".
  const currentLanguage =
    languageOptions.find((option) => option.code === i18n.language) ||
    languageOptions.find((option) => option.code === "fi") ||
    languageOptions[0];

  // Handle language change from the autocomplete.
  const handleLanguageSelect = (
    _: React.SyntheticEvent,
    newValue: { code: string; nativeName: string; englishName: string } | null
  ) => {
    if (newValue) {
      i18n.changeLanguage(newValue.code);
      localStorage.setItem("lang", newValue.code);
    }
  };

  return (
    <Stack spacing={1}>
      <Autocomplete
        options={languageOptions}
        getOptionLabel={(option) =>
          option.nativeName !== option.englishName
            ? `${option.nativeName} - ${option.englishName}`
            : option.nativeName
        }
        value={currentLanguage}
        onChange={handleLanguageSelect}
        isOptionEqualToValue={(option, value) => option.code === value.code}
        renderOption={(props, option) => (
          <li {...props} key={option.code}>
            {option.nativeName !== option.englishName ? (
              <>
                {option.nativeName} -{" "}
                <span dir="ltr">{option.englishName}</span>
              </>
            ) : (
              option.nativeName
            )}
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t("Language")}
            variant="standard"
            inputProps={{
              ...params.inputProps,
              readOnly: true,
            }}
            sx={{
              "& .MuiInputBase-root": { cursor: "pointer" },
              "& .MuiInputBase-input": { cursor: "pointer" },
              cursor: "pointer",
            }}
          />
        )}
        clearOnEscape
        disableClearable
        openOnFocus
        sx={{ width: { xs: "100%", sm: 300 } }}
      />
    </Stack>
  );
};

export default LanguagePicker;
