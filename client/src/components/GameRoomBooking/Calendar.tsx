import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Box } from "@mui/material";
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
    <Box sx={{ height: "calc(100vh - 140px)" }}>
      <FullCalendar
        ref={calendarRef}
        key={i18n.language} // Force re-render when language changes
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        initialDate={new Date()}
        locale={locale}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
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
        dayMaxEvents={false}
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
