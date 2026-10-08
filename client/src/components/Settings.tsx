import { Box, Typography, FormControl, FormControlLabel, Radio, RadioGroup } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useThemeMode } from "../context/ThemeContext";

const Settings = () => {
  const { t } = useTranslation();
  const { mode, setTheme } = useThemeMode();

  return (
    <Box sx={styles.container}>
      <Typography sx={styles.title}>{t("Settings")}</Typography>
      
      <FormControl sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t("settings.theme", "Theme")}
        </Typography>
        <RadioGroup
          row
          value={mode}
          onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
        >
          <FormControlLabel value="light" control={<Radio />} label={t("settings.light", "Light")} />
          <FormControlLabel value="dark" control={<Radio />} label={t("settings.dark", "Dark")} />
        </RadioGroup>
      </FormControl>
    </Box>
  );
};

export default Settings;

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    padding: { xs: 1, md: 2 },
  },
  title: {
    fontWeight: "bold",
    textTransform: "uppercase",
    fontSize: { xs: 24, md: 32 },
    letterSpacing: 1,
    marginBottom: 4,
  },
};
