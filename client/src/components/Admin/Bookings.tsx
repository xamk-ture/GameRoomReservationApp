import { useEffect, useState, useMemo } from "react";
import { api, DeviceDto, RoomBookingDto } from "../../api/api";
import { OpenAPI } from "../../api/core/OpenAPI";
import { useTranslation } from "react-i18next";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Checkbox, Paper, Snackbar, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, Select, MenuItem, FormControl, InputLabel } from "@mui/material";
import dayjs from "dayjs";

type SortOrder = "newest" | "oldest";

const AdminBookings = () => {
  const [bookings, setBookings] = useState<RoomBookingDto[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoomBookingDto | null>(null);
  const [form, setForm] = useState<{ bookingDateTime?: string; duration?: number; isPlayingAlone: boolean; fellows: number; deviceIds: number[] }>({ bookingDateTime: "", duration: 1, isPlayingAlone: true, fellows: 0, deviceIds: [] });
  const [snack, setSnack] = useState<string | null>(null);
  const [devices, setDevices] = useState<DeviceDto[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const { t } = useTranslation();

  const load = async () => {
    const list = await api.RoomBookingsService.getAllBookings();
    setBookings(list || []);
  };

  useEffect(() => {
    load();
    api.DevicesService.getAllDevices().then((d) => setDevices(d || []));
  }, []);

  const handleDelete = async (id?: number) => {
    if (!id) return;
    await api.RoomBookingsService.deleteBooking(id);
    await load();
  };

  const handleBulkDelete = async () => {
    for (const id of selected) await api.RoomBookingsService.deleteBooking(id);
    setSelected([]);
    await load();
    setSnack("Deleted selected bookings");
  };

  const openCreate = () => { setEditing(null); setForm({ bookingDateTime: "", duration: 1, isPlayingAlone: true, fellows: 0, deviceIds: [] }); setOpen(true); };
  const openEdit = (b: RoomBookingDto) => {
    setEditing(b);
    setForm({
      bookingDateTime: b.bookingDateTime as any,
      duration: b.duration,
      isPlayingAlone: b.isPlayingAlone ?? true,
      fellows: b.fellows ?? 0,
      deviceIds: (b.devices || []).map((d) => d.id!).filter(Boolean) as number[],
    });
    setOpen(true);
  };
  const closeDialog = () => setOpen(false);

  const validate = () => {
    if (!form.bookingDateTime || !form.duration) return false;
    const start = dayjs(form.bookingDateTime);
    if (!start.isValid() || start.isBefore(dayjs())) return false;
    const hour = start.hour();
    if (hour < 8 || hour >= 20) return false;
    if (form.duration <= 0 || form.duration > 2) return false;
    if (form.isPlayingAlone && form.fellows !== 0) return false;
    if (!form.isPlayingAlone && form.fellows <= 0) return false;
    return true;
  };

  const submit = async () => {
    if (!validate()) { setSnack("All fields are required"); return; }
    // Now backend expects deviceIds only; keep lookup available if needed later
    // const byId = new Map<number, DeviceDto>();
    // devices.forEach(d => { if (d.id != null) byId.set(d.id, d); });
    try {
      setErrorMsg(null);
      const base = (OpenAPI as any).BASE || "";
      const headers = { ...(OpenAPI as any).HEADERS, "Content-Type": "application/json" } as Record<string, string>;
      if (editing) {
        await fetch(`${base}/api/gameroombookings/booking/${editing.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            bookingDateTime: form.bookingDateTime,
            duration: Number(form.duration),
            isPlayingAlone: form.isPlayingAlone,
            fellows: form.fellows,
            deviceIds: form.deviceIds,
          }),
        }).then(async (r) => { if (!r.ok) throw await r.json().catch(() => new Error("Bad Request")); });
        setSnack("Booking updated");
      } else {
        await fetch(`${base}/api/gameroombookings/bookgameroom`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            bookingDateTime: form.bookingDateTime,
            duration: Number(form.duration),
            fellows: form.fellows,
            isPlayingAlone: form.isPlayingAlone,
            deviceIds: form.deviceIds,
          }),
        }).then(async (r) => { if (!r.ok) throw await r.json().catch(() => new Error("Bad Request")); });
        setSnack("Booking created");
      }
    } catch (e: any) {
      const msg = e?.Message || e?.message || "Bad Request";
      setErrorMsg(msg);
      return;
    }
    setOpen(false);
    await load();
  };

  const formatEmailPrefix = (email?: string | null) => (email ? email.split("@")[0] : "");
  const endFrom = (start?: any, duration?: number) => {
    if (!start || !duration) return "";
    try {
      const s = dayjs(start);
      return s.add(duration, "hour").format("DD-MM-YYYY HH:mm");
    } catch { return ""; }
  };

  const sortedBookings = useMemo(() => {
    const sorted = [...bookings];
    sorted.sort((a, b) => {
      const dateA = dayjs(a.bookingDateTime as any);
      const dateB = dayjs(b.bookingDateTime as any);
      
      if (!dateA.isValid() && !dateB.isValid()) return 0;
      if (!dateA.isValid()) return 1;
      if (!dateB.isValid()) return -1;
      
      if (sortOrder === "newest") {
        return dateB.diff(dateA); // Uusimmat ensin
      } else {
        return dateA.diff(dateB); // Vanhimmat ensin
      }
    });
    return sorted;
  }, [bookings, sortOrder]);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>{t("admin.bookings.manageTitle")}</Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <Button variant="contained" onClick={openCreate}>{t("admin.bookings.add")}</Button>
        <Button variant="outlined" color="error" disabled={selected.length === 0} onClick={handleBulkDelete}>{t("common.deleteSelected")}</Button>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>{t("admin.bookings.sortBy")}</InputLabel>
          <Select
            value={sortOrder}
            label={t("admin.bookings.sortBy")}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
          >
            <MenuItem value="newest">{t("admin.bookings.newestFirst")}</MenuItem>
            <MenuItem value="oldest">{t("admin.bookings.oldestFirst")}</MenuItem>
          </Select>
        </FormControl>
      </Box>
      {errorMsg && <Typography color="error" sx={{ mb: 1 }}>{errorMsg}</Typography>}
      <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell width={24} />
              <TableCell>{t("common.id")}</TableCell>
              <TableCell>{t("admin.bookings.player")}</TableCell>
              <TableCell>{t("admin.bookings.start")}</TableCell>
              <TableCell>{t("admin.bookings.end")}</TableCell>
              <TableCell align="right">{t("common.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedBookings.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <input type="checkbox" checked={selected.includes(b.id!)} onChange={(e) => setSelected((prev) => e.target.checked ? [...prev, b.id!] : prev.filter(x => x !== b.id))} />
                </TableCell>
                <TableCell>{b.id}</TableCell>
                <TableCell>{formatEmailPrefix((b as any).playerEmail)}</TableCell>
                <TableCell>{b.bookingDateTime ? dayjs(b.bookingDateTime as any).format("DD-MM-YYYY HH:mm") : ""}</TableCell>
                <TableCell>{endFrom(b.bookingDateTime as any, b.duration)}</TableCell>
                <TableCell align="right">
                  <Button sx={{ mr: 1 }} variant="text" onClick={() => openEdit(b)}>{t("common.edit")}</Button>
                  <Button color="error" variant="outlined" onClick={() => handleDelete(b.id!)}>{t("common.delete")}</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? t("admin.bookings.edit") : t("admin.bookings.add")}</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" type="datetime-local" label={t("admin.bookings.start")} value={(form.bookingDateTime as any) || ""} onChange={(e) => setForm({ ...form, bookingDateTime: e.target.value as any })} InputLabelProps={{ shrink: true }} />
          <FormControl fullWidth margin="dense">
            <InputLabel>{t("admin.bookings.durationHours")}</InputLabel>
            <Select
              value={form.duration || 1}
              label={t("admin.bookings.durationHours")}
              onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
            >
              <MenuItem value={1}>{t("admin.bookings.duration1Hour")}</MenuItem>
              <MenuItem value={2}>{t("admin.bookings.duration2Hours")}</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel control={<Checkbox checked={form.isPlayingAlone} onChange={(e) => setForm({ ...form, isPlayingAlone: e.target.checked, fellows: e.target.checked ? 0 : form.fellows })} />} label={t("admin.bookings.playingAlone")} />
          <TextField fullWidth margin="dense" type="number" label={t("admin.bookings.fellows")} value={form.fellows} onChange={(e) => setForm({ ...form, fellows: Number(e.target.value) })} disabled={form.isPlayingAlone} />
          <Typography sx={{ mt: 2, mb: 1 }}>{t("admin.bookings.devices")}</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {devices.map((d) => (
              <FormControlLabel key={d.id} control={<Checkbox checked={form.deviceIds.includes(d.id!)} onChange={(e) => setForm({ ...form, deviceIds: e.target.checked ? [...form.deviceIds, d.id!] : form.deviceIds.filter((x) => x !== d.id) })} />} label={d.name || `#${d.id}`} />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={submit}>{editing ? t("common.save") : t("common.create")}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} message={snack || ""} autoHideDuration={2000} onClose={() => setSnack(null)} />
    </Box>
  );
};

export default AdminBookings;


