import { Box, Button, Typography, IconButton } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import { adminNavButtons, navButtons } from "./Data";
import { useState } from "react";
import AppTitle from "../../assets/APP-TITLE.svg";
import { usePlayerInfo } from "../../hooks/usePlayerInfo";
import LogoutIcon from "@mui/icons-material/Logout";
import { useTranslation } from "react-i18next";

const Navigation = ({ isAdminMenu = false }: { isAdminMenu?: boolean }) => {
  const { error } = usePlayerInfo();
  const location = useLocation();
  const { t } = useTranslation();

  const [focusedButton, setFocusedButton] = useState(location.pathname);

  return (
    <Box sx={styles.container}>
      <Box sx={styles.title}>
        <img src={AppTitle} alt="X Game Room" style={{ textAlign: "center" }} />
      </Box>
      {error && <Typography sx={styles.error}>{t("errors.loadError")}: {error}</Typography>}
      <Box sx={styles.navButtons}>
        {(isAdminMenu ? adminNavButtons : navButtons).map((button) => (
          <Button
            key={button.translationKey}
            variant="outlined"
            onFocus={() => setFocusedButton(button.path)}
            sx={{
              borderBottom: focusedButton === button.path ? 3 : undefined,
              fontWeight: focusedButton === button.path ? "bold" : undefined,
              borderColor: "black",
            }}
          >
            <Link to={button.path}>{t(button.translationKey)}</Link>
          </Button>
        ))}
      </Box>
      <Box sx={styles.userNameAndLogoutButton}>
        <span />
        <Link to="/">
          <IconButton sx={styles.logoutButton}>
            <LogoutIcon />
          </IconButton>
        </Link>
      </Box>
    </Box>
  );
};

export default Navigation;

const styles = {
  container: {
    width: "20%",
    padding: 3,
    backgroundColor: "#F3A93A",
  },
  title: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 4,
  },
  navButtons: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
    "& a": {
      textDecoration: "none",
      color: "#000",
    },
  },
  error: {
    color: "red",
    marginBottom: 2,
    fontWeight: "bold",
  },
  userNameAndLogoutButton: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    padding: 2,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "20%",
  },
  logoutButton: {
    color: "black",
  },
};
