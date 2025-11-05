import { Typography, Box, TextField, Card, CardContent, Chip, Divider, Button, Dialog, DialogTitle } from "@mui/material";
import { usePlayerInfo } from "../../hooks/usePlayerInfo";
import { api, RoomBookingDto, BookingStatus, DeviceDto } from "../../api/api";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { OpenAPI } from "../../api/core/OpenAPI";
import { enqueueSnackbar } from "notistack";
import BookingForm, { ModalMode } from "../GameRoomBooking/BookingForm";

const PlayerProfile = () => {
  const { t, i18n } = useTranslation();
  const { playerInfo, loading } = usePlayerInfo();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<RoomBookingDto[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<RoomBookingDto | null>(null);
  const [allDevices, setAllDevices] = useState<DeviceDto[]>([]);
  const [editableBooking, setEditableBooking] = useState<RoomBookingDto | null>(null);

  useEffect(() => {
    if (playerInfo?.id) {
      fetchBookings();
    }
  }, [playerInfo?.id]);

  useEffect(() => {
    api.DevicesService.getAllDevices()
      .then((devices) => setAllDevices(devices || []))
      .catch((err) => console.error("Error fetching devices:", err));
  }, []);

  const fetchBookings = async () => {
    if (!playerInfo?.id) return;
    setLoadingBookings(true);
    try {
      const fetchedBookings = await api.RoomBookingsService.getRoomBookingsByPlayerId(playerInfo.id);
      const bookingsArray = Array.isArray(fetchedBookings) ? fetchedBookings : [];
      // Filter out cancelled bookings and sort by date (upcoming first)
      const activeBookings = bookingsArray
        .filter(b => b.status !== BookingStatus.CANCELLED)
        .sort((a, b) => {
          const dateA = dayjs(a.bookingDateTime as any);
          const dateB = dayjs(b.bookingDateTime as any);
          return dateA.isValid() && dateB.isValid() ? dateA.diff(dateB) : 0;
        });
      setBookings(activeBookings);
    } catch (err) {
      console.error("Error fetching bookings:", err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const formatTime = (dateTime: dayjs.Dayjs) => {
    const isEnglish = i18n.language === "en";
    return isEnglish ? dateTime.format("h:mm A") : dateTime.format("HH.mm");
  };

  const formatDateTime = (dateTime?: any) => {
    if (!dateTime) return "";
    try {
      const d = dayjs(dateTime);
      if (!d.isValid()) return "";
      return `${d.format("DD.MM.YYYY")} ${t("common.atTime", { time: formatTime(d) })}`;
    } catch { return ""; }
  };


  const getStatusColor = (status?: BookingStatus) => {
    switch (status) {
      case BookingStatus.UPCOMING:
        return "primary";
      case BookingStatus.ONGOING:
        return "success";
      case BookingStatus.COMPLETED:
        return "default";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status?: BookingStatus) => {
    switch (status) {
      case BookingStatus.UPCOMING:
        return t("bookings.upcoming");
      case BookingStatus.ONGOING:
        return t("bookings.ongoing");
      case BookingStatus.COMPLETED:
        return t("bookings.completed");
      default:
        return "";
    }
  };

  const handleEditBooking = (booking: RoomBookingDto) => {
    setSelectedBooking(booking);
    setEditableBooking({ ...booking });
    setModalOpen(true);
  };

  const handleBookingDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editableBooking) {
      setEditableBooking({
        ...editableBooking,
        bookingDateTime: e.target.value as any,
      });
    }
  };

  const handleDurationChange = (e: { target: { value: number } }) => {
    if (editableBooking) {
      setEditableBooking({
        ...editableBooking,
        duration: e.target.value,
      });
    }
  };

  const handlePlayingAloneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editableBooking) {
      setEditableBooking({
        ...editableBooking,
        isPlayingAlone: e.target.checked,
        // When not playing alone, set fellows to 1 by default if it was 0 or undefined
        fellows: e.target.checked ? 0 : (editableBooking.fellows && editableBooking.fellows > 0 ? editableBooking.fellows : 1),
      });
    }
  };

  const handleFellowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editableBooking) {
      setEditableBooking({
        ...editableBooking,
        fellows: parseInt(e.target.value) || 0,
      });
    }
  };

  const handleDeviceChange = (deviceId: number, checked: boolean) => {
    if (editableBooking) {
      const currentDevices = editableBooking.devices || [];
      if (checked) {
        // Only allow one device
        const device = allDevices.find(d => d.id === deviceId);
        if (device) {
          setEditableBooking({
            ...editableBooking,
            devices: [{ ...device }],
          });
        }
      } else {
        setEditableBooking({
          ...editableBooking,
          devices: currentDevices.filter(d => d.id !== deviceId),
        });
      }
    }
  };

  const checkFieldsValidation = () => {
    if (!editableBooking) return false;
    if (!editableBooking.bookingDateTime || !editableBooking.duration) return false;
    if (editableBooking.duration < 0.5 || editableBooking.duration > 2) return false;
    // Check fellows: if playing alone, fellows must be 0. If not, fellows must be >= 1
    const isPlayingAlone = editableBooking.isPlayingAlone ?? true;
    const fellows = editableBooking.fellows ?? 0;
    if (isPlayingAlone && fellows !== 0) return false;
    if (!isPlayingAlone && fellows < 1) return false;
    if (editableBooking.devices?.length !== 1) return false;
    return true;
  };

  const checkFieldsChange = () => {
    if (!selectedBooking || !editableBooking) return false;
    return JSON.stringify(selectedBooking) !== JSON.stringify(editableBooking);
  };

  const handleDeleteBooking = async (booking: RoomBookingDto) => {
    if (!booking.id) return;
    const confirmDelete = window.confirm(t("bookings.confirmDelete"));
    if (!confirmDelete) return;

    try {
      const base = (OpenAPI as any).BASE || "";
      const headers = { ...(OpenAPI as any).HEADERS } as Record<string, string>;
      const response = await fetch(`${base}/api/gameroombookings/my/${booking.id}`, {
        method: "DELETE",
        headers,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ Message: `HTTP ${response.status}: ${response.statusText}` }));
        throw new Error(errorData.Message || errorData.message || `Failed to delete booking: ${response.statusText}`);
      }
      
      await response.json().catch(() => ({}));
      enqueueSnackbar(t("notify.bookingDeleted"), {
        variant: "success",
        autoHideDuration: 4000,
      });
      // Refresh bookings list
      if (playerInfo?.id) {
        await fetchBookings();
      }
    } catch (error: any) {
      const serverMessage = error?.Message || error?.message || error?.toString();
      enqueueSnackbar(serverMessage || t("errors.bookingDeleteFailed"), { 
        variant: "error", 
        autoHideDuration: 5000 
      });
      console.error("Error deleting booking:", error);
    }
  };

  const handleUpdateBooking = async () => {
    if (!selectedBooking?.id || !editableBooking) return;

    try {
      const base = (OpenAPI as any).BASE || "";
      const headers = { ...(OpenAPI as any).HEADERS, "Content-Type": "application/json" } as Record<string, string>;
      const deviceId = editableBooking.devices?.[0]?.id;
      
      const response = await fetch(`${base}/api/gameroombookings/booking/${selectedBooking.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          bookingDateTime: editableBooking.bookingDateTime,
          duration: Number(editableBooking.duration),
          isPlayingAlone: editableBooking.isPlayingAlone ?? true,
          fellows: editableBooking.fellows ?? 0,
          deviceIds: deviceId ? [deviceId] : [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ Message: `HTTP ${response.status}: ${response.statusText}` }));
        throw new Error(errorData.Message || errorData.message || `Failed to update booking: ${response.statusText}`);
      }

      enqueueSnackbar(t("notify.bookingUpdatedSuccess", {
        date: formatDateTime(editableBooking.bookingDateTime)
      }), {
        variant: "success",
        autoHideDuration: 4000,
      });
      
      setModalOpen(false);
      setSelectedBooking(null);
      setEditableBooking(null);
      
      // Refresh bookings list
      if (playerInfo?.id) {
        await fetchBookings();
      }
    } catch (error: any) {
      const serverMessage = error?.Message || error?.message || error?.toString();
      enqueueSnackbar(serverMessage || t("errors.bookingUpdateFailed"), { 
        variant: "error", 
        autoHideDuration: 5000 
      });
      console.error("Error updating booking:", error);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    await handleDeleteBooking(selectedBooking);
  };

  const handleDeleteBookingAsync = async () => {
    if (!selectedBooking) return;
    await handleDeleteBooking(selectedBooking);
    setModalOpen(false);
    setSelectedBooking(null);
    setEditableBooking(null);
  };

  return (
    <Box sx={styles.container}>
      <Box sx={styles.profileSection}>
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

        {/* Bookings Section */}
        <Box sx={styles.bookingsSection}>
          <Typography variant="h6" sx={styles.bookingsTitle}>
            {t("profile.myBookings")}
          </Typography>
          {loadingBookings ? (
            <Typography>{t("common.loading")}</Typography>
          ) : bookings.length === 0 ? (
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              {t("profile.noBookings")}
            </Typography>
          ) : (
            <Box sx={styles.bookingsList}>
              {bookings.map((booking) => {
                const deviceName = booking.devices?.[0]?.name || t("profile.noDevice");
                const bookingDate = dayjs(booking.bookingDateTime as any);
                const endDate = bookingDate.add(booking.duration || 0, "hour");
                
                return (
                  <Card key={booking.id} sx={styles.bookingCard} elevation={2}>
                    <CardContent>
                      <Box sx={styles.bookingHeader}>
                        <Typography variant="h6" sx={styles.bookingDate}>
                          {formatDateTime(booking.bookingDateTime)}
                        </Typography>
                        <Chip
                          label={getStatusLabel(booking.status)}
                          color={getStatusColor(booking.status) as any}
                          size="small"
                        />
                      </Box>
                      <Divider sx={{ my: 1.5 }} />
                      <Box sx={styles.bookingDetails}>
                        <Box sx={styles.bookingDetailItem}>
                          <Typography variant="body2" color="text.secondary">
                            {t("profile.device")}:
                          </Typography>
                          <Typography variant="body1" sx={styles.bookingValue}>
                            {deviceName}
                          </Typography>
                        </Box>
                        <Box sx={styles.bookingDetailItem}>
                          <Typography variant="body2" color="text.secondary">
                            {t("profile.duration")}:
                          </Typography>
                          <Typography variant="body1" sx={styles.bookingValue}>
                            {booking.duration || 0} {t("profile.hours")}
                          </Typography>
                        </Box>
                        <Box sx={styles.bookingDetailItem}>
                          <Typography variant="body2" color="text.secondary">
                            {t("profile.endTime")}:
                          </Typography>
                          <Typography variant="body1" sx={styles.bookingValue}>
                            {formatDateTime(endDate.toISOString())}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={styles.bookingActions}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => navigate("/calendar")}
                          sx={{ mr: 1 }}
                        >
                          {t("profile.viewInCalendar")}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          onClick={() => handleEditBooking(booking)}
                        >
                          {t("common.edit")}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => handleDeleteBooking(booking)}
                          sx={{ ml: 1 }}
                        >
                          {t("common.delete")}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          )}
        </Box>
      </Box>

      {/* Edit Booking Dialog */}
      <Dialog open={modalOpen} onClose={() => { setModalOpen(false); setSelectedBooking(null); setEditableBooking(null); }} fullWidth maxWidth="sm">
        <DialogTitle>
          {selectedBooking?.status === BookingStatus.CANCELLED
            ? t("bookings.cancelledBooking")
            : selectedBooking?.status === BookingStatus.COMPLETED
            ? t("bookings.completedBooking")
            : t("bookings.updateBooking")}
        </DialogTitle>
        {editableBooking && (
          <BookingForm
            mode={ModalMode.UPDATE}
            booking={editableBooking}
            allDevices={allDevices}
            allBookings={bookings}
            selectedBooking={selectedBooking}
            onBookingDateTimeChange={handleBookingDateTimeChange}
            onDurationChange={handleDurationChange}
            onPlayingAloneChange={handlePlayingAloneChange}
            onFellowsChange={handleFellowsChange}
            onDeviceChange={handleDeviceChange}
            onSubmit={() => {}}
            onCancel={() => { setModalOpen(false); setSelectedBooking(null); setEditableBooking(null); }}
            checkFieldsValidation={checkFieldsValidation}
            onDeleteBooking={handleDeleteBookingAsync}
            onCancelBooking={handleCancelBooking}
            onFieldChange={checkFieldsChange}
            onUpdateBooking={handleUpdateBooking}
          />
        )}
      </Dialog>
    </Box>
  );
};

export default PlayerProfile;

const styles = {
  container: {
    padding: 2,
    height: "calc(100vh - 64px)",
    overflowY: "auto" as const,
  },
  profileSection: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 3,
    maxWidth: "900px",
  },
  title: {
    fontWeight: "bold",
    textTransform: "uppercase",
    fontSize: 32,
    letterSpacing: 1,
    marginBottom: 2,
  },
  form: {
    gap: 3,
    display: "flex",
    flexDirection: "column" as const,
    width: "50%",
  },
  bookingsSection: {
    mt: 3,
    width: "100%",
  },
  bookingsTitle: {
    fontWeight: 600,
    mb: 2,
    fontSize: 20,
  },
  bookingsList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
    mt: 2,
  },
  bookingCard: {
    borderRadius: 2,
    transition: "transform 0.2s, box-shadow 0.2s",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: 4,
    },
  },
  bookingHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    mb: 1,
  },
  bookingDate: {
    fontWeight: 600,
    fontSize: 18,
  },
  bookingDetails: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 1.5,
  },
  bookingDetailItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bookingValue: {
    fontWeight: 500,
  },
  bookingActions: {
    mt: 2,
    display: "flex",
    justifyContent: "flex-end",
    gap: 1,
    flexWrap: "wrap" as const,
  },
};
