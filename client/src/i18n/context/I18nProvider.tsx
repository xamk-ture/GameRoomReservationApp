import { PropsWithChildren } from "react";
import rtlPlugin from "stylis-plugin-rtl";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { prefixer } from "stylis";
// import { themeVariants } from "../../theme/muiTheme";
import i18n from "i18next";
import BrowserLanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next, useTranslation } from "react-i18next";
import locales from "../locales";
import BackendPlugin from "../backend/BackendPlugin";
import ShorthandPostProcessor from "../postprocess/ShorthandPostProcessor";
import { addFormatters } from "../format/formatters";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";

// Create rtl cache
const cacheRTL = createCache({
  key: "muirtl",
  stylisPlugins: [prefixer, rtlPlugin],
});

const cacheLTR = createCache({
  key: "muiltr",
  stylisPlugins: [prefixer],
});

/**
 * Backend plugin
 */
const backend = BackendPlugin({
  getTranslation: async (lng, ns, options) => {
    const response = await fetch(`/locales/${lng}/${ns}.json`, options);

    if (!response.ok) {
      throw new Error("Failed to load translation " + lng + " " + ns);
    }
    return await response.json();
  },
});

/**
 * Postprocessor for shorthand date and time notation.
 */
const shorthandPostProcessor = ShorthandPostProcessor(i18n);

// Initialize default i18next instance
i18n
  .use(initReactI18next)
  .use(shorthandPostProcessor)
  .use(BrowserLanguageDetector)
  .use(backend)
  .init({
    debug: false,
    lng: localStorage.getItem("lang") || "fi",
    fallbackLng: "fi",
    supportedLngs: Object.keys(locales),
    ns: ["common"],
    defaultNS: "common",
    keySeparator: false,
    nsSeparator: false,
    postProcess: [shorthandPostProcessor.name],
    interpolation: {
      skipOnVariables: true,
      escapeValue: false,
    },
    detection: {
      order: ["navigator"],
      lookupLocalStorage: "lang",
      caches: [],
    },
  });

// Add luxon formatters into default i18next instance
addFormatters(i18n);

/**
 * I18n provider
 */
const I18nProvider: React.FC<PropsWithChildren> = (props) => {
  const { i18n } = useTranslation();

  // Set document language and direction immediately
  //  to prevent partially flipped styles.
  document.documentElement.lang = i18n.language ?? "en";
  document.dir = i18n.dir();

  return (
    <CacheProvider value={document.dir === "rtl" ? cacheRTL : cacheLTR}>
      {/* <ThemeProvider
        theme={
          document.dir === "rtl" ? themeVariants.RTL : themeVariants.default
        }
      > */}
      <LocalizationProvider
        dateAdapter={AdapterLuxon}
        adapterLocale={i18n.language}
      >
        {props.children}
      </LocalizationProvider>
      {/* </ThemeProvider> */}
    </CacheProvider>
  );
};

export default I18nProvider;
