import { Box, Typography, Dialog, DialogTitle } from "@mui/material";
import { RoomBookingDto, RoomBookingsService } from "../../api";
import { OpenAPI } from "../../api/core/OpenAPI";
import { useContext, useEffect, useState, useMemo } from "react";
import { api, BookingStatus, DeviceDto } from "../../api/api";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc"; // Importing the utc plugin for dayjs
dayjs.extend(utc); // Extending dayjs with the utc plugin
import { useSnackbar } from "notistack";
import { usePlayerInfo } from "../../hooks/usePlayerInfo";
import BookingForm, { ModalMode } from "./BookingForm";
import Calendar from "./Calendar";
import { getStatusColor, getStatusTooltip } from "./BookingHelpers";
import { LoaderContext } from "../../context/LoaderProvider";
import { usePrompt } from "../../hooks/usePrompt";
import { useTranslation } from "react-i18next";

const initialBooking: RoomBookingDto = {
  bookingDateTime: undefined,
  duration: undefined,
  isPlayingAlone: true,
  fellows: undefined,
  devices: [],
};

const Bookings = () => {
  const { t } = useTranslation();
  
  // Create localized version of getStatusTooltip
  const getLocalizedStatusTooltip = (status: string) => {
    return getStatusTooltip(status, t);
  };
  const { enqueueSnackbar } = useSnackbar();
  const { playerInfo } = usePlayerInfo();
  const { setLoading } = useContext(LoaderContext);

  const [calendar, setCalendar] = useState<RoomBookingDto[]>([]);
  const [calendarKey, setCalendarKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(ModalMode.CREATE);
  const [selectedBooking, setSelectedBooking] = useState<RoomBookingDto | null>(
    null
  );
  const [bookRoom, setBookRoom] = useState<RoomBookingDto>(initialBooking);
  const [allDevices, setAllDevices] = useState<DeviceDto[]>([]);
  const [originalBooking, setOriginalBooking] = useState<RoomBookingDto | null>(
    null
  );
  const [freeTimeEvents, setFreeTimeEvents] = useState<any[]>([]);

  useEffect(() => {
    if (playerInfo && playerInfo.id) {
      fetchPlayerBookings(playerInfo.id);
    }
  }, [playerInfo]);

  const fetchPlayerBookings = async (playerId: number) => {
    try {
      const fetchedBookings =
        await api.RoomBookingsService.getRoomBookingsByPlayerId(playerId);
      setCalendar(Array.isArray(fetchedBookings) ? fetchedBookings : []);
    } catch (err) {
      console.error("Error fetching bookings:", err);
    }
  };

  useEffect(() => {
    api.DevicesService.getAllDevices()
      .then((fetchedDevices) => {
        setAllDevices(fetchedDevices);
      })
      .catch((err) => {
        console.error("Error fetching devices:", err);
      });
  }, []);

  const bookedEvents = calendar
    .filter((booking) => booking.status !== BookingStatus.CANCELLED)
    .map((booking) => {
    const start = booking.bookingDateTime
      ? new Date(booking.bookingDateTime)
      : new Date();
    const end = new Date(
      start.getTime() + (booking.duration || 0) * 60 * 60 * 1000
    );
    const color = getStatusColor(booking.status ?? "");
    return {
      ...(booking.id ? { id: booking.id.toString() } : {}),
      title: ` - ${booking.duration} hrs`,
      start,
      end,
      backgroundColor: color,
      borderColor: color,
      status: booking.status,
      extendedProps: { booking },
    };
  });

  // Fetch free time events for the next 14 days using date range endpoint for faster loading
  useEffect(() => {
    const fetchFreeTimeEvents = async () => {
      // Use local date to avoid timezone issues
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 13); // 14 days total (0-13)
      
      // Format dates as YYYY-MM-DD (ISO date format without time)
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const startDateStr = formatDate(startDate);
      const endDateStr = formatDate(endDate);
      
      try {
        const base = (OpenAPI as any).BASE || "";
        const headers = { ...(OpenAPI as any).HEADERS } as Record<string, string>;
        const response = await fetch(
          `${base}/api/gameroombookings/free-time-events-range?startDate=${startDateStr}&endDate=${endDateStr}`,
          { headers }
        );
        
        if (!response.ok) {
          // Try to get error message from response body
          let errorMessage = response.statusText;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.Message || response.statusText;
          } catch {
            // If response is not JSON, use statusText
          }
          throw new Error(`Failed to fetch free time events: ${errorMessage}`);
        }
        
        const freeIntervals = await response.json();
        const ftEvents = freeIntervals.map((interval: any) => ({
          start: interval.start,
          end: interval.end,
          display: interval.display,
          backgroundColor: interval.color,
        }));
        setFreeTimeEvents(ftEvents);
      } catch (error) {
        console.error("Error fetching free time events:", error);
        // Fallback to parallel requests if range endpoint fails
        const days = Array.from({ length: 14 }, (_, i) => {
          const day = new Date();
          day.setDate(day.getDate() + i);
          return day.toISOString();
        });
        const promises = days.map(day => 
          RoomBookingsService.getFreeTimeEventsForDay(day)
        );
        try {
          const results = await Promise.all(promises);
          const ftEvents = results.flatMap(freeIntervals =>
            freeIntervals.map((interval: any) => ({
              start: interval.start,
              end: interval.end,
              display: interval.display,
              backgroundColor: interval.color,
            }))
          );
          setFreeTimeEvents(ftEvents);
        } catch (fallbackError) {
          console.error("Error in fallback fetching:", fallbackError);
        }
      }
    };
    fetchFreeTimeEvents();
  }, []);

  // Merge free time background events with booked events.
  // Memoize events array to prevent unnecessary calendar re-renders
  const events = useMemo(() => {
    return [...freeTimeEvents, ...bookedEvents];
  }, [freeTimeEvents, bookedEvents]);

  // Open modal to create a new booking when a day cell is clicked
  const handleCreateNewBooking = (arg: any) => {
    setBookRoom({
      ...initialBooking,
      // Pre-fill the date with the clicked cell date
      bookingDateTime: dayjs(arg.date).format("YYYY-MM-DDTHH:mm"),
      // Set default duration to 1 hour so validation works immediately
      duration: 1,
    });
    setModalMode(ModalMode.CREATE);
    setSelectedBooking(null);
    setModalOpen(true);
  };

  // Open modal to edit an existing booking when its event is clicked
  const handleShowExistingBooking = (arg: any) => {
    const booking = arg.event.extendedProps.booking;
    if (booking) {
      setSelectedBooking(booking);
      setOriginalBooking({ ...booking });
      setModalMode(ModalMode.UPDATE);
      setModalOpen(true);
    }
  };

  const handleBookingDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (modalMode === ModalMode.CREATE) {
      setBookRoom((prev) => ({
        ...prev,
        bookingDateTime: value as any,
      }));
    } else if (modalMode === ModalMode.UPDATE && selectedBooking) {
      setSelectedBooking({
        ...selectedBooking,
        bookingDateTime: value as any,
      });
    }
  };

  const handleDurationChange = (e: { target: { value: number } }) => {
    const numHours = e.target.value;
    if (modalMode === ModalMode.CREATE) {
      setBookRoom({
        ...bookRoom,
        duration: numHours,
      });
    } else if (modalMode === ModalMode.UPDATE && selectedBooking) {
      setSelectedBooking({
        ...selectedBooking,
        duration: numHours,
      });
    }
  };

  const handlePlayingAloneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (modalMode === ModalMode.CREATE) {
      setBookRoom((prev) => ({
        ...prev,
        isPlayingAlone: checked,
        // When not playing alone, set fellows to 1 by default
        fellows: checked ? 0 : (prev.fellows ?? 1),
      }));
    } else if (modalMode === ModalMode.UPDATE && selectedBooking) {
      setSelectedBooking({
        ...selectedBooking,
        isPlayingAlone: checked,
        // When not playing alone, set fellows to 1 by default
        fellows: checked ? 0 : (selectedBooking.fellows ?? 1),
      });
    }
  };

  const handleFellowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fellowsValue = parseInt(e.target.value, 10) || 0;
    if (modalMode === ModalMode.CREATE) {
      setBookRoom({ ...bookRoom, fellows: fellowsValue });
    } else if (modalMode === ModalMode.UPDATE && selectedBooking) {
      setSelectedBooking({ ...selectedBooking, fellows: fellowsValue });
    }
  };

  const handleDeviceChange = (deviceId: number, checked: boolean) => {
    if (modalMode === ModalMode.CREATE) {
      if (checked) {
        const device = allDevices.find(d => d.id === deviceId);
        if (device) {
          setBookRoom({
            ...bookRoom,
            devices: [device],
          });
        }
      } else {
        setBookRoom({
          ...bookRoom,
          devices: [],
        });
      }
    } else if (modalMode === ModalMode.UPDATE && selectedBooking) {
      if (checked) {
        const device = allDevices.find(d => d.id === deviceId);
        if (device) {
          setSelectedBooking({
            ...selectedBooking,
            devices: [device],
          });
        }
      } else {
        setSelectedBooking({
          ...selectedBooking,
          devices: [],
        });
      }
    }
  };

  const checkFieldsValidation = (): boolean => {
    // Determine which booking object to validate (CREATE or UPDATE mode)
    const bookingToValidate = modalMode === ModalMode.CREATE ? bookRoom : selectedBooking;
    if (!bookingToValidate) return false;

    // Check if booking date/time is set and valid
    const isBookingDateTimeValid = 
      !!bookingToValidate.bookingDateTime && 
      dayjs(bookingToValidate.bookingDateTime).isValid();

    // Check if duration is valid (0.5, 1, 1.5, or 2 hours)
    // Duration can be undefined initially, but if it's set, it must be valid
    const durationNumber = Number(bookingToValidate.duration ?? 0);
    const isDurationValid =
      durationNumber > 0 &&
      durationNumber >= 0.5 &&
      durationNumber <= 2 &&
      Math.abs(durationNumber * 2 - Math.round(durationNumber * 2)) < 1e-9;

    // Check fellows: 
    // - If playing alone, fellows must be 0
    // - If not playing alone, fellows must be >= 1
    const isPlayingAlone = bookingToValidate.isPlayingAlone ?? true;
    const fellows = bookingToValidate.fellows ?? 0;
    const isFellowsValid = isPlayingAlone 
      ? fellows === 0 
      : (fellows >= 1);

    // Must have exactly one device selected
    const hasOneDevice = (bookingToValidate.devices?.length || 0) === 1;

    return isBookingDateTimeValid && isDurationValid && isFellowsValid && hasOneDevice;
  };

  const checkFieldsChange = () => {
    if (!originalBooking || !selectedBooking) return false;
    
    // Check if device ID changed (compare first device ID)
    const originalDeviceId = originalBooking.devices?.[0]?.id;
    const selectedDeviceId = selectedBooking.devices?.[0]?.id;
    const deviceChanged = originalDeviceId !== selectedDeviceId;
    
    return (
      (selectedBooking.bookingDateTime?.trim() || "") !==
        (originalBooking.bookingDateTime?.trim() || "") ||
      selectedBooking.duration !== originalBooking.duration ||
      deviceChanged ||
      selectedBooking.isPlayingAlone !== originalBooking.isPlayingAlone ||
      selectedBooking.fellows !== originalBooking.fellows
    );
  };

  const handleRoomBooking = async () => {
    if (checkFieldsValidation()) {
      setLoading(true);
      try {
        // Send the create request in the same shape as Admin view (uses deviceIds)
        const base = (OpenAPI as any).BASE || "";
        const headers = { ...(OpenAPI as any).HEADERS, "Content-Type": "application/json" } as Record<string, string>;
        const deviceId = bookRoom.devices && bookRoom.devices[0] ? bookRoom.devices[0].id : undefined;
        const response = await fetch(`${base}/api/gameroombookings/bookgameroom`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            bookingDateTime: bookRoom.bookingDateTime,
            duration: Number(bookRoom.duration),
            fellows: bookRoom.fellows ?? 0,
            isPlayingAlone: bookRoom.isPlayingAlone ?? true,
            deviceIds: deviceId ? [deviceId] : [],
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}: ${response.statusText}` }));
          throw new Error(errorData.message || errorData.Message || `Failed to create booking: ${response.statusText}`);
        }

        // Fetch the player's bookings again to get the new one
        if (playerInfo?.id) {
          const fetched = await api.RoomBookingsService.getRoomBookingsByPlayerId(playerInfo.id);
          setCalendar(Array.isArray(fetched) ? fetched : []);
        }
        enqueueSnackbar(
          t("notify.roomBookedSuccess", {
            date: dayjs(bookRoom.bookingDateTime).format("MMMM D, YYYY h:mm A")
          }),
          { variant: "success", autoHideDuration: 4000 }
        );

        // Reset fields
        setBookRoom(initialBooking);

        // Close modal
        setModalOpen(false);
      } catch (error: any) {
        // Extract error message from various possible error formats
        const serverMessage = error?.message || error?.body?.message || error?.body?.Message || error?.Message;
        
        // Map common English error messages to translation keys
        let translationKey = "errors.bookingFailed";
        if (serverMessage?.includes("Selected device is not available") || serverMessage?.includes("not available")) {
          translationKey = "errors.deviceNotAvailable";
        } else if (serverMessage?.includes("Exactly one device must be selected")) {
          translationKey = "errors.deviceRequired";
        } else if (serverMessage?.includes("Duration must be")) {
          translationKey = "errors.invalidDuration";
        } else if (serverMessage?.includes("Booking date/time must be")) {
          translationKey = "errors.invalidDateTime";
        }

        enqueueSnackbar(t(translationKey), { variant: "error", autoHideDuration: 5000 });
        console.error("Error booking room:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const updateBooking = async () => {
    if (!selectedBooking || !selectedBooking.id) return;

    setLoading(true);
    try {
      const base = (OpenAPI as any).BASE || "";
      const headers = { ...(OpenAPI as any).HEADERS, "Content-Type": "application/json" } as Record<string, string>;
      const deviceId = selectedBooking.devices && selectedBooking.devices[0] ? selectedBooking.devices[0].id : undefined;
      await fetch(`${base}/api/gameroombookings/booking/${selectedBooking.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          bookingDateTime: selectedBooking.bookingDateTime,
          duration: Number(selectedBooking.duration),
          isPlayingAlone: selectedBooking.isPlayingAlone ?? true,
          fellows: selectedBooking.fellows ?? 0,
          deviceIds: deviceId ? [deviceId] : [],
        }),
      }).then(async (r) => { if (!r.ok) throw await r.json().catch(() => new Error(t("errors.badRequest"))); });

      // Re-fetch the bookings.
      const fetchedBookings =
        await api.RoomBookingsService.getRoomBookingsByPlayerId(
          playerInfo?.id!
        );
      // Merge the updated booking's devices if it exists in the fetched data.
      const updatedBookings = (
        Array.isArray(fetchedBookings) ? fetchedBookings : []
      ).map((booking) =>
        booking.id === selectedBooking.id
          ? { ...booking, devices: selectedBooking.devices }
          : booking
      );
      setCalendar(updatedBookings);
      setSelectedBooking({ ...selectedBooking });
        enqueueSnackbar(
          t("notify.bookingUpdatedSuccess", {
            date: dayjs(selectedBooking.bookingDateTime).format("MMMM D, YYYY h:mm A")
          }),
          { variant: "success", autoHideDuration: 4000 }
        );
      setModalOpen(false);
    } catch (error: any) {
      const serverMessage = error?.Message || error?.message;
      enqueueSnackbar(serverMessage || t("errors.bookingUpdateFailed"), { variant: "error", autoHideDuration: 5000 });
      console.error("Error updating booking:", error);
    } finally {
      setLoading(false);
    }
  };

  const onCancelBooking = async () => {
    if (!selectedBooking || !selectedBooking.id) return;
    const confirmCancel = window.confirm(t("bookings.confirmCancel"));
    if (!confirmCancel) return;
    setLoading(true);
    try {
      const base = (OpenAPI as any).BASE || "";
      const headers = { ...(OpenAPI as any).HEADERS } as Record<string, string>;
      const response = await fetch(`${base}/api/gameroombookings/my/${selectedBooking.id}`, {
        method: "DELETE",
        headers,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ Message: `HTTP ${response.status}: ${response.statusText}` }));
        throw new Error(errorData.Message || errorData.message || `Failed to delete booking: ${response.statusText}`);
      }
      
      await response.json().catch(() => ({}));
      enqueueSnackbar(t("notify.bookingCancelled"), {
        variant: "success",
        autoHideDuration: 4000,
      });
      setModalOpen(false);
      if (playerInfo && playerInfo.id) {
        await fetchPlayerBookings(playerInfo.id);
        setCalendarKey((prevKey) => prevKey + 1); // Force re-render of calendar
      }
    } catch (error: any) {
      const serverMessage = error?.Message || error?.message || error?.toString();
      enqueueSnackbar(serverMessage || t("errors.bookingCancelFailed"), { variant: "error", autoHideDuration: 5000 });
      console.error("Error cancelling booking:", error);
    } finally {
      setLoading(false);
    }
  };

  const onDeleteBooking = async () => {
    if (!selectedBooking || !selectedBooking.id) return;
    const confirmDelete = window.confirm(t("bookings.confirmDelete"));
    if (!confirmDelete) return;

    setLoading(true);
    try {
      await api.RoomBookingsService.deleteBooking(selectedBooking.id);
      enqueueSnackbar(t("notify.bookingDeleted"), { variant: "success", autoHideDuration: 4000 });
      setModalOpen(false);
      if (playerInfo && playerInfo.id) {
        fetchPlayerBookings(playerInfo.id);
      }
    } catch (error: any) {
      enqueueSnackbar(t("errors.bookingDeleteFailed"), { variant: "error", autoHideDuration: 5000 });
      console.error("Error deleting booking:", error);
    } finally {
      setLoading(false);
    }
  };

  // Memoize isChanged to prevent unnecessary re-renders and multiple blockers
  const isChanged = useMemo(() => {
    return checkFieldsValidation() || checkFieldsChange();
  }, [bookRoom, selectedBooking, originalBooking, modalMode]);

  usePrompt(t("common.unsavedChangesPrompt"), isChanged);

  return (
    <Box sx={styles.container}>
      <Typography sx={styles.title}>{t("nav.calendar")}</Typography>
      <Calendar
        key={calendarKey} // Force re-render of calendar when key changes
        events={events}
        onCreateNewBooking={handleCreateNewBooking}
        onShowExistingBooking={handleShowExistingBooking}
        getStatusTooltip={getLocalizedStatusTooltip}
      />
      {/* Dialog for creating/editing bookings */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {modalMode === ModalMode.CREATE
            ? t("admin.bookings.add")
            : selectedBooking?.status === BookingStatus.CANCELLED
            ? t("bookings.cancelledBooking")
            : selectedBooking?.status === BookingStatus.COMPLETED
            ? t("bookings.completedBooking")
            : t("bookings.updateBooking")}
        </DialogTitle>
        <BookingForm
          mode={modalMode}
          booking={
            modalMode === ModalMode.CREATE ? bookRoom : selectedBooking!
          }
          allDevices={allDevices}
          selectedBooking={selectedBooking}
          allBookings={calendar}
          onBookingDateTimeChange={handleBookingDateTimeChange}
          onDurationChange={handleDurationChange}
          onPlayingAloneChange={handlePlayingAloneChange}
          onFellowsChange={handleFellowsChange}
          onDeviceChange={handleDeviceChange}
          onSubmit={handleRoomBooking}
          onUpdateBooking={updateBooking}
          onCancel={() => setModalOpen(false)}
          checkFieldsValidation={checkFieldsValidation}
          onDeleteBooking={onDeleteBooking}
          onCancelBooking={onCancelBooking}
          onFieldChange={checkFieldsChange}
        />
      </Dialog>
    </Box>
  );
};

export default Bookings;

const styles = {
  container: {
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
};
