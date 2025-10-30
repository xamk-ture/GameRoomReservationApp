import { useEffect, useState } from "react";
import { api, DeviceDto } from "../../api/api";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Checkbox, Paper, Snackbar, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

const AdminDevices = () => {
  const [devices, setDevices] = useState<DeviceDto[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DeviceDto | null>(null);
  const [form, setForm] = useState<{ name: string; description?: string; quantity?: number; available: boolean }>({ name: "", description: "", quantity: 1, available: true });
  const [snack, setSnack] = useState<string | null>(null);
  const { t } = useTranslation();

  const load = async () => {
    const list = await api.DevicesService.getAllDevices();
    setDevices(list || []);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id?: number) => {
    if (!id) return;
    await api.DevicesService.deleteDevice(id);
    await load();
  };

  const handleBulkDelete = async () => {
    for (const id of selected) {
      await api.DevicesService.deleteDevice(id);
    }
    setSelected([]);
    await load();
    setSnack("Deleted selected devices");
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "", quantity: 1, available: true });
    setOpen(true);
  };
  const openEdit = (d: DeviceDto) => {
    setEditing(d);
    const isAvailable = (d.status as any) === "Available";
    setForm({ name: d.name!, description: d.description!, quantity: d.quantity!, available: isAvailable });
    setOpen(true);
  };
  const closeDialog = () => setOpen(false);

  const validate = () => (form.name || "").trim().length >= 2;

  const submit = async () => {
    if (!validate()) {
      setSnack("Name is required (min 2 chars)");
      return;
    }
    if (editing) {
      await api.DevicesService.updateDevice(editing.id!, {
        id: editing.id,
        name: form.name,
        description: form.description,
        quantity: form.quantity,
        status: (form.available ? "Available" : "Unavailable") as any,
      });
      setSnack("Device updated");
    } else {
      await api.DevicesService.addDevice({
        name: form.name,
        description: form.description,
        quantity: form.quantity,
        status: (form.available ? "Available" : "Unavailable") as any,
      });
      setSnack("Device created");
    }
    setOpen(false);
    await load();
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Manage Devices</Typography>
      <Button variant="contained" sx={{ mb: 2, mr: 1 }} onClick={openCreate}>{t("admin.devices.add")}</Button>
      <Button variant="outlined" color="error" sx={{ mb: 2 }} disabled={selected.length === 0} onClick={handleBulkDelete}>{t("common.deleteSelected")}</Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={24} />
              <TableCell>{t("common.id")}</TableCell>
              <TableCell>{t("admin.devices.name")}</TableCell>
              <TableCell>{t("admin.devices.status")}</TableCell>
              <TableCell align="right">{t("common.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {devices.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <Checkbox checked={selected.includes(d.id!)} onChange={(e) => {
                    setSelected((prev) => e.target.checked ? [...prev, d.id!] : prev.filter(x => x !== d.id));
                  }} />
                </TableCell>
                <TableCell>{d.id}</TableCell>
                <TableCell>{d.name}</TableCell>
                <TableCell>{(d.status as any) === "Available" ? "Available" : "Unavailable"}</TableCell>
                <TableCell align="right">
                  <Button sx={{ mr: 1 }} variant="text" onClick={() => openEdit(d)}>{t("common.edit")}</Button>
                  <Button color="error" variant="outlined" onClick={() => handleDelete(d.id!)}>{t("common.delete")}</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? t("admin.devices.edit") : t("admin.devices.add")}</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" label={t("admin.devices.name")} value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField fullWidth margin="dense" label={t("admin.devices.description")} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <TextField fullWidth margin="dense" type="number" label={t("admin.devices.quantity")} value={form.quantity || 0} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
          <FormControlLabel control={<Checkbox checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} />} label={t("admin.devices.available")} />
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

export default AdminDevices;


