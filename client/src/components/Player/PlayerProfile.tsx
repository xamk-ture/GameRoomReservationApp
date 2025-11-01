import { Typography, Box, Button, TextField } from "@mui/material";
import { usePlayerInfo } from "../../hooks/usePlayerInfo";
import UnknownProfilePic from "../../assets/UnknownProfilePic.svg";
import { api } from "../../api/api";
import { useContext, useEffect, useState } from "react";
import { usePrompt } from "../../hooks/usePrompt";
import { enqueueSnackbar } from "notistack";
import { LoaderContext } from "../../context/LoaderProvider";
import { useTranslation } from "react-i18next";

const PlayerProfile = () => {
  const { t } = useTranslation();
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
          enqueueSnackbar(t("notify.profileUpdated"), {
            variant: "success",
          });
        })
        .catch((err) => {
          enqueueSnackbar(t("errors.profileUpdateFailed"), {
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

  usePrompt(t("common.unsavedChangesPrompt"), isChanged);

  return (
    <>
      <Box sx={styles.container}>
        <Box>
          <Typography sx={styles.title}>{t("nav.profile")}</Typography>
          <Box sx={styles.form}>
            <TextField
              id="outlined-helperText"
              label={t("common.email")}
              value={loading ? t("common.loading") : playerInfo?.email || ""}
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
          {t("common.save")}
        </Button>
        <Button
          variant="outlined"
          sx={{ borderColor: "red", color: "red" }}
          onClick={() => {
            setPlayerInfo(originalPlayerInfo!);
          }}
        >
          {t("common.cancel")}
        </Button>
      </Box>
    </>
  );
};

export default PlayerProfile;

const styles = {
  container: {
    display: "grid",
    gridTemplateColumns: { xs: "1fr", md: "75% 20%" },
    gap: { xs: 3, md: 0 },
    padding: { xs: 1, md: 2 },
    height: { xs: "auto", md: "calc(100vh - 64px)" },
    minHeight: { xs: "calc(100vh - 128px)", md: "calc(100vh - 64px)" },
  },
  title: {
    fontWeight: "bold",
    textTransform: "uppercase",
    fontSize: { xs: 24, md: 32 },
    letterSpacing: 1,
    marginBottom: 4,
  },
  form: {
    gap: 3,
    display: "flex",
    flexDirection: "column" as const,
    width: { xs: "100%", md: "50%" },
  },
  profilePicAndFormButtons: {
    display: "flex",
    justifyContent: "center",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 1,
    order: { xs: -1, md: 0 },
  },
  formButtons: {
    display: "flex",
    gap: 2,
    position: { xs: "relative" as const, md: "sticky" as const },
    zIndex: 1,
    bottom: { xs: "auto", md: 40 },
    right: { xs: "auto", md: 120 },
    float: { xs: "none" as const, md: "right" as const },
    justifyContent: { xs: "flex-start", md: "flex-end" },
    marginTop: { xs: 2, md: 0 },
    marginBottom: { xs: 2, md: 0 },
  },
};
