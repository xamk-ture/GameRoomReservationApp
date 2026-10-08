import { Outlet, useNavigate } from "react-router-dom";
import Navigation from "../SideNav/Navigation";
import { Box, IconButton, AppBar, Toolbar, useTheme, useMediaQuery } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LoaderBackdrop from "../LoaderBackDrop";
import LanguagePicker from "../LanguagePicker";
import { useState } from "react";
import { useThemeMode } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthProvider";
import AppTitle from "../../assets/APP-TITLE.svg";

const Root = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleHomeClick = () => {
    if (isAdmin) {
      navigate("/admin/dashboard");
    } else {
      navigate("/profile");
    }
  };

  const stylesObj = styles(mode);

  return (
    <Box sx={stylesObj.container}>
      {isMobile && (
        <AppBar position="fixed" sx={stylesObj.appBar}>
          <Toolbar sx={stylesObj.toolbar}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={stylesObj.menuButton}
            >
              <MenuIcon />
            </IconButton>
            <IconButton
              color="inherit"
              aria-label={isAdmin ? "go to admin dashboard" : "go to profile"}
              onClick={handleHomeClick}
              sx={stylesObj.homeButtonMobile}
            >
              <img src={AppTitle} alt="Home" style={{ width: 120, height: 28 }} />
            </IconButton>
            <Box sx={stylesObj.topBarMobile}>
              <LanguagePicker />
            </Box>
          </Toolbar>
        </AppBar>
      )}
      <Navigation mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <LoaderBackdrop />
      <Box sx={stylesObj.outletComponents}>
        {isMobile && <Box sx={stylesObj.toolbarSpacer} />}
        {!isMobile ? (
          <Box sx={stylesObj.topBarContainer}>
            <Box sx={stylesObj.contentWrapper}>
              <Outlet />
            </Box>
            <Box sx={stylesObj.topBar}>
              <IconButton
                color="inherit"
                aria-label={isAdmin ? "go to admin dashboard" : "go to profile"}
                onClick={handleHomeClick}
                sx={stylesObj.homeButtonDesktop}
              >
                <img src={AppTitle} alt="Home" style={{ width: 120, height: 28 }} />
              </IconButton>
              <LanguagePicker />
            </Box>
          </Box>
        ) : (
          <Outlet />
        )}
      </Box>
    </Box>
  );
};

export default Root;

const styles = (mode: 'light' | 'dark') => ({
  container: {
    display: "flex",
    height: "100vh",
  },
  appBar: {
    display: { xs: "block", md: "none" },
    backgroundColor: '#ffaa00',
    color: '#000',
    boxShadow: "0 4px 15px rgba(255, 170, 0, 0.4), 0 0 20px rgba(255, 170, 0, 0.2)",
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingLeft: { xs: 2, sm: 3 },
    paddingRight: { xs: 2, sm: 3 },
  },
  menuButton: {
    marginRight: 1,
  },
  homeButtonMobile: {
    color: '#000',
    marginRight: 1,
  },
  homeButtonDesktop: {
    color: mode === 'dark' ? '#fff' : '#000',
    marginRight: 1,
  },
  toolbarSpacer: {
    minHeight: { xs: 64, md: 0 },
  },
  outletComponents: {
    flexGrow: 1,
    padding: { xs: 2, md: 3 },
    paddingTop: { xs: 2, md: 1 },
    width: { xs: "100%", md: "80%" },
    overflow: "auto",
    backgroundColor: mode === 'dark' ? '#2b2b2b' : 'transparent',
  },
  topBarContainer: {
    display: { xs: "none", md: "flex" },
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "100%",
    gap: 2,
  },
  contentWrapper: {
    flex: 1,
  },
  topBar: {
    display: { xs: "none", md: "flex" },
    justifyContent: "flex-end",
    alignItems: "center",
    mb: 0,
    mt: 0,
  },
  topBarMobile: {
    display: { xs: "flex", md: "none" },
    justifyContent: "flex-end",
  },
});
