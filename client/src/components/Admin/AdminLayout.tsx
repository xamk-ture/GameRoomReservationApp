import { Box, IconButton, AppBar, Toolbar, useTheme, useMediaQuery } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { Outlet } from "react-router-dom";
import Navigation from "../SideNav/Navigation";
import LanguagePicker from "../LanguagePicker";
import { useState } from "react";

const AdminLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={styles.container}>
      {isMobile && (
        <AppBar position="fixed" sx={styles.appBar}>
          <Toolbar sx={styles.toolbar}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={styles.menuButton}
            >
              <MenuIcon />
            </IconButton>
            <Box sx={styles.topBarMobile}>
              <LanguagePicker />
            </Box>
          </Toolbar>
        </AppBar>
      )}
      <Navigation isAdminMenu mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <Box sx={styles.outletComponents}>
        {isMobile && <Box sx={styles.toolbarSpacer} />}
        {!isMobile && (
          <Box sx={styles.topBar}>
            <LanguagePicker />
          </Box>
        )}
        <Outlet />
      </Box>
    </Box>
  );
};

export default AdminLayout;

const styles = {
  container: {
    display: "flex",
    height: "100vh",
  },
  appBar: {
    display: { xs: "block", md: "none" },
    backgroundColor: "#F3A93A",
    color: "#000",
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
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
    overflow: "auto",
  },
  topBar: {
    display: { xs: "none", md: "flex" },
    justifyContent: "flex-end",
    mb: 2,
  },
  topBarMobile: {
    display: { xs: "flex", md: "none" },
    justifyContent: "flex-end",
  },
};


