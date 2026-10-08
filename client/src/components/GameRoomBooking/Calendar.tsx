import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useMemo, useRef } from "react";
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const calendarRef = useRef<FullCalendar>(null);
  
  // Map i18n language codes to FullCalendar locales
  const locale = useMemo(() => {
    const lang = i18n.language.split('-')[0]; // Get base language code (e.g., "fi" from "fi-FI")
    switch (lang) {
      case 'fi':
        return fiLocale;
      case 'en':
        return enLocale;
      default:
        return enLocale;
    }
  }, [i18n.language]);

  // Memoize event handlers to prevent unnecessary re-renders
  const handleDateClick = useMemo(() => {
    return (arg: any) => {
      // Only handle date clicks, not navigation button clicks
      // Prevent interference with navigation buttons
      if (arg.jsEvent) {
        const target = arg.jsEvent.target as HTMLElement;
        // Don't handle clicks on navigation buttons, toolbar, or any button-like elements
        if (target.closest('.fc-button') || 
            target.closest('.fc-toolbar') ||
            target.closest('button') ||
            target.tagName === 'BUTTON') {
          return;
        }
      }
      onCreateNewBooking(arg);
    };
  }, [onCreateNewBooking]);

  const handleEventClick = useMemo(() => {
    return (arg: any) => {
      arg.jsEvent?.stopPropagation();
      onShowExistingBooking(arg);
    };
  }, [onShowExistingBooking]);
  
  return (
    <Box sx={{ height: { xs: "calc(100vh - 200px)", md: "calc(100vh - 140px)" } }}>
      <FullCalendar
        ref={calendarRef}
        key={i18n.language} // Force re-render when language changes
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={isMobile ? "timeGridDay" : "timeGridWeek"}
        initialDate={new Date()}
        locale={locale}
        headerToolbar={
          isMobile
            ? {
                left: "prev,next",
                center: "title",
                right: "",
              }
            : {
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }
        }
        views={{
          timeGridWeek: {
            dayHeaderFormat: { weekday: "short", day: "numeric" },
            slotLabelFormat: { hour: "2-digit", minute: "2-digit" },
          },
          timeGridDay: {
            dayHeaderFormat: { weekday: "long", day: "numeric", month: "short" },
            slotLabelFormat: { hour: "2-digit", minute: "2-digit" },
          },
          dayGridMonth: {
            dayHeaderFormat: { weekday: "short" },
          },
        }}
        expandRows={true}
        dayMaxEvents={true}
        events={events}
        height="100%"
        selectable={false}
        unselectAuto={false}
        eventStartEditable={false}
        eventDurationEditable={false}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        eventDidMount={(info) => {
          info.el.setAttribute(
            "title",
            getStatusTooltip(info.event.extendedProps.status)
          );
        }}
        // Optimize navigation responsiveness
        navLinks={true}
        moreLinkClick="popover"
        // Prevent event propagation issues
        eventMouseEnter={(info) => {
          info.el.style.cursor = 'pointer';
        }}
      />
    </Box>
  );
};

export default Calendar;
