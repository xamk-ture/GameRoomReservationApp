import { Box, Typography, Dialog, DialogTitle } from "@mui/material";
import { RoomBookingDto, PlayerDto } from "../../api";
import { OpenAPI } from "../../api/core/OpenAPI";
import { useContext, useEffect, useState, useMemo } from "react";
import { api, BookingStatus, DeviceDto } from "../../api/api";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useSnackbar } from "notistack";
import BookingForm, { ModalMode } from "../GameRoomBooking/BookingForm";
import Calendar from "../GameRoomBooking/Calendar";
import { getStatusColor, getStatusTooltip } from "../GameRoomBooking/BookingHelpers";
import { LoaderContext } from "../../context/LoaderProvider";
import { usePrompt } from "../../hooks/usePrompt";
import { useTranslation } from "react-i18next";

dayjs.extend(utc);

const initialBooking: RoomBookingDto = {
    bookingDateTime: undefined,
    duration: undefined,
    isPlayingAlone: true,
    fellows: undefined,
    devices: [],
    playerId: undefined,
};

const AdminCalendar = () => {
    const { t } = useTranslation();

    const getLocalizedStatusTooltip = (status: string) => {
        return getStatusTooltip(status, t);
    };
    const { enqueueSnackbar } = useSnackbar();
    const { setLoading } = useContext(LoaderContext);

    const [calendar, setCalendar] = useState<RoomBookingDto[]>([]);
    const [calendarKey, setCalendarKey] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<ModalMode>(ModalMode.CREATE);
    const [selectedBooking, setSelectedBooking] = useState<RoomBookingDto | null>(null);
    const [bookRoom, setBookRoom] = useState<RoomBookingDto>(initialBooking);
    const [allDevices, setAllDevices] = useState<DeviceDto[]>([]);
    const [allPlayers, setAllPlayers] = useState<PlayerDto[]>([]);
    const [originalBooking, setOriginalBooking] = useState<RoomBookingDto | null>(null);
    const [freeTimeEvents, setFreeTimeEvents] = useState<any[]>([]);

    const loadData = async () => {
        try {
            const [bookings, devices, players] = await Promise.all([
                api.RoomBookingsService.getAllBookings(),
                api.DevicesService.getAllDevices(),
                api.PlayersService.getAllPlayers()
            ]);
            setCalendar(bookings || []);
            setAllDevices(devices || []);
            setAllPlayers(players || []);
            setCalendarKey(prev => prev + 1);
        } catch (err) {
            console.error("Error loading data:", err);
            enqueueSnackbar(t("errors.loadError"), { variant: "error" });
        }
    };

    useEffect(() => {
        loadData();
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

            // Add player info to title if available
            const player = allPlayers.find(p => p.id === booking.playerId);
            const playerEmail = player?.email ? player.email.split('@')[0] : booking.playerId;

            return {
                ...(booking.id ? { id: booking.id.toString() } : {}),
                title: `${playerEmail} - ${booking.duration} hrs`,
                start,
                end,
                backgroundColor: color,
                borderColor: color,
                status: booking.status,
                extendedProps: { booking },
            };
        });

    // Fetch free time events
    useEffect(() => {
        const fetchFreeTimeEvents = async () => {
            const today = new Date();
            const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 13);

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

                if (!response.ok) throw new Error(response.statusText);

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
            }
        };
        fetchFreeTimeEvents();
    }, []);

    const events = useMemo(() => {
        return [...freeTimeEvents, ...bookedEvents];
    }, [freeTimeEvents, bookedEvents, allPlayers]);

    const handleCreateNewBooking = (arg: any) => {
        setBookRoom({
            ...initialBooking,
            bookingDateTime: dayjs(arg.date).format("YYYY-MM-DDTHH:mm"),
            duration: 1,
        });
        setModalMode(ModalMode.CREATE);
        setSelectedBooking(null);
        setModalOpen(true);
    };

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
            setBookRoom((prev) => ({ ...prev, bookingDateTime: value as any }));
        } else if (modalMode === ModalMode.UPDATE && selectedBooking) {
            setSelectedBooking({ ...selectedBooking, bookingDateTime: value as any });
        }
    };

    const handleDurationChange = (e: { target: { value: number } }) => {
        const numHours = e.target.value;
        if (modalMode === ModalMode.CREATE) {
            setBookRoom({ ...bookRoom, duration: numHours });
        } else if (modalMode === ModalMode.UPDATE && selectedBooking) {
            setSelectedBooking({ ...selectedBooking, duration: numHours });
        }
    };

    const handlePlayingAloneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        if (modalMode === ModalMode.CREATE) {
            setBookRoom((prev) => ({
                ...prev,
                isPlayingAlone: checked,
                fellows: checked ? 0 : (prev.fellows ?? 1),
            }));
        } else if (modalMode === ModalMode.UPDATE && selectedBooking) {
            setSelectedBooking({
                ...selectedBooking,
                isPlayingAlone: checked,
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
        const updateDevices = (currentBooking: RoomBookingDto) => {
            if (checked) {
                const device = allDevices.find(d => d.id === deviceId);
                return device ? [device] : [];
            }
            return [];
        };

        if (modalMode === ModalMode.CREATE) {
            setBookRoom({ ...bookRoom, devices: updateDevices(bookRoom) });
        } else if (modalMode === ModalMode.UPDATE && selectedBooking) {
            setSelectedBooking({ ...selectedBooking, devices: updateDevices(selectedBooking) });
        }
    };

    const handlePlayerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const playerId = Number(e.target.value);
        if (modalMode === ModalMode.CREATE) {
            setBookRoom({ ...bookRoom, playerId });
        } else if (modalMode === ModalMode.UPDATE && selectedBooking) {
            setSelectedBooking({ ...selectedBooking, playerId });
        }
    };

    const checkFieldsValidation = (): boolean => {
        const bookingToValidate = modalMode === ModalMode.CREATE ? bookRoom : selectedBooking;
        if (!bookingToValidate) return false;

        const isBookingDateTimeValid = !!bookingToValidate.bookingDateTime && dayjs(bookingToValidate.bookingDateTime).isValid();
        const durationNumber = Number(bookingToValidate.duration ?? 0);
        const isDurationValid = durationNumber > 0 && durationNumber >= 0.5 && durationNumber <= 2;

        const isPlayingAlone = bookingToValidate.isPlayingAlone ?? true;
        const fellows = bookingToValidate.fellows ?? 0;
        const isFellowsValid = isPlayingAlone ? fellows === 0 : (fellows >= 1);
        const hasOneDevice = (bookingToValidate.devices?.length || 0) === 1;
        const hasPlayer = !!bookingToValidate.playerId;

        return isBookingDateTimeValid && isDurationValid && isFellowsValid && hasOneDevice && hasPlayer;
    };

    const checkFieldsChange = () => {
        if (!originalBooking || !selectedBooking) return false;

        const originalDeviceId = originalBooking.devices?.[0]?.id;
        const selectedDeviceId = selectedBooking.devices?.[0]?.id;

        return (
            (selectedBooking.bookingDateTime?.trim() || "") !== (originalBooking.bookingDateTime?.trim() || "") ||
            selectedBooking.duration !== originalBooking.duration ||
            originalDeviceId !== selectedDeviceId ||
            selectedBooking.isPlayingAlone !== originalBooking.isPlayingAlone ||
            selectedBooking.fellows !== originalBooking.fellows ||
            selectedBooking.playerId !== originalBooking.playerId
        );
    };

    const handleRoomBooking = async () => {
        if (checkFieldsValidation()) {
            setLoading(true);
            try {
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
                        playerId: bookRoom.playerId
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: response.statusText }));
                    throw new Error(errorData.message || "Failed to create booking");
                }

                await loadData();
                enqueueSnackbar(t("admin.bookings.bookingCreated"), { variant: "success", autoHideDuration: 4000 });
                setBookRoom(initialBooking);
                setModalOpen(false);
            } catch (error: any) {
                enqueueSnackbar(error.message || t("errors.bookingFailed"), { variant: "error", autoHideDuration: 5000 });
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

            const response = await fetch(`${base}/api/gameroombookings/booking/${selectedBooking.id}`, {
                method: "PUT",
                headers,
                body: JSON.stringify({
                    bookingDateTime: selectedBooking.bookingDateTime,
                    duration: Number(selectedBooking.duration),
                    isPlayingAlone: selectedBooking.isPlayingAlone ?? true,
                    fellows: selectedBooking.fellows ?? 0,
                    deviceIds: deviceId ? [deviceId] : [],
                    playerId: selectedBooking.playerId
                }),
            });

            if (!response.ok) throw new Error("Failed to update booking");

            await loadData();
            enqueueSnackbar(t("admin.bookings.bookingUpdated"), { variant: "success", autoHideDuration: 4000 });
            setModalOpen(false);
        } catch (error: any) {
            enqueueSnackbar(t("errors.bookingUpdateFailed"), { variant: "error", autoHideDuration: 5000 });
        } finally {
            setLoading(false);
        }
    };

    const onDeleteBooking = async () => {
        if (!selectedBooking || !selectedBooking.id) return;
        if (!window.confirm(t("bookings.confirmDelete"))) return;

        setLoading(true);
        try {
            await api.RoomBookingsService.deleteBooking(selectedBooking.id);
            enqueueSnackbar(t("notify.bookingDeleted"), { variant: "success", autoHideDuration: 4000 });
            setModalOpen(false);
            await loadData();
        } catch (error: any) {
            enqueueSnackbar(t("errors.bookingDeleteFailed"), { variant: "error", autoHideDuration: 5000 });
        } finally {
            setLoading(false);
        }
    };

    const onCancelBooking = async () => {
        // For admin, cancel is same as delete but maybe with different notification
        await onDeleteBooking();
    };

    const isChanged = useMemo(() => {
        return checkFieldsValidation() || checkFieldsChange();
    }, [bookRoom, selectedBooking, originalBooking, modalMode]);

    usePrompt(t("common.unsavedChangesPrompt"), isChanged);

    return (
        <Box sx={styles.container}>
            <Typography sx={styles.title}>{t("nav.calendar")}</Typography>
            <Calendar
                key={calendarKey}
                events={events}
                onCreateNewBooking={handleCreateNewBooking}
                onShowExistingBooking={handleShowExistingBooking}
                getStatusTooltip={getLocalizedStatusTooltip}
            />
            <Dialog open={modalOpen} onClose={() => setModalOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>
                    {modalMode === ModalMode.CREATE ? t("admin.bookings.add") : t("admin.bookings.edit")}
                </DialogTitle>
                <BookingForm
                    mode={modalMode}
                    booking={modalMode === ModalMode.CREATE ? bookRoom : selectedBooking!}
                    allDevices={allDevices}
                    players={allPlayers}
                    selectedBooking={selectedBooking}
                    allBookings={calendar}
                    onBookingDateTimeChange={handleBookingDateTimeChange}
                    onDurationChange={handleDurationChange}
                    onPlayingAloneChange={handlePlayingAloneChange}
                    onFellowsChange={handleFellowsChange}
                    onDeviceChange={handleDeviceChange}
                    onPlayerChange={handlePlayerChange}
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

export default AdminCalendar;

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
