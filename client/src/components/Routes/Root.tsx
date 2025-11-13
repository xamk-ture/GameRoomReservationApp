import { Outlet } from "react-router-dom";
import Navigation from "../SideNav/Navigation";
import { Box, IconButton, AppBar, Toolbar, useTheme, useMediaQuery } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LoaderBackdrop from "../LoaderBackDrop";
import { useState } from "react";

const Root = () => {
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
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={styles.menuButton}
            >
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
      )}
      <Navigation mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <LoaderBackdrop />
      <Box sx={styles.outletComponents}>
        {isMobile && <Box sx={styles.toolbarSpacer} />}
        <Outlet />
      </Box>
    </Box>
  );
};

export default Root;

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
  menuButton: {
    marginRight: 2,
  },
  toolbarSpacer: {
    minHeight: { xs: 64, md: 0 },
  },
  outletComponents: {
    flexGrow: 1,
    padding: { xs: 2, md: 3 },
    width: { xs: "100%", md: "80%" },
    overflow: "auto",
  },
};
