import { Typography, Box, Button, TextField } from "@mui/material";
import { usePlayerInfo } from "../../hooks/usePlayerInfo";
import UnknownProfilePic from "../../assets/UnknownProfilePic.svg";
import { api } from "../../api/api";
import { useContext, useEffect, useState } from "react";
import { usePrompt } from "../../hooks/usePrompt";
import { enqueueSnackbar } from "notistack";
import { LoaderContext } from "../../context/LoaderProvider";

const PlayerProfile = () => {
  const { setLoading } = useContext(LoaderContext);
  const { playerInfo, loading, setPlayerInfo } = usePlayerInfo();

  const [originalPlayerInfo, setOriginalPlayerInfo] = useState(playerInfo);

  useEffect(() => {
    if (playerInfo && !originalPlayerInfo) {
      setOriginalPlayerInfo(playerInfo);
    }
  }, [playerInfo, originalPlayerInfo]);

  const handleUpdatePlayerInfo = () => {
    if (playerInfo) {
      setLoading(true);
      api.PlayersService.updatePlayerInfoById(playerInfo.id!, playerInfo)
        .then((updatedPlayer) => {
          setPlayerInfo(updatedPlayer);
          setOriginalPlayerInfo(updatedPlayer);
          enqueueSnackbar("Player info updated successfully", {
            variant: "success",
          });
        })
        .catch((err) => {
          enqueueSnackbar("Error updating player info", {
            variant: "error",
          });
          console.error("Error updating player info. Please try again later.", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  const isChanged = false; // No editable fields for now

  usePrompt("You have unsaved changes. Are you sure you want to leave?", isChanged);

  return (
    <>
      <Box sx={styles.container}>
        <Box>
          <Typography sx={styles.title}>Profile</Typography>
          <Box sx={styles.form}>
            <TextField
              id="outlined-helperText"
              label="Email"
              value={loading ? "Loading..." : playerInfo?.email || ""}
              variant="standard"
              disabled
            />
          </Box>
        </Box>

        <Box sx={styles.profilePicAndFormButtons}>
          <img src={UnknownProfilePic} width={"80%"} alt="Profile pic" />
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            id="profile-pic-upload"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                console.log("Selected file:", file);
              }
            }}
          />
        </Box>
      </Box>
      <Box sx={styles.formButtons}>
        <Button variant="contained" onClick={handleUpdatePlayerInfo} disabled={!isChanged}>
          Save
        </Button>
        <Button
          variant="outlined"
          sx={{ borderColor: "red", color: "red" }}
          onClick={() => {
            setPlayerInfo(originalPlayerInfo!);
          }}
        >
          Cancel
        </Button>
      </Box>
    </>
  );
};

export default PlayerProfile;

const styles = {
  container: {
    display: "grid",
    gridTemplateColumns: "75% 20%",
    padding: 2,
    height: "calc(100vh - 64px)",
  },
  title: {
    fontWeight: "bold",
    textTransform: "uppercase",
    fontSize: 32,
    letterSpacing: 1,
    marginBottom: 4,
  },
  form: {
    gap: 3,
    display: "flex",
    flexDirection: "column" as const,
    width: "50%",
  },
  profilePicAndFormButtons: {
    display: "flex",
    justifyContent: "center",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 1,
  },
  formButtons: {
    display: "flex",
    gap: 2,
    position: "sticky" as const,
    zIndex: 1,
    bottom: 40,
    right: 120,
    float: "right" as const,
  },
};
