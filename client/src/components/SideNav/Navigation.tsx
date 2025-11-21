import { Box, Button, Typography, IconButton, Drawer, useMediaQuery, useTheme } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import { adminNavButtons, navButtons } from "./Data";
import { useState } from "react";
import AppTitle from "../../assets/APP-TITLE.svg";
import { usePlayerInfo } from "../../hooks/usePlayerInfo";
import LogoutIcon from "@mui/icons-material/Logout";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthProvider";
import { useThemeMode } from "../../context/ThemeContext";

interface NavigationProps {
  isAdminMenu?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const Navigation = ({ isAdminMenu = false, mobileOpen = false, onMobileClose }: NavigationProps) => {
  const { error } = usePlayerInfo();
  const { isAdmin } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [focusedButton, setFocusedButton] = useState(location.pathname);

  const displayButtons = isAdminMenu
    ? adminNavButtons
    : (isAdmin
      ? [{ translationKey: "nav.dashboard", path: "/admin/dashboard" }, ...navButtons]
      : navButtons);

  const navContent = (
    <Box sx={styles(mode).container}>
      <Box sx={commonStyles.title}>
        <img src={AppTitle} alt="X Game Room" style={{ textAlign: "center", maxWidth: "100%" }} />
      </Box>
      {error && <Typography sx={commonStyles.error}>{t("errors.loadError")}: {error}</Typography>}
      <Box sx={styles(mode).navButtons}>
        {displayButtons.map((button) => (
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
              borderColor: '#000',
              color: '#000',
            }}
            fullWidth={isMobile}
          >
            <Link to={button.path} style={{ textDecoration: "none", color: '#000', width: "100%" }}>
              {t(button.translationKey)}
            </Link>
          </Button>
        ))}
      </Box>
      <Box sx={styles(mode).userNameAndLogoutButton}>
        <span />
        <Link to="/">
          <IconButton sx={styles(mode).logoutButton}>
            <LogoutIcon />
          </IconButton>
        </Link>
      </Box>
    </Box >
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
        sx={styles(mode).drawer}
      >
        {navContent}
      </Drawer>
    );
  }

  return navContent;
};

export default Navigation;

const commonStyles = {
  title: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 6,
  },
  error: {
    color: "red",
    marginBottom: 2,
    fontWeight: "bold",
    fontSize: { xs: "0.875rem", md: "1rem" },
  },
};

const styles = (mode: 'light' | 'dark') => ({
  container: {
    width: { xs: 280, md: "20%" },
    padding: { xs: 2, md: 3 },
    backgroundColor: '#ffaa00',
    height: "100%",
    display: "flex",
    flexDirection: "column" as const,
    position: { xs: "relative", md: "static" } as any,
    boxShadow: "0 4px 15px rgba(255, 170, 0, 0.4), 0 0 20px rgba(255, 170, 0, 0.2)",
  },
  drawer: {
    display: { xs: "block", md: "none" },
    "& .MuiDrawer-paper": {
      boxSizing: "border-box",
      width: 280,
      backgroundColor: '#ffaa00',
      boxShadow: "0 4px 15px rgba(255, 170, 0, 0.4), 0 0 20px rgba(255, 170, 0, 0.2)",
    },
  },
  navButtons: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
    flexGrow: 1,
    "& a": {
      textDecoration: "none",
      color: '#000',
    },
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
    color: '#000',
  },
});
