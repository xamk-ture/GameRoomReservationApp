import { Box, IconButton, AppBar, Toolbar, useTheme, useMediaQuery } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { Outlet } from "react-router-dom";
import Navigation from "../SideNav/Navigation";
import LanguagePicker from "../LanguagePicker";
import { useState } from "react";
import { useThemeMode } from "../../context/ThemeContext";

const AdminLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
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
            <Box sx={stylesObj.topBarMobile}>
              <LanguagePicker />
            </Box>
          </Toolbar>
        </AppBar>
      )}
      <Navigation isAdminMenu mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <Box sx={stylesObj.outletComponents}>
        {isMobile && <Box sx={stylesObj.toolbarSpacer} />}
        {!isMobile ? (
          <Box sx={stylesObj.topBarContainer}>
            <Box sx={stylesObj.contentWrapper}>
              <Outlet />
            </Box>
            <Box sx={stylesObj.topBar}>
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

export default AdminLayout;

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
    marginRight: 2,
  },
  toolbarSpacer: {
    minHeight: { xs: 64, md: 0 },
  },
  outletComponents: {
    width: { xs: "100%", md: "80%" },
    padding: { xs: 2, md: 3 },
    paddingTop: { xs: 2, md: 1 },
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
    mb: 0,
    mt: 0,
  },
  topBarMobile: {
    display: { xs: "flex", md: "none" },
    justifyContent: "flex-end",
  },
});


