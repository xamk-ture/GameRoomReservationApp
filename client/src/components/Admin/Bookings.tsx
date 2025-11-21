import { useEffect, useState, useMemo } from "react";
import { api, DeviceDto, RoomBookingDto, PlayerDto, BookingStatus } from "../../api/api";
import { useTranslation } from "react-i18next";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Checkbox, Paper, Snackbar, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, Select, MenuItem, FormControl, InputLabel, Alert, Card, CardContent, useTheme, useMediaQuery, Chip } from "@mui/material";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

type SortOrder = "newest" | "oldest" | "next" | "previous";

interface DeviceAvailability {
  deviceId: number;
  deviceName: string;
  totalQuantity: number;
  availableQuantity: number;
  nextAvailableTime?: string; // ISO string of when the device becomes available next
}

const AdminBookings = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [bookings, setBookings] = useState<RoomBookingDto[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoomBookingDto | null>(null);
  const [form, setForm] = useState<{ bookingDateTime?: string; duration?: number; isPlayingAlone: boolean; fellows: number; deviceId?: number; playerId?: number }>({ bookingDateTime: "", duration: 1, isPlayingAlone: true, fellows: 0 });
  const [snack, setSnack] = useState<string | null>(null);
  const [devices, setDevices] = useState<DeviceDto[]>([]);
  const [players, setPlayers] = useState<PlayerDto[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [playerFilter, setPlayerFilter] = useState<string>("");
  const [timeFilter, setTimeFilter] = useState<"all" | "upcoming" | "past">("all");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<RoomBookingDto | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const load = async () => {
    const list = await api.RoomBookingsService.getAllBookings();
    setBookings(list || []);
  };

  useEffect(() => {
    load();
    api.DevicesService.getAllDevices().then((devicesList) => setDevices(devicesList || []));
    api.PlayersService.getAllPlayers().then((playersList) => setPlayers(playersList || []));
  }, []);

  // Calculate device availability based on bookings
  const availabilityMap = useMemo(() => {
    const map = new Map<number, DeviceAvailability>();

    if (!open || !form.bookingDateTime || !form.duration) {
      return map;
    }

    // Normalize the selected time for consistent comparison
    // form.bookingDateTime is a string from datetime-local input (local time)
    const startTime = dayjs(form.bookingDateTime);
    const endTime = startTime.add(form.duration, 'hour');

    // Filter out cancelled bookings and the current booking being edited (if editing)
    const activeBookings = bookings.filter(
      bookingItem => {
        if (bookingItem.status === BookingStatus.CANCELLED || !bookingItem.bookingDateTime) return false;
        // Exclude the current booking from availability check if we're editing it
        if (editing && bookingItem.id === editing.id) {
          return false;
        }
        return true;
      }
    );

    // Calculate availability for each device
    devices.forEach(device => {
      if (!device.id) return;

      const totalQuantity = device.quantity ?? 0;

      // Count how many of this device are booked during the requested time
      let bookedCount = 0;
      activeBookings.forEach(booking => {
        if (!booking.bookingDateTime) return;

        // Normalize booking time - server returns ISO strings
        const bookingStart = dayjs(booking.bookingDateTime);
        const bookingEnd = bookingStart.add(booking.duration ?? 0, 'hour');

        // Check if booking overlaps with requested time
        // Overlap: bookingStart < endTime AND bookingEnd > startTime
        const overlaps = bookingStart.isBefore(endTime) && bookingEnd.isAfter(startTime);

        if (overlaps && booking.devices) {
          // Check if this booking uses the device
          const usesDevice = booking.devices.some(d => d.id === device.id);
          if (usesDevice) {
            bookedCount++;
          }
        }
      });

      const availableQuantity = Math.max(0, totalQuantity - bookedCount);

      // If device is fully booked, find when it becomes available next
      let nextAvailableTime: string | undefined;
      if (availableQuantity === 0) {
        // Find all bookings that use this device and overlap with requested time
        const overlappingBookings = activeBookings
          .filter(bookingItem => {
            if (!bookingItem.bookingDateTime) return false;
            const bookingStart = dayjs(bookingItem.bookingDateTime);
            const bookingEnd = bookingStart.add(bookingItem.duration ?? 0, 'hour');
            const overlaps = bookingStart.isBefore(endTime) && bookingEnd.isAfter(startTime);
            return overlaps && bookingItem.devices?.some(deviceInBooking => deviceInBooking.id === device.id);
          })
          .map(bookingItem => {
            const bookingStart = dayjs(bookingItem.bookingDateTime);
            return bookingStart.add(bookingItem.duration ?? 0, 'hour');
          });

        // Find the earliest end time (when device becomes available)
        if (overlappingBookings.length > 0) {
          const earliestEnd = overlappingBookings.reduce((earliest, current) =>
            current.isBefore(earliest) ? current : earliest
          );
          nextAvailableTime = earliestEnd.toISOString();
        }
      }

      map.set(device.id, {
        deviceId: device.id,
        deviceName: device.name ?? `Device ${device.id}`,
        totalQuantity: totalQuantity,
        availableQuantity: availableQuantity,
        nextAvailableTime
      });
    });

    return map;
  }, [devices, bookings, form.bookingDateTime, form.duration, editing, open]);

  // Check if a device is fully booked
  const isDeviceFullyBooked = (deviceId: number): boolean => {
    const availability = availabilityMap.get(deviceId);
    return availability ? availability.availableQuantity === 0 : false;
  };

  const handleDelete = (booking: RoomBookingDto) => {
    setBookingToDelete(booking);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!bookingToDelete?.id) return;
    try {
      await api.RoomBookingsService.deleteBooking(bookingToDelete.id);
      setDeleteConfirmOpen(false);
      setBookingToDelete(null);
      await load();
      setSnack(t("admin.bookings.bookingDeleted") || "Booking deleted successfully");
    } catch (error) {
      console.error("Error deleting booking:", error);
      setErrorMsg(t("errors.bookingDeleteFailed") || "Failed to delete booking");
    }
  };

  const handleBulkDelete = () => {
    setBulkDeleteConfirmOpen(true);
  };

  const confirmBulkDelete = async () => {
    try {
      for (const id of selected) {
        await api.RoomBookingsService.deleteBooking(id);
      }
      setSelected([]);
      setBulkDeleteConfirmOpen(false);
      await load();
      setSnack(t("admin.bookings.deletedSelected"));
    } catch (error) {
      console.error("Error deleting bookings:", error);
      setErrorMsg(t("errors.bookingDeleteFailed") || "Failed to delete bookings");
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      bookingDateTime: "",
      duration: 1,
      isPlayingAlone: true,
      fellows: 0,
      deviceId: undefined,
      playerId: undefined
    });
    setOpen(true);
  };
  const openEdit = (booking: RoomBookingDto) => {
    // Check if booking is ongoing (has started but not ended)
    const now = dayjs();
    const bookingStart = dayjs(booking.bookingDateTime as any);
    const bookingEnd = bookingStart.add(booking.duration || 0, 'hour');
    
    // If booking has started but not ended, it's ongoing
    if (bookingStart.isBefore(now) && bookingEnd.isAfter(now)) {
      setSnack(t("admin.bookings.cannotEditOngoing"));
      return;
    }
    
    setEditing(booking);
    const deviceId = (booking.devices || [])[0]?.id;
    setForm({
      bookingDateTime: booking.bookingDateTime as any,
      duration: booking.duration,
      isPlayingAlone: booking.isPlayingAlone ?? true,
      // When not playing alone, default to 1 if fellows is 0 or undefined
      fellows: booking.isPlayingAlone ? (booking.fellows ?? 0) : (booking.fellows ?? 1),
      deviceId: deviceId,
      playerId: (booking as any).playerId,
    });
    setOpen(true);
  };
  const closeDialog = () => setOpen(false);

  const validate = () => {
    if (!form.bookingDateTime || !form.duration) return false;
    if (!form.deviceId || form.deviceId <= 0) return false;
    if (!editing && (!form.playerId || form.playerId <= 0)) return false; // PlayerId required only for new bookings
    const start = dayjs(form.bookingDateTime);
    if (!start.isValid() || start.isBefore(dayjs())) return false;
    const hour = start.hour();
    if (hour < 8 || hour >= 20) return false;
    if (form.duration <= 0 || form.duration > 2) return false;
    // Check fellows: if playing alone, fellows must be 0. If not, fellows must be >= 1
    const isPlayingAlone = form.isPlayingAlone ?? true;
    const fellows = form.fellows ?? 0;
    if (isPlayingAlone && fellows !== 0) return false;
    if (!isPlayingAlone && fellows < 1) return false;
    return true;
  };

  const submit = async () => {
    if (!validate()) { setSnack(t("admin.bookings.allFieldsRequired")); return; }
    // Now backend expects deviceIds only; keep lookup available if needed later
    // const byId = new Map<number, DeviceDto>();
    // devices.forEach(d => { if (d.id != null) byId.set(d.id, d); });
    try {
      setErrorMsg(null);
      const base = (api as any).BASE || "";
      const headers = { "Content-Type": "application/json" } as Record<string, string>;
      if (editing) {
        await fetch(`${base}/api/gameroombookings/booking/${editing.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            bookingDateTime: form.bookingDateTime,
            duration: Number(form.duration),
            isPlayingAlone: form.isPlayingAlone,
            fellows: form.fellows,
            deviceIds: (form.deviceId && form.deviceId > 0) ? [form.deviceId] : [],
            playerId: form.playerId,
          }),
        }).then(async (response) => { if (!response.ok) throw await response.json().catch(() => new Error(t("errors.badRequest"))); });
        setSnack(t("admin.bookings.bookingUpdated"));
      } else {
        const response = await fetch(`${base}/api/gameroombookings/bookgameroom`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            bookingDateTime: form.bookingDateTime,
            duration: Number(form.duration),
            fellows: form.fellows,
            isPlayingAlone: form.isPlayingAlone,
            deviceIds: (form.deviceId && form.deviceId > 0) ? [form.deviceId] : [],
            playerId: form.playerId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ Message: `HTTP ${response.status}: ${response.statusText}` }));
          throw new Error(errorData.Message || errorData.message || t("errors.badRequest"));
        }

        setSnack(t("admin.bookings.bookingCreated"));
      }
    } catch (e: any) {
      const msg = e?.Message || e?.message || e?.toString() || t("errors.badRequest");
      setErrorMsg(msg);
      console.error("Error creating/updating booking:", e);
      return;
    }
    setOpen(false);
    await load();
  };

  const formatEmailPrefix = (email?: string | null) => (email ? email.split("@")[0] : "");
  const formatTime = (dateTime: dayjs.Dayjs) => {
    const isEnglish = i18n.language === "en";
    return isEnglish ? dateTime.format("h:mm A") : dateTime.format("HH.mm");
  };
  const formatDateTime = (dateTime?: any) => {
    if (!dateTime) return "";
    try {
      const dateTimeObject = dayjs(dateTime);
      if (!dateTimeObject.isValid()) return "";
      return `${dateTimeObject.format("DD.MM.YYYY")} ${t("common.atTime", { time: formatTime(dateTimeObject) })}`;
    } catch { return ""; }
  };
  const endFrom = (start?: any, duration?: number) => {
    if (!start || !duration) return "";
    try {
      const startTime = dayjs(start);
      const endTime = startTime.add(duration, "hour");
      return `${endTime.format("DD.MM.YYYY")} ${t("common.atTime", { time: formatTime(endTime) })}`;
    } catch { return ""; }
  };

  const sortedBookings = useMemo(() => {
    const now = dayjs();
    const valid = bookings.filter(b => dayjs(b.bookingDateTime as any).isValid());
    const invalid = bookings.filter(b => !dayjs(b.bookingDateTime as any).isValid());

    if (sortOrder === "next") {
      const future = valid.filter(booking => dayjs(booking.bookingDateTime as any).isSame(now) || dayjs(booking.bookingDateTime as any).isAfter(now))
        .sort((bookingA, bookingB) => dayjs(bookingA.bookingDateTime as any).diff(dayjs(bookingB.bookingDateTime as any)));
      const past = valid.filter(booking => dayjs(booking.bookingDateTime as any).isBefore(now))
        .sort((bookingA, bookingB) => dayjs(bookingB.bookingDateTime as any).diff(dayjs(bookingA.bookingDateTime as any)));
      return [...future, ...past, ...invalid];
    }

    if (sortOrder === "previous") {
      // Tulevat varaukset kauimmat ensin (laskeva), sitten menneet
      const future = valid.filter(booking => dayjs(booking.bookingDateTime as any).isSame(now) || dayjs(booking.bookingDateTime as any).isAfter(now))
        .sort((bookingA, bookingB) => dayjs(bookingB.bookingDateTime as any).diff(dayjs(bookingA.bookingDateTime as any))); // Laskeva: kauimmat ensin
      const past = valid.filter(booking => dayjs(booking.bookingDateTime as any).isBefore(now))
        .sort((bookingA, bookingB) => dayjs(bookingB.bookingDateTime as any).diff(dayjs(bookingA.bookingDateTime as any)));
      return [...future, ...past, ...invalid];
    }

    const sorted = [...bookings];
    sorted.sort((bookingA, bookingB) => {
      const dateA = dayjs(bookingA.bookingDateTime as any);
      const dateB = dayjs(bookingB.bookingDateTime as any);
      if (!dateA.isValid() && !dateB.isValid()) return 0;
      if (!dateA.isValid()) return 1;
      if (!dateB.isValid()) return -1;
      if (sortOrder === "newest") {
        return dateB.diff(dateA);
      } else {
        return dateA.diff(dateB);
      }
    });
    return sorted;
  }, [bookings, sortOrder]);

  // Filter bookings by player email prefix and time
  const filteredBookings = useMemo(() => {
    let filtered = sortedBookings;
    
    // Filter by time (upcoming/past)
    if (timeFilter !== "all") {
      const now = dayjs();
      filtered = filtered.filter((booking: RoomBookingDto) => {
        const bookingStart = dayjs(booking.bookingDateTime as any);
        const bookingEnd = bookingStart.add(booking.duration || 0, 'hour');
        
        if (timeFilter === "upcoming") {
          // Show upcoming or ongoing bookings (not yet ended)
          return bookingEnd.isAfter(now);
        } else if (timeFilter === "past") {
          // Show past bookings (already ended)
          return bookingEnd.isBefore(now) || bookingEnd.isSame(now);
        }
        return true;
      });
    }
    
    // Filter by player email prefix
    if (playerFilter.trim()) {
      const filterLower = playerFilter.toLowerCase().trim();
      filtered = filtered.filter((booking: RoomBookingDto) => {
        const playerEmail = (booking as any).playerEmail || "";
        const emailPrefix = formatEmailPrefix(playerEmail).toLowerCase();
        return emailPrefix.includes(filterLower);
      });
    }
    
    return filtered;
  }, [sortedBookings, playerFilter, timeFilter]);

  const handleSelectAll = () => {
    if (selected.length === filteredBookings.length && filteredBookings.length > 0) {
      // If all are selected, deselect all
      setSelected([]);
    } else {
      // Select all filtered bookings
      const allIds = filteredBookings.map((booking: RoomBookingDto) => booking.id!).filter(Boolean);
      setSelected(allIds);
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">{t("admin.bookings.manageTitle")}</Typography>
      </Box>

      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            onClick={openCreate}
            startIcon={<span style={{ fontSize: "1.2em" }}>+</span>}
            sx={{
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
            {t("admin.bookings.add")}
          </Button>
          <Button variant="outlined" onClick={load}>
            {t("admin.bookings.update")}
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <TextField
            size="small"
            label={t("admin.bookings.searchByPlayer")}
            value={playerFilter}
            onChange={(e) => setPlayerFilter(e.target.value)}
            sx={{ minWidth: 200 }}
            placeholder={t("admin.bookings.playerEmailPrefix")}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>{t("admin.bookings.filterByTime")}</InputLabel>
            <Select
              value={timeFilter}
              label={t("admin.bookings.filterByTime")}
              onChange={(e) => setTimeFilter(e.target.value as "all" | "upcoming" | "past")}
            >
              <MenuItem value="all">{t("admin.bookings.allBookings")}</MenuItem>
              <MenuItem value="upcoming">{t("admin.bookings.upcomingAndOngoing")}</MenuItem>
              <MenuItem value="past">{t("admin.bookings.pastBookings")}</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>{t("admin.bookings.sortBy")}</InputLabel>
            <Select
              value={sortOrder}
              label={t("admin.bookings.sortBy")}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            >
              <MenuItem value="newest">{t("admin.bookings.newestFirst")}</MenuItem>
              <MenuItem value="oldest">{t("admin.bookings.oldestFirst")}</MenuItem>
              <MenuItem value="next">{t("admin.bookings.upcomingFirst")}</MenuItem>
              <MenuItem value="previous">{t("admin.bookings.oldestPastFirst")}</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" color="error" disabled={selected.length === 0} onClick={handleBulkDelete}>
            {t("common.deleteSelected")} ({selected.length})
          </Button>
        </Box>

        {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}

        {isMobile ? (
          // Mobile card view
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {filteredBookings.map((booking: RoomBookingDto) => {
              const isPast = dayjs(booking.bookingDateTime as any).add(booking.duration || 0, 'hour').isBefore(dayjs());
              const isCancelled = booking.status === BookingStatus.CANCELLED;

              return (
                <Card key={booking.id} sx={{ border: 1, borderColor: "divider", opacity: isCancelled ? 0.6 : 1, bgcolor: isPast ? "action.hover" : "inherit" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 2 }}>
                      <Checkbox 
                        checked={selected.includes(booking.id!)} 
                        onChange={(event) => setSelected((prev) => event.target.checked ? [...prev, booking.id!] : prev.filter(selectedId => selectedId !== booking.id))}
                        sx={{ mt: -1, ml: -1 }}
                      />
                      <Box sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {formatEmailPrefix((booking as any).playerEmail)}
                          </Typography>
                          {isCancelled && (
                            <Chip label="CANCELLED" color="error" size="small" />
                          )}
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          <strong>{t("admin.bookings.start")}:</strong> {formatDateTime(booking.bookingDateTime)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          <strong>{t("admin.bookings.end")}:</strong> {endFrom(booking.bookingDateTime as any, booking.duration)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          <strong>{t("admin.bookings.devices")}:</strong> {(booking.devices || []).map(d => d.name).join(", ") || "-"}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                          <Button 
                            size="small" 
                            variant="outlined" 
                            onClick={() => openEdit(booking)}
                            disabled={(() => {
                              const now = dayjs();
                              const bookingStart = dayjs(booking.bookingDateTime as any);
                              const bookingEnd = bookingStart.add(booking.duration || 0, 'hour');
                              return bookingStart.isBefore(now) && bookingEnd.isAfter(now);
                            })()}
                          >
                            {t("common.edit")}
                          </Button>
                          <Button size="small" color="error" variant="contained" onClick={() => handleDelete(booking)}>
                            {t("common.delete")}
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
            {filteredBookings.length === 0 && (
              <Box sx={{ py: 3, textAlign: "center" }}>
                <Typography color="text.secondary">{t("admin.bookings.noBookings")}</Typography>
              </Box>
            )}
          </Box>
        ) : (
          // Desktop table view
          <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead sx={{ bgcolor: "action.hover" }}>
                <TableRow>
                  <TableCell width={40}>
                    <Checkbox
                      checked={filteredBookings.length > 0 && selected.length === filteredBookings.length && filteredBookings.every((booking: RoomBookingDto) => selected.includes(booking.id!))}
                      indeterminate={selected.length > 0 && selected.length < filteredBookings.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell><strong>{t("admin.bookings.player")}</strong></TableCell>
                  <TableCell><strong>{t("admin.bookings.start")}</strong></TableCell>
                  <TableCell><strong>{t("admin.bookings.end")}</strong></TableCell>
                  <TableCell><strong>{t("admin.bookings.devices")}</strong></TableCell>
                  <TableCell align="right"><strong>{t("common.actions")}</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredBookings.map((booking: RoomBookingDto) => {
                  const isPast = dayjs(booking.bookingDateTime as any).add(booking.duration || 0, 'hour').isBefore(dayjs());
                  const isCancelled = booking.status === BookingStatus.CANCELLED;

                  return (
                    <TableRow key={booking.id} hover sx={{ opacity: isCancelled ? 0.6 : 1, bgcolor: isPast ? "action.hover" : "inherit" }}>
                      <TableCell>
                        <Checkbox
                          checked={selected.includes(booking.id!)}
                          onChange={(event) => setSelected((prev) => event.target.checked ? [...prev, booking.id!] : prev.filter(selectedId => selectedId !== booking.id))}
                        />
                      </TableCell>
                      <TableCell>
                        {formatEmailPrefix((booking as any).playerEmail)}
                        {isCancelled && <Box component="span" sx={{ ml: 1, px: 0.5, py: 0, bgcolor: "error.light", color: "error.contrastText", borderRadius: 0.5, fontSize: "0.7rem" }}>CANCELLED</Box>}
                      </TableCell>
                      <TableCell>{formatDateTime(booking.bookingDateTime)}</TableCell>
                      <TableCell>{endFrom(booking.bookingDateTime as any, booking.duration)}</TableCell>
                      <TableCell>
                        {(booking.devices || []).map(d => d.name).join(", ") || "-"}
                      </TableCell>
                      <TableCell align="right">
                        <Button 
                          size="small" 
                          sx={{ mr: 1 }} 
                          variant="outlined" 
                          onClick={() => openEdit(booking)}
                          disabled={(() => {
                            const now = dayjs();
                            const bookingStart = dayjs(booking.bookingDateTime as any);
                            const bookingEnd = bookingStart.add(booking.duration || 0, 'hour');
                            return bookingStart.isBefore(now) && bookingEnd.isAfter(now);
                          })()}
                        >
                          {t("common.edit")}
                        </Button>
                        <Button size="small" color="error" variant="contained" onClick={() => handleDelete(booking)}>{t("common.delete")}</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredBookings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      <Typography color="text.secondary">{t("admin.bookings.noBookings")}</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? t("admin.bookings.edit") : t("admin.bookings.add")}</DialogTitle>
        <DialogContent>
          {!editing && (
            <FormControl fullWidth margin="dense">
              <InputLabel>{t("admin.bookings.player")}</InputLabel>
              <Select
                value={form.playerId || ""}
                label={t("admin.bookings.player")}
                onChange={(e) => setForm({ ...form, playerId: Number(e.target.value) })}
              >
                {players.map((player) => (
                  <MenuItem key={player.id} value={player.id}>
                    {player.email ? player.email.split("@")[0] : `Player ${player.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <TextField fullWidth margin="dense" type="datetime-local" label={t("admin.bookings.start")} value={(form.bookingDateTime as any) || ""} onChange={(e) => setForm({ ...form, bookingDateTime: e.target.value as any })} InputLabelProps={{ shrink: true }} />
          <FormControl fullWidth margin="dense">
            <InputLabel>{t("admin.bookings.durationHours")}</InputLabel>
            <Select
              value={form.duration || 1}
              label={t("admin.bookings.durationHours")}
              onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
            >
              <MenuItem value={0.5}>0.5</MenuItem>
              <MenuItem value={1}>{t("admin.bookings.duration1Hour")}</MenuItem>
              <MenuItem value={1.5}>1.5</MenuItem>
              <MenuItem value={2}>{t("admin.bookings.duration2Hours")}</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel control={<Checkbox checked={form.isPlayingAlone} onChange={(e) => setForm({ ...form, isPlayingAlone: e.target.checked, fellows: e.target.checked ? 0 : (form.fellows ?? 1) })} />} label={t("admin.bookings.playingAlone")} />
          <TextField fullWidth margin="dense" type="number" label={t("admin.bookings.fellows")} value={form.fellows ?? (form.isPlayingAlone ? 0 : 1)} onChange={(e) => setForm({ ...form, fellows: Number(e.target.value) })} disabled={form.isPlayingAlone} inputProps={{ min: 1 }} />
          <FormControl fullWidth margin="dense">
            <InputLabel>{t("admin.bookings.devices")}</InputLabel>
            <Select
              value={form.deviceId || ""}
              label={t("admin.bookings.devices")}
              onChange={(e) => setForm({ ...form, deviceId: Number(e.target.value) })}
            >
              {devices.map((device) => {
                const availability = availabilityMap.get(device.id!);
                const fullyBooked = isDeviceFullyBooked(device.id!);
                // Show availability if we have fetched data (even if empty, we know API call completed)
                // OR if we're still fetching (show loading)
                const hasValidDateTime = form.bookingDateTime && form.duration;
                const showAvailability = hasValidDateTime && availability !== undefined;

                return (
                  <MenuItem key={device.id} value={device.id} title={device.description || ""} disabled={fullyBooked}>
                    <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>{device.name || `#${device.id}`}</span>
                        {showAvailability && (
                          <Typography
                            variant="caption"
                            sx={{
                              ml: 1,
                              color: availability
                                ? (fullyBooked ? "error.main" : availability.availableQuantity > 0 ? "success.main" : "warning.main")
                                : "text.secondary",
                              fontWeight: "medium"
                            }}
                          >
                            {availability
                              ? (fullyBooked && availability.nextAvailableTime
                                ? t("bookings.deviceNextAvailable", {
                                  time: dayjs(availability.nextAvailableTime).format(i18n.language === "en" ? "h:mm A" : "HH.mm"),
                                  date: dayjs(availability.nextAvailableTime).format("DD.MM.YYYY")
                                })
                                : t("bookings.deviceAvailable", { available: availability.availableQuantity, total: availability.totalQuantity }))
                              : `${device.quantity ?? 0}/${device.quantity ?? 0}`}
                          </Typography>
                        )}
                      </Box>
                      {device.description && (
                        <Typography variant="caption" color="text.secondary">
                          {device.description}
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            onClick={submit}
            sx={{
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
            {editing ? t("common.save") : t("common.create")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkDeleteConfirmOpen} onClose={() => setBulkDeleteConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t("common.confirmDeletion")}</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {t("admin.bookings.confirmDeleteBody", { count: selected.length })}
          </Typography>
          {selected.length > 0 && (
            <Box sx={{ mt: 2, maxHeight: 200, overflow: "auto", border: '1px solid #ccc', p: 1, borderRadius: 1 }}>
              {filteredBookings
                .filter((booking: RoomBookingDto) => selected.includes(booking.id!))
                .map((booking: RoomBookingDto) => (
                  <Typography key={booking.id} variant="body2" color="text.secondary" sx={{ py: 0.5 }}>
                    • {formatEmailPrefix((booking as any).playerEmail)} - {formatDateTime(booking.bookingDateTime)}
                  </Typography>
                ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteConfirmOpen(false)}>{t("common.cancel")}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmBulkDelete}
          >
            {t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => { setDeleteConfirmOpen(false); setBookingToDelete(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>{t("common.confirmDeletion")}</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {t("bookings.confirmDelete")}
          </Typography>
          {bookingToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <strong>{t("admin.bookings.player")}:</strong> {formatEmailPrefix((bookingToDelete as any).playerEmail)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <strong>{t("admin.bookings.start")}:</strong> {formatDateTime(bookingToDelete.bookingDateTime)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>{t("admin.bookings.devices")}:</strong> {(bookingToDelete.devices || []).map(d => d.name).join(", ") || "-"}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteConfirmOpen(false); setBookingToDelete(null); }}>{t("common.cancel")}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDelete}
          >
            {t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkDeleteConfirmOpen} onClose={() => setBulkDeleteConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t("common.confirmDeletion")}</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {t("admin.bookings.confirmDeleteBody", { count: selected.length })}
          </Typography>
          {selected.length > 0 && (
            <Box sx={{ mt: 2, maxHeight: 200, overflow: "auto", border: '1px solid #ccc', p: 1, borderRadius: 1 }}>
              {filteredBookings
                .filter((booking: RoomBookingDto) => selected.includes(booking.id!))
                .map((booking: RoomBookingDto) => (
                  <Typography key={booking.id} variant="body2" color="text.secondary" sx={{ py: 0.5 }}>
                    • {formatEmailPrefix((booking as any).playerEmail)} - {formatDateTime(booking.bookingDateTime)}
                  </Typography>
                ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteConfirmOpen(false)}>{t("common.cancel")}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmBulkDelete}
          >
            {t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => { setDeleteConfirmOpen(false); setBookingToDelete(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>{t("common.confirmDeletion")}</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {t("bookings.confirmDelete")}
          </Typography>
          {bookingToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <strong>{t("admin.bookings.player")}:</strong> {formatEmailPrefix((bookingToDelete as any).playerEmail)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <strong>{t("admin.bookings.start")}:</strong> {formatDateTime(bookingToDelete.bookingDateTime)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>{t("admin.bookings.devices")}:</strong> {(bookingToDelete.devices || []).map(d => d.name).join(", ") || "-"}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteConfirmOpen(false); setBookingToDelete(null); }}>{t("common.cancel")}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDelete}
          >
            {t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snack}
        message={snack || ""}
        autoHideDuration={2000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </Box>
  );
};

export default AdminBookings;


