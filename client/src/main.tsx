import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { OpenAPI } from "./api/core/OpenAPI.ts";
import "./App.css";
import { appTheme } from "./Themes/themes.ts";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { SnackbarProvider } from "notistack";
import { LoaderProvider } from "./context/LoaderProvider.tsx";
import I18nProvider from "./i18n/context/I18nProvider.tsx";
import { PlayerInfoProvider } from "./context/PlayerInfoProvider.tsx";
import { AuthProvider } from "./context/AuthProvider";

function initApiHeadersFromStorage() {
  const token = localStorage.getItem("jwtToken");
  if (token) {
    OpenAPI.HEADERS = {
      Authorization: `Bearer ${token}`,
    };
  }
}

// Optionally set API base from env to avoid wrong host like "gameroombookingsys:xxxxx"
const apiBase = (import.meta as any).env?.VITE_API_BASE as string | undefined;
if (apiBase && typeof apiBase === "string") {
  OpenAPI.BASE = apiBase;
}

// Initialize API headers once at startup
initApiHeadersFromStorage();

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <PlayerInfoProvider>
      <I18nProvider>
        <LoaderProvider>
          <SnackbarProvider>
            <ThemeProvider theme={appTheme}>
              <CssBaseline />
              <StrictMode>
                <App />
              </StrictMode>
            </ThemeProvider>
          </SnackbarProvider>
        </LoaderProvider>
      </I18nProvider>
    </PlayerInfoProvider>
  </AuthProvider>
);
