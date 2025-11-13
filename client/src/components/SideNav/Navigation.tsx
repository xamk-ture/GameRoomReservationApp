import { Box, Button, Typography, IconButton, Drawer, useMediaQuery, useTheme } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import { adminNavButtons, navButtons } from "./Data";
import { useState } from "react";
import AppTitle from "../../assets/APP-TITLE.svg";
import { usePlayerInfo } from "../../hooks/usePlayerInfo";
import LogoutIcon from "@mui/icons-material/Logout";
import { useTranslation } from "react-i18next";

interface NavigationProps {
  isAdminMenu?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const Navigation = ({ isAdminMenu = false, mobileOpen = false, onMobileClose }: NavigationProps) => {
  const { error } = usePlayerInfo();
  const location = useLocation();
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [focusedButton, setFocusedButton] = useState(location.pathname);

  const navContent = (
    <Box sx={styles.container}>
      <Box sx={styles.title}>
        <img src={AppTitle} alt="X Game Room" style={{ textAlign: "center", maxWidth: "100%" }} />
      </Box>
      {error && <Typography sx={styles.error}>{t("errors.loadError")}: {error}</Typography>}
      <Box sx={styles.navButtons}>
        {(isAdminMenu ? adminNavButtons : navButtons).map((button) => (
          <Button
            key={button.translationKey}
            variant="outlined"
            onFocus={() => setFocusedButton(button.path)}
            onClick={() => {
              if (isMobile && onMobileClose) {
                onMobileClose();
              }
            }}
            sx={{
              borderBottom: focusedButton === button.path ? 3 : undefined,
              fontWeight: focusedButton === button.path ? "bold" : undefined,
              borderColor: "black",
            }}
            fullWidth={isMobile}
          >
            <Link to={button.path} style={{ textDecoration: "none", color: "#000", width: "100%" }}>
              {t(button.translationKey)}
            </Link>
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

  if (isMobile) {
    return (
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={styles.drawer}
      >
        {navContent}
      </Drawer>
    );
  }

  return navContent;
};

export default Navigation;

const styles = {
  container: {
    width: { xs: 280, md: "20%" },
    padding: { xs: 2, md: 3 },
    backgroundColor: "#F3A93A",
    height: "100%",
    display: "flex",
    flexDirection: "column" as const,
    position: { xs: "relative", md: "static" } as any,
  },
  drawer: {
    display: { xs: "block", md: "none" },
    "& .MuiDrawer-paper": {
      boxSizing: "border-box",
      width: 280,
      backgroundColor: "#F3A93A",
    },
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
    flexGrow: 1,
    "& a": {
      textDecoration: "none",
      color: "#000",
    },
  },
  error: {
    color: "red",
    marginBottom: 2,
    fontWeight: "bold",
    fontSize: { xs: "0.875rem", md: "1rem" },
  },
  userNameAndLogoutButton: {
    position: { xs: "relative" as const, md: "absolute" as const },
    bottom: { xs: "auto", md: 0 },
    left: { xs: "auto", md: 0 },
    padding: 2,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: { xs: "100%", md: "20%" },
    marginTop: { xs: "auto", md: 0 },
  },
  logoutButton: {
    color: "black",
  },
};
