import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, TextField, TablePagination, Checkbox, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { OpenAPI } from "../../api/core/OpenAPI";
import { useTranslation } from "react-i18next";
import { useEffect, useState, useMemo } from "react";

type UserSortOrder = "alphabetical" | "newest" | "oldest" | "lastLogin";

const AdminUsers = () => {
  const [users, setUsers] = useState<Array<{ email: string; createdAt: string; lastLoginAt: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<UserSortOrder>("newest");
  const [userPage, setUserPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { t, i18n } = useTranslation();

  useEffect(() => {
    const base = OpenAPI.BASE || "";
    fetch(`${base}/api/admin/users`, { headers: OpenAPI.HEADERS as any })
      .then(async (u) => {
        if (!u.ok) throw new Error(t("errors.loadUsersFailed"));
        const usersJson = await u.json();
        setUsers(usersJson || []);
      })
      .catch((e) => setError(e.message));
  }, [t]);

  // Sort users based on sortOrder
  const sortedUsers = useMemo(() => {
    const sorted = [...users];
    sorted.sort((a, b) => {
      switch (sortOrder) {
        case "alphabetical":
          return a.email.localeCompare(b.email);
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "lastLogin":
          return new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime();
        default:
          return 0;
      }
    });
    return sorted;
  }, [users, sortOrder]);

  // Filter users by email
  const filteredUsers = useMemo(() => {
    if (!userFilter.trim()) {
      return sortedUsers;
    }
    const filterLower = userFilter.toLowerCase().trim();
    return sortedUsers.filter((user) => user.email.toLowerCase().includes(filterLower));
  }, [sortedUsers, userFilter]);

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">{t("admin.users.manageTitle")}</Typography>
        <Box>
          <Typography variant="subtitle1" color="text.secondary">
            {t("admin.users.totalUsers", { count: users.length })}
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>{successMessage}</Alert>}

      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, borderBottom: 1, borderColor: "divider", pb: 1 }}>
          {t("admin.users.authUsers")}
        </Typography>

        <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
          <TextField
            size="small"
            placeholder={t("admin.users.searchByEmail")}
            value={userFilter}
            onChange={(e) => { setUserFilter(e.target.value); setUserPage(0); }}
            sx={{ flexGrow: 1, maxWidth: 400 }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>{t("admin.users.sortBy")}</InputLabel>
            <Select
              value={sortOrder}
              label={t("admin.users.sortBy")}
              onChange={(e) => setSortOrder(e.target.value as UserSortOrder)}
            >
              <MenuItem value="alphabetical">{t("admin.users.sortAlphabetical")}</MenuItem>
              <MenuItem value="newest">{t("admin.users.sortNewest")}</MenuItem>
              <MenuItem value="oldest">{t("admin.users.sortOldest")}</MenuItem>
              <MenuItem value="lastLogin">{t("admin.users.sortLastLogin")}</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            onClick={() => setCreateOpen(true)}
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
            {t("admin.users.addUser")}
          </Button>
          <Button
            variant="outlined"
            color="error"
            disabled={selectedEmails.length === 0}
            onClick={() => setConfirmOpen(true)}
          >
            {t("common.deleteSelected")} ({selectedEmails.length})
          </Button>
        </Box>

        <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ bgcolor: "action.hover" }}>
              <TableRow>
                <TableCell width={40}>
                  <Checkbox
                    checked={filteredUsers.length > 0 && selectedEmails.length === filteredUsers.length}
                    indeterminate={selectedEmails.length > 0 && selectedEmails.length < filteredUsers.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEmails(filteredUsers.map((u) => u.email));
                      } else {
                        setSelectedEmails([]);
                      }
                    }}
                  />
                </TableCell>
                <TableCell><strong>{t("common.email")}</strong></TableCell>
                <TableCell><strong>{t("common.created")}</strong></TableCell>
                <TableCell><strong>{t("admin.users.lastLogin")}</strong></TableCell>
                <TableCell align="right"><strong>{t("common.actions")}</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers
                .slice(userPage * rowsPerPage, userPage * rowsPerPage + rowsPerPage)
                .map((u) => (
                  <TableRow key={u.email} hover>
                    <TableCell>
                      <Checkbox checked={selectedEmails.includes(u.email)} onChange={(e) => setSelectedEmails((prev) => e.target.checked ? [...prev, u.email] : prev.filter(x => x !== u.email))} />
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{new Date(u.createdAt).toLocaleString(i18n.language === "en" ? "en-US" : "fi-FI")}</TableCell>
                    <TableCell>{new Date(u.lastLoginAt).toLocaleString(i18n.language === "en" ? "en-US" : "fi-FI")}</TableCell>
                    <TableCell align="right">
                      <Button color="error" size="small" onClick={() => { setSelectedEmails([u.email]); setConfirmOpen(true); }}>{t("common.delete")}</Button>
                    </TableCell>
                  </TableRow>
                ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    <Typography color="text.secondary">{t("admin.users.noUsers")}</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredUsers.length}
          page={userPage}
          onPageChange={(_, p) => setUserPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setUserPage(0); }}
        />
      </Paper>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t("common.confirmDeletion")}</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {t("admin.users.confirmDeleteBody", { count: selectedEmails.length })}
          </Typography>
          {selectedEmails.length > 0 && (
            <Box sx={{ mt: 2, maxHeight: 200, overflow: "auto" }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                {t("common.email")}:
              </Typography>
              {selectedEmails.map((email) => (
                <Typography key={email} variant="body2" sx={{ py: 0.5, pl: 2 }}>
                  • {email}
                </Typography>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>{t("common.cancel")}</Button>
          <Button color="error" variant="contained" onClick={async () => {
            try {
              const base = (OpenAPI as any).BASE || "";
              const headers = { ...(OpenAPI as any).HEADERS, "Content-Type": "application/json" } as Record<string, string>;
              const resp = await fetch(`${base}/api/admin/users`, { method: "DELETE", headers, body: JSON.stringify({ emails: selectedEmails }) });
              if (!resp.ok) throw await resp.json().catch(() => new Error(t("errors.deleteFailed")));
              setConfirmOpen(false);
              setSelectedEmails([]);
              // reload users list
              const u = await fetch(`${base}/api/admin/users`, { headers: headers });
              const usersJson = await u.json();
              setUsers(usersJson || []);
            } catch (e: any) {
              setError(e?.Message || e?.message || t("errors.deleteFailed"));
            }
          }}>{t("common.delete")}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createOpen} onClose={() => { setCreateOpen(false); setNewUserEmail(""); setCreateError(null); }} fullWidth maxWidth="sm">
        <DialogTitle>{t("admin.users.addUser")}</DialogTitle>
        <DialogContent>
          {createError && <Alert severity="error" sx={{ mb: 2 }}>{createError}</Alert>}
          <TextField
            fullWidth
            margin="dense"
            label={t("common.email")}
            type="email"
            value={newUserEmail}
            onChange={(e) => {
              setNewUserEmail(e.target.value);
              setCreateError(null);
            }}
            placeholder="user@edu.xamk.fi"
            helperText={t("errors.onlySchoolEmails")}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateOpen(false); setNewUserEmail(""); setCreateError(null); }}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!newUserEmail.trim()) {
                setCreateError(t("errors.invalidUniversityEmail"));
                return;
              }
              if (!newUserEmail.endsWith("@edu.xamk.fi") && !newUserEmail.endsWith("@xamk.fi")) {
                setCreateError(t("errors.onlySchoolEmails"));
                return;
              }
              try {
                const base = (OpenAPI as any).BASE || "";
                const headers = { ...(OpenAPI as any).HEADERS, "Content-Type": "application/json" } as Record<string, string>;
                const resp = await fetch(`${base}/api/admin/users`, {
                  method: "POST",
                  headers,
                  body: JSON.stringify({ email: newUserEmail.trim() }),
                });
                if (!resp.ok) {
                  const errorData = await resp.json().catch(() => ({ Message: t("errors.generic") }));
                  throw new Error(errorData.Message || errorData.message || t("errors.generic"));
                }
                setCreateOpen(false);
                setNewUserEmail("");
                setCreateError(null);
                setSuccessMessage(t("admin.users.userCreated"));
                // Reload users list
                const u = await fetch(`${base}/api/admin/users`, { headers: OpenAPI.HEADERS as any });
                const usersJson = await u.json();
                setUsers(usersJson || []);
              } catch (e: any) {
                setCreateError(e?.Message || e?.message || t("errors.generic"));
              }
            }}
            disabled={!newUserEmail.trim()}
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
              "&:disabled": {
                backgroundColor: "#ccc",
                color: "#666",
                boxShadow: "none",
              },
              transition: "all 0.3s ease",
            }}
          >
            {t("common.create")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminUsers;


