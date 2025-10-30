import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";
import Navigation from "../SideNav/Navigation";
import LanguagePicker from "../LanguagePicker";

const AdminLayout = () => {
  return (
    <Box sx={styles.container}>
      <Navigation isAdminMenu />
      <Box sx={styles.outletComponents}>
        <Box sx={styles.topBar}>
          <LanguagePicker />
        </Box>
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
  outletComponents: {
    width: "80%",
    padding: 3,
    overflow: "auto",
  },
  topBar: {
    display: "flex",
    justifyContent: "flex-end",
    mb: 2,
  },
};


