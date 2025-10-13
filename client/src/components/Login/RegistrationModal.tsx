import React, { useState } from "react";
import { Box, Button, Modal, TextField, Typography } from "@mui/material";
import AppTitleColored from "../../assets/APP-TITLE-COLORED.svg";

interface RegistrationModalProps {
  open: boolean;
  onClose: () => void;
  onSend: (email: string) => void;
}

const RegistrationModal: React.FC<RegistrationModalProps> = ({
  open,
  onClose,
  onSend,
}) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSend = async () => {
    if (!email.endsWith("@edu.xamk.fi")) {
      setError("Please enter a valid university email (@edu.xamk.fi).");
      return;
    }
    try {
      await onSend(email);
      setEmail("");
      setError("");
      onClose();
    } catch (e: any) {
      setError("Error sending registration email: " + (e.message || e));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      sx={styles.modal}
      BackdropProps={{
        sx: { backgroundColor: "rgba(0, 0, 0, 0.5)" },
      }}
    >
      <Box sx={styles.wrapper}>
        <Box sx={styles.titleAndLogo}>
          <Typography variant="h5" sx={styles.title}>
            Register in
          </Typography>
          <img src={AppTitleColored} alt="X Game Room" width={200} />
        </Box>

        <Box flex={1}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Enter your university email to receive a registration link
          </Typography>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            margin="normal"
          />
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
        </Box>
        <Box sx={styles.buttons}>
          <Button variant="contained" onClick={handleSend}>
            Send
          </Button>
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default RegistrationModal;

const styles = {
  modal: { display: "flex", alignItems: "center", justifyContent: "center" },
  wrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: 585,
    height: 382,
    bgcolor: "background.paper",
    boxShadow: 24,
    p: 5,
    borderRadius: 2,
  },
  titleAndLogo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    mb: 4,
  },
  title: {
    mr: 1,
    textAlign: "center",
  },
  buttons: {
    display: "flex",
    width: "100%",
    gap: 2,
    justifyContent: "flex-end",
  },
};
