import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import fiLocale from "@fullcalendar/core/locales/fi";
import enLocale from "@fullcalendar/core/locales/en-gb";

interface CalendarProps {
  events: any[];
  onCreateNewBooking: (arg: any) => void;
  onShowExistingBooking: (arg: any) => void;
  getStatusTooltip: (status: string) => string;
}

const Calendar = ({
  events,
  getStatusTooltip,
  onCreateNewBooking,
  onShowExistingBooking,
}: CalendarProps) => {
  const { i18n } = useTranslation();
  
  // Map i18n language codes to FullCalendar locales
  const getLocale = () => {
    const lang = i18n.language.split('-')[0]; // Get base language code (e.g., "fi" from "fi-FI")
    switch (lang) {
      case 'fi':
        return fiLocale;
      case 'en':
        return enLocale;
      default:
        return enLocale;
    }
  };
  
  return (
    <Box sx={{ height: "calc(100vh - 140px)" }}>
      <FullCalendar
        key={i18n.language} // Force re-render when language changes
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        initialDate={new Date()}
        locale={getLocale()}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={events}
        height="100%"
        dateClick={onCreateNewBooking}
        eventClick={onShowExistingBooking}
        eventDidMount={(info) => {
          info.el.setAttribute(
            "title",
            getStatusTooltip(info.event.extendedProps.status)
          );
        }}
      />
    </Box>
  );
};

export default Calendar;
