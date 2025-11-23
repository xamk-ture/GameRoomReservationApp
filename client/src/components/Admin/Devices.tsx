import { useEffect, useState } from "react";
import { api, DeviceDto } from "../../api/api";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Checkbox, Paper, Snackbar, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, Card, CardContent, useTheme, useMediaQuery, Chip } from "@mui/material";
import { useTranslation } from "react-i18next";

const AdminDevices = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [devices, setDevices] = useState<DeviceDto[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DeviceDto | null>(null);
  const [form, setForm] = useState<{ name: string; description?: string; quantity?: number; available: boolean }>({ name: "", description: "", quantity: 1, available: true });
  const [snack, setSnack] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<DeviceDto | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const { t } = useTranslation();

  const load = async () => {
    const list = await api.DevicesService.getAllDevices();
    setDevices(list || []);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = (device: DeviceDto) => {
    setDeviceToDelete(device);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deviceToDelete?.id) return;
    try {
      await api.DevicesService.deleteDevice(deviceToDelete.id);
      setDeleteConfirmOpen(false);
      setDeviceToDelete(null);
      await load();
      setSnack(t("admin.devices.deviceDeleted") || "Device deleted successfully");
    } catch (error) {
      console.error("Error deleting device:", error);
      setSnack(t("errors.deleteFailed") || "Failed to delete device");
    }
  };

  const handleBulkDelete = () => {
    setBulkDeleteConfirmOpen(true);
  };

  const confirmBulkDelete = async () => {
    try {
      for (const id of selected) {
        await api.DevicesService.deleteDevice(id);
      }
      setSelected([]);
      setBulkDeleteConfirmOpen(false);
      await load();
      setSnack(t("admin.devices.deletedSelected"));
    } catch (error) {
      console.error("Error deleting devices:", error);
      setSnack(t("errors.deleteFailed") || "Failed to delete devices");
    }
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
      setSnack(t("admin.devices.nameRequired"));
      return;
    }
    if (editing) {
      await api.DevicesService.updateDevice(editing.id!, {
        id: editing.id,
        name: form.name,
        description: form.description,
        quantity: form.quantity,
        status: (form.available ? "Available" : "Maintenance") as any,
      });
      setSnack(t("admin.devices.deviceUpdated"));
    } else {
      await api.DevicesService.addDevice({
        name: form.name,
        description: form.description,
        quantity: form.quantity,
        status: (form.available ? "Available" : "Maintenance") as any,
      });
      setSnack(t("admin.devices.deviceCreated"));
    }
    setOpen(false);
    await load();
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">{t("admin.devices.manageTitle")}</Typography>
      </Box>

      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
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
            {t("admin.devices.add")}
          </Button>
          <Button variant="outlined" color="error" disabled={selected.length === 0} onClick={handleBulkDelete}>
            {t("common.deleteSelected")} ({selected.length})
          </Button>
        </Box>

        {isMobile ? (
          // Mobile card view
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {devices.map((d) => {
              const isAvailable = (d.status as any) === "Available";
              return (
                <Card key={d.id} sx={{ border: 1, borderColor: "divider" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 2 }}>
                      <Checkbox 
                        checked={selected.includes(d.id!)} 
                        onChange={(e) => {
                          setSelected((prev) => e.target.checked ? [...prev, d.id!] : prev.filter(x => x !== d.id));
                        }}
                        sx={{ mt: -1, ml: -1 }}
                      />
                      <Box sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {d.name}
                          </Typography>
                          <Chip
                            label={isAvailable ? t("admin.devices.statusAvailable") : t("admin.devices.statusUnavailable")}
                            color={isAvailable ? "success" : "error"}
                            size="small"
                          />
                        </Box>
                        {d.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {d.description}
                          </Typography>
                        )}
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          <strong>{t("admin.devices.quantity")}:</strong> {d.quantity ?? 0}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                          <Button size="small" variant="outlined" onClick={() => openEdit(d)}>
                            {t("common.edit")}
                          </Button>
                          <Button size="small" color="error" variant="outlined" onClick={() => handleDelete(d)}>
                            {t("common.delete")}
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
            {devices.length === 0 && (
              <Box sx={{ py: 3, textAlign: "center" }}>
                <Typography color="text.secondary">{t("admin.devices.noDevices")}</Typography>
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
                      checked={devices.length > 0 && selected.length === devices.length}
                      indeterminate={selected.length > 0 && selected.length < devices.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelected(devices.map(d => d.id!));
                        } else {
                          setSelected([]);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell><strong>{t("admin.devices.name")}</strong></TableCell>
                  <TableCell><strong>{t("admin.devices.description")}</strong></TableCell>
                  <TableCell><strong>{t("admin.devices.quantity")}</strong></TableCell>
                  <TableCell><strong>{t("admin.devices.status")}</strong></TableCell>
                  <TableCell align="right"><strong>{t("common.actions")}</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {devices.map((d) => {
                  const isAvailable = (d.status as any) === "Available";
                  return (
                    <TableRow key={d.id} hover>
                      <TableCell>
                        <Checkbox checked={selected.includes(d.id!)} onChange={(e) => {
                          setSelected((prev) => e.target.checked ? [...prev, d.id!] : prev.filter(x => x !== d.id));
                        }} />
                      </TableCell>
                      <TableCell>{d.name}</TableCell>
                      <TableCell>{d.description || ""}</TableCell>
                      <TableCell>{d.quantity ?? 0}</TableCell>
                      <TableCell>
                        <Box
                          component="span"
                          sx={{
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            bgcolor: isAvailable ? "success.light" : "error.light",
                            color: isAvailable ? "success.contrastText" : "error.contrastText",
                            fontSize: "0.875rem",
                            fontWeight: "medium"
                          }}
                        >
                          {isAvailable ? t("admin.devices.statusAvailable") : t("admin.devices.statusUnavailable")}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", flexWrap: "wrap" }}>
                          <Button size="small" variant="outlined" onClick={() => openEdit(d)}>{t("common.edit")}</Button>
                          <Button size="small" color="error" variant="outlined" onClick={() => handleDelete(d)}>{t("common.delete")}</Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {devices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                      <Typography color="text.secondary">{t("admin.devices.noDevices")}</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

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
            {t("admin.devices.confirmDeleteBody", { count: selected.length })}
          </Typography>
          {selected.length > 0 && (
            <Box sx={{ mt: 2, maxHeight: 200, overflow: "auto", border: '1px solid #ccc', p: 1, borderRadius: 1 }}>
              {devices
                .filter((device) => selected.includes(device.id!))
                .map((device) => (
                  <Typography key={device.id} variant="body2" color="text.secondary" sx={{ py: 0.5 }}>
                    • {device.name} {device.description ? `(${device.description})` : ''}
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

      <Dialog open={deleteConfirmOpen} onClose={() => { setDeleteConfirmOpen(false); setDeviceToDelete(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>{t("common.confirmDeletion")}</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {deviceToDelete && t("admin.devices.confirmDelete", { name: deviceToDelete.name })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteConfirmOpen(false); setDeviceToDelete(null); }}>{t("common.cancel")}</Button>
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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      />
    </Box>
  );
};

export default AdminDevices;


