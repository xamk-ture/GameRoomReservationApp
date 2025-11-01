import { Box, Typography, Dialog, DialogTitle } from "@mui/material";
import { RoomBookingDto, RoomBookingsService } from "../../api";
import { useContext, useEffect, useState } from "react";
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

  const bookedEvents = calendar.map((booking) => {
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

  // Fetch free time events for the next 7 days and store in state.
  useEffect(() => {
    const fetchFreeTimeEvents = async () => {
      const ftEvents: any[] = [];
      for (let i = 0; i < 14; i++) {
        const day = new Date();
        day.setDate(day.getDate() + i);
        const freeIntervals = await RoomBookingsService.getFreeTimeEventsForDay(
          day.toISOString()
        );
        ftEvents.push(
          ...freeIntervals.map((interval) => ({
            start: interval.start,
            end: interval.end,
            display: interval.display,
            backgroundColor: interval.color,
          }))
        );
      }
      setFreeTimeEvents(ftEvents);
    };
    fetchFreeTimeEvents();
  }, []);

  // Merge free time background events with booked events.
  const events = [...freeTimeEvents, ...bookedEvents];

  // Open modal to create a new booking when a day cell is clicked
  const handleCreateNewBooking = (arg: any) => {
    setBookRoom({
      ...initialBooking,
      // Pre-fill the date with the clicked cell date
      bookingDateTime: dayjs(arg.date).format("YYYY-MM-DDTHH:mm"),
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
        fellows: checked ? 0 : prev.fellows,
      }));
    } else if (modalMode === ModalMode.UPDATE && selectedBooking) {
      setSelectedBooking({
        ...selectedBooking,
        isPlayingAlone: checked,
        fellows: checked ? 0 : selectedBooking.fellows,
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
      const currentDevices = bookRoom.devices ?? [];
      if (checked) {
        const device = allDevices.find(d => d.id === deviceId);
        if (device) {
          setBookRoom({
            ...bookRoom,
            devices: [...currentDevices, device],
          });
        }
      } else {
        setBookRoom({
          ...bookRoom,
          devices: currentDevices.filter(d => d.id !== deviceId),
        });
      }
    } else if (modalMode === ModalMode.UPDATE && selectedBooking) {
      const currentDevices = selectedBooking.devices ?? [];
      if (checked) {
        const device = allDevices.find(d => d.id === deviceId);
        if (device) {
          setSelectedBooking({
            ...selectedBooking,
            devices: [...currentDevices, device],
          });
        }
      } else {
        setSelectedBooking({
          ...selectedBooking,
          devices: currentDevices.filter(d => d.id !== deviceId),
        });
      }
    }
  };

  const checkFieldsValidation = (): boolean => {
    const isBookingDateTimeValid =
      bookRoom.bookingDateTime !== initialBooking.bookingDateTime;

    const durationNumber = parseInt(String(bookRoom.duration ?? ""), 10);
    const isDurationValid =
      !isNaN(durationNumber) &&
      durationNumber > 0 &&
      bookRoom.duration !== initialBooking.duration;

    const isFellowsValid =
      bookRoom.isPlayingAlone ||
      (bookRoom.fellows !== undefined &&
        bookRoom.fellows > 0 &&
        bookRoom.fellows !== initialBooking.fellows);

    return isBookingDateTimeValid && isDurationValid && isFellowsValid;
  };

  const checkFieldsChange = () => {
    if (!originalBooking || !selectedBooking) return false;
    return (
      (selectedBooking.bookingDateTime?.trim() || "") !==
        (originalBooking.bookingDateTime?.trim() || "") ||
      selectedBooking.duration !== originalBooking.duration ||
      selectedBooking.devices?.length !== originalBooking.devices?.length ||
      selectedBooking.isPlayingAlone !== originalBooking.isPlayingAlone ||
      selectedBooking.fellows !== originalBooking.fellows
    );
  };

  const handleRoomBooking = async () => {
    if (checkFieldsValidation()) {
      setLoading(true);
      try {
        const response = await api.RoomBookingsService.bookGameRoom(bookRoom);
        enqueueSnackbar(
          t("notify.roomBookedSuccess", {
            date: dayjs(bookRoom.bookingDateTime).format("MMMM D, YYYY h:mm A")
          }),
          { variant: "success" }
        );

        const freshBooking = await api.RoomBookingsService.getRoomBookingById(
          response.id!
        );
        // Add the new booking to the calendar state
        setCalendar((prev) => [...prev, freshBooking]);

        // Reset fields
        setBookRoom(initialBooking);

        // Close modal
        setModalOpen(false);
      } catch (error: any) {
        const serverMessage = error?.body?.message || error?.body?.Message;

        if (serverMessage) {
          enqueueSnackbar(serverMessage, { variant: "error" });
        } else {
          enqueueSnackbar("Error booking room", { variant: "error" });
        }
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
      const payload = {
        ...selectedBooking,
        devices: selectedBooking.devices || [],
      };
      const updated = await api.RoomBookingsService.updateRoomBooking(
        selectedBooking.id,
        payload
      );

      // Merge the devices from payload to the response.
      const updatedBooking = { ...updated, devices: payload.devices };

      // Re-fetch the bookings.
      const fetchedBookings =
        await api.RoomBookingsService.getRoomBookingsByPlayerId(
          playerInfo?.id!
        );
      // Merge the updated booking's devices if it exists in the fetched data.
      const updatedBookings = (
        Array.isArray(fetchedBookings) ? fetchedBookings : []
      ).map((booking) =>
        booking.id === updatedBooking.id
          ? { ...booking, devices: updatedBooking.devices }
          : booking
      );
      setCalendar(updatedBookings);
      setSelectedBooking(updatedBooking);
        enqueueSnackbar(
          t("notify.bookingUpdatedSuccess", {
            date: dayjs(selectedBooking.bookingDateTime).format("MMMM D, YYYY h:mm A")
          }),
          { variant: "success" }
        );
      setModalOpen(false);
    } catch (error: any) {
      enqueueSnackbar(t("errors.bookingUpdateFailed"), { variant: "error" });
      console.error("Error updating booking:", error);
    } finally {
      setLoading(false);
    }
  };

  const onCancelBooking = async () => {
    if (!selectedBooking || !selectedBooking.id) return;
    // Update the booking status to cancelled
    const confirmCancel = window.confirm(t("bookings.confirmCancel"));
    if (!confirmCancel) return;
    const updatedBooking = {
      ...selectedBooking,
      status: BookingStatus.CANCELLED,
    };
    setLoading(true);
    try {
      await api.RoomBookingsService.updateRoomBooking(
        selectedBooking.id,
        updatedBooking
      );
      enqueueSnackbar(t("notify.bookingCancelled"), {
        variant: "success",
      });
      setModalOpen(false);
      if (playerInfo && playerInfo.id) {
        await fetchPlayerBookings(playerInfo.id);
        setCalendarKey((prevKey) => prevKey + 1); // Force re-render of calendar
      }
    } catch (error: any) {
      enqueueSnackbar(t("errors.bookingCancelFailed"), { variant: "error" });
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
      enqueueSnackbar(t("notify.bookingDeleted"), { variant: "success" });
      setModalOpen(false);
      if (playerInfo && playerInfo.id) {
        fetchPlayerBookings(playerInfo.id);
      }
    } catch (error: any) {
      enqueueSnackbar(t("errors.bookingDeleteFailed"), { variant: "error" });
      console.error("Error deleting booking:", error);
    } finally {
      setLoading(false);
    }
  };

  const isChanged = checkFieldsValidation() || checkFieldsChange();

  usePrompt(t("common.unsavedChangesPrompt"), isChanged);

  return (
    <Box sx={styles.container}>
      <Typography sx={styles.title}>{t("nav.calendar")}</Typography>
      <Calendar
        key={calendarKey} // Force re-render of calendar when key changes
        events={events}
        onCreateNewBooking={handleCreateNewBooking}
        onShowExistingBooking={handleShowExistingBooking}
        getStatusTooltip={getStatusTooltip}
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
};
