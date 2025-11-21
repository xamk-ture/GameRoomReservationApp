import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

const Settings = () => {
  const { t } = useTranslation();
  return (
    <Box sx={styles.container}>
      <Typography sx={styles.title}>{t("Settings")}</Typography>
      <Typography variant="body1" color="text.secondary">
        {t("settings.description", "Settings page")}
      </Typography>
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
