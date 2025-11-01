import { Box, Typography } from "@mui/material";
import LanguagePicker from "./LanguagePicker";
import { useTranslation } from "react-i18next";

const Settings = () => {
  const { t } = useTranslation();
  return (
    <Box sx={styles.container}>
      <Typography sx={styles.title}>{t("Settings")}</Typography>
      <LanguagePicker />
    </Box>
  );
};

export default Settings;

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    padding: 2,
  },
  title: {
    fontWeight: "bold",
    textTransform: "uppercase",
    fontSize: 32,
    letterSpacing: 1,
    marginBottom: 4,
  },
};
