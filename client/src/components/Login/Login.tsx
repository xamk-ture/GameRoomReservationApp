import React, { useState } from "react";
import {
  Box,
  Container,
  Paper,
  TextField,
  Typography,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { OpenAPI } from "../../api/core/OpenAPI";
import { PlayerDto } from "../../api/api";
import loginBackground from "../../assets/login-Background.jpg";
import { enqueueSnackbar } from "notistack";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthProvider";
import AppTitleColored from "../../assets/APP-TITLE-COLORED.svg";
import LanguagePicker from "../LanguagePicker";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { setToken } = useAuth();

  // Do NOT auto-redirect on load; always show login. Redirect only after verify.

  const [playerDto, setPlayerDto] = useState<PlayerDto>({});
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");

  //Handle email changes
  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setErrorKey(null);
    setPlayerDto((prev) => ({
      ...prev,
      email: event.target.value,
    }));
  };

  // Lähetä kertakäyttökoodi sähköpostiin
  const handleSendCode = async () => {
    setErrorKey(null);
    const email = playerDto.email?.trim() || "";
    if (!email || (!email.endsWith("@edu.xamk.fi") && !email.endsWith("@xamk.fi"))) {
      setErrorKey("errors.onlySchoolEmails");
      return;
    }
    setIsSending(true);
    try {
      const base = OpenAPI.BASE || "";
      // eslint-disable-next-line no-console
      if (import.meta.env.DEV) console.log("[DEV] POST", `${base}/api/auth/request-code`);
      const resp = await fetch(`${base}/api/auth/request-code`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept-Language": i18n.language || "fi"
        },
        body: JSON.stringify({ email }),
        credentials: 'include', // Required for cookies and authentication
      });
      // eslint-disable-next-line no-console
      if (import.meta.env.DEV) console.log("[DEV] request-code status:", resp.status);
      if (!resp.ok) {
        throw new Error(t("notify.sendFailed"));
      }

      // Try to read debug header (server may expose it for dev)
      const debugHeader = resp.headers.get("X-Debug-OneTime-Code");
      if (import.meta.env.DEV && debugHeader) {
        // eslint-disable-next-line no-console
        console.log("[DEV] One-time login code (header):", debugHeader);
      }

      // Parse response to get code in development
      try {
        const data = await resp.json();
        if (import.meta.env.DEV && data?.code) {
          // eslint-disable-next-line no-console
          console.log("[DEV] One-time login code (body):", data.code);
        }
      } catch {
        // ignore json parse errors
      }

      setCodeSent(true);
      enqueueSnackbar(t("notify.codeSent"), { variant: "success", autoHideDuration: 4000 });
    } catch (e: any) {
      setErrorKey("errors.generic");
      enqueueSnackbar(t("notify.sendFailed"), { variant: "error", autoHideDuration: 5000 });
    } finally {
      setIsSending(false);
    }
  };

  // Vahvista koodi ja kirjaudu sisään
  const handleVerifyCode = async () => {
    setErrorKey(null);
    const email = playerDto.email?.trim() || "";
    if (!email || !code.trim()) {
      setErrorKey("errors.generic");
      return;
    }
    setIsVerifying(true);
    try {
      const base = OpenAPI.BASE || "";
      const resp = await fetch(`${base}/api/auth/verify-code`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept-Language": i18n.language || "fi"
        },
        body: JSON.stringify({ email, code: code.trim() }),
        credentials: 'include', // Required for cookies and authentication
      });
      if (!resp.ok) throw new Error();
      const data = await resp.json();
      const token = data?.token;
      if (!token) throw new Error();
      // Store via AuthProvider to keep app state in sync
      setToken(token);
      // Decode locally to decide landing route immediately
      const [, payload] = token.split(".");
      const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
      const collect = (val: unknown): string[] => (Array.isArray(val) ? val.map((v) => String(v)) : val != null ? [String(val)] : []);
      const roles = [
        ...collect(claims["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"]),
        ...collect(claims["roles"]),
        ...collect(claims["role"]),
        ...collect((claims as any)?.realm_access?.roles),
      ].map((r) => r.trim().toLowerCase());
      const isAdmin = roles.includes("admin");
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log("[DEV] JWT roles:", roles);
      }
      const pref = localStorage.getItem("landingPreference");
      if (pref === "user") {
        navigate("/profile");
      } else {
        navigate(isAdmin ? "/admin" : "/profile");
      }
    } catch (e: any) {
      setErrorKey("errors.generic");
      enqueueSnackbar(t("notify.verifyFailed"), { variant: "error", autoHideDuration: 5000 });
    } finally {
      setIsVerifying(false);
    }
  };

  // Ei rekisteröintiä tässä projektissa

  return (
    <Box sx={styles.background}>
      <Box sx={styles.langPicker}>
        <LanguagePicker />
      </Box>
      <Container maxWidth="sm">
        <Paper sx={styles.paper}>
          <Box sx={styles.titleAndLogo}>
            <Typography variant="h5" sx={styles.title}>
              {t("login.title")}
            </Typography>
            <img src={AppTitleColored} alt="X Game Room" width={200} />
          </Box>

          <TextField
            label={t("login.emailLabel")}
            type="email"
            value={playerDto.email || ""}
            onChange={handleEmailChange}
            fullWidth
            margin="normal"
          />

          {codeSent && (
            <TextField
              label={t("login.codeLabel")}
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              fullWidth
              margin="normal"
              inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
            />
          )}

          {errorKey && (
            <Typography color="error" variant="body1" sx={{ mt: 1 }}>
              {t(errorKey)}
            </Typography>
          )}

          {!codeSent ? (
            <Button
              variant="contained"
              onClick={handleSendCode}
              disabled={isSending}
              sx={{
                mt: 2,
                width: "100%",
                backgroundColor: "#ffaa00",
                color: "#000",
                fontWeight: 600,
                boxShadow: "0 4px 15px rgba(255, 170, 0, 0.4), 0 0 20px rgba(255, 170, 0, 0.2)",
                "&:hover": {
                  backgroundColor: "#e69900",
                  boxShadow: "0 6px 20px rgba(255, 170, 0, 0.5), 0 0 25px rgba(255, 170, 0, 0.3)",
                  transform: "translateY(-1px)",
                },
                "&:active": {
                  transform: "translateY(0)",
                },
                transition: "all 0.3s ease",
              }}
            >
              {isSending ? t("login.sending") : t("login.sendCode")}
            </Button>
          ) : (
            <>
              <Button
                variant="contained"
                onClick={handleVerifyCode}
                disabled={isVerifying || code.trim().length === 0}
                sx={{
                  mt: 2,
                  width: "100%",
                  backgroundColor: "#FFC107",
                  color: "#000",
                  fontWeight: 600,
                  boxShadow: "0 4px 15px rgba(255, 193, 7, 0.4), 0 0 20px rgba(255, 193, 7, 0.2)",
                  "&:hover": {
                    backgroundColor: "#FFB300",
                    boxShadow: "0 6px 20px rgba(255, 193, 7, 0.5), 0 0 25px rgba(255, 193, 7, 0.3)",
                    transform: "translateY(-1px)",
                  },
                  "&:active": {
                    transform: "translateY(0)",
                  },
                  "&:disabled": {
                    backgroundColor: "#ccc",
                    color: "#666",
                    boxShadow: "none",
                  },
                  transition: "all 0.3s ease",
                }}
              >
                {isVerifying ? t("login.verifying") : t("login.verify")}
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => {
                  setCode("");
                  setCodeSent(false);
                }}
                sx={{ mt: 1, width: "100%" }}
              >
                {t("login.back")}
              </Button>
            </>
          )}

          {/* Links removed as per requirements */}
        </Paper>
      </Container>
      {/* Rekisteröintiä ei käytetä */}
    </Box>
  );
};

export default Login;

const styles = {
  background: {
    backgroundImage: `url(${loginBackground})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    minHeight: "100vh",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  langPicker: {
    position: "fixed",
    top: 8,
    left: 8,
    zIndex: 10,
  },
  paper: {
    p: 3,
    opacity: 0.94,
  },
  linksRow: {
    display: "flex",
    justifyContent: "space-between",
    mt: 1,
  },
  titleAndLogo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    mb: 2,
  },
  title: {
    mr: 1,
    textAlign: "center",
  },
};
