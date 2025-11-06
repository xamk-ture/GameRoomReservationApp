import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, TextField, TablePagination, Checkbox } from "@mui/material";
import { OpenAPI } from "../../api/core/OpenAPI";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";

const AdminUsers = () => {
  const [users, setUsers] = useState<Array<{ email: string; createdAt: string; lastLoginAt: string }>>([]);
  const [players, setPlayers] = useState<Array<{ id: number; email: string; createdAt: string; updatedAt: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState("");
  const [playerFilter, setPlayerFilter] = useState("");
  const [userPage, setUserPage] = useState(0);
  const [playerPage, setPlayerPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { t } = useTranslation();

  useEffect(() => {
    const base = OpenAPI.BASE || "";
    Promise.all([
      fetch(`${base}/api/admin/users`, { headers: OpenAPI.HEADERS as any }),
      fetch(`${base}/api/admin/players`, { headers: OpenAPI.HEADERS as any }),
    ])
      .then(async ([u, p]) => {
        if (!u.ok) throw new Error(t("errors.loadUsersFailed"));
        if (!p.ok) throw new Error(t("errors.loadPlayersFailed"));
        const usersJson = await u.json();
        const playersJson = await p.json();
        setUsers(usersJson || []);
        setPlayers(playersJson || []);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>{t("admin.users.manageTitle")}</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Typography variant="h6" sx={{ mt: 1, mb: 1 }}>{t("admin.users.authUsers")}</Typography>
      <TextField size="small" placeholder={t("admin.users.searchByEmail")} value={userFilter} onChange={(e) => { setUserFilter(e.target.value); setUserPage(0); }} sx={{ mb: 1 }} />
      <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
        <Button variant="outlined" color="error" disabled={selectedEmails.length === 0} onClick={() => setConfirmOpen(true)}>{t("common.deleteSelected")}</Button>
      </Box>
      <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell width={24}>
                <Checkbox
                  checked={users.filter((u) => u.email.toLowerCase().includes(userFilter.toLowerCase())).length > 0 && selectedEmails.length === users.filter((u) => u.email.toLowerCase().includes(userFilter.toLowerCase())).length}
                  indeterminate={selectedEmails.length > 0 && selectedEmails.length < users.filter((u) => u.email.toLowerCase().includes(userFilter.toLowerCase())).length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedEmails(users.filter((u) => u.email.toLowerCase().includes(userFilter.toLowerCase())).map((u) => u.email));
                    } else {
                      setSelectedEmails([]);
                    }
                  }}
                />
              </TableCell>
              <TableCell>{t("common.email")}</TableCell>
              <TableCell>{t("common.created")}</TableCell>
              <TableCell>{t("admin.users.lastLogin")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users
              .filter((u) => u.email.toLowerCase().includes(userFilter.toLowerCase()))
              .slice(userPage * rowsPerPage, userPage * rowsPerPage + rowsPerPage)
              .map((u) => (
              <TableRow key={u.email}>
                <TableCell>
                  <Checkbox checked={selectedEmails.includes(u.email)} onChange={(e) => setSelectedEmails((prev) => e.target.checked ? [...prev, u.email] : prev.filter(x => x !== u.email))} />
                </TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{new Date(u.createdAt).toLocaleString()}</TableCell>
                <TableCell>{new Date(u.lastLoginAt).toLocaleString()}</TableCell>
                <TableCell align="right">
                  <Button color="error" variant="text" onClick={() => { setSelectedEmails([u.email]); setConfirmOpen(true); }}>{t("common.delete")}</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={users.filter((u) => u.email.toLowerCase().includes(userFilter.toLowerCase())).length}
        page={userPage}
        onPageChange={(_, p) => setUserPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setUserPage(0); setPlayerPage(0); }}
      />

      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>{t("admin.users.players")}</Typography>
      <TextField size="small" placeholder={t("admin.users.searchByEmail")} value={playerFilter} onChange={(e) => { setPlayerFilter(e.target.value); setPlayerPage(0); }} sx={{ mb: 1 }} />
      <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>{t("common.id")}</TableCell>
              <TableCell>{t("common.email")}</TableCell>
              <TableCell>{t("common.created")}</TableCell>
              <TableCell>{t("common.updated")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {players
              .filter((p) => (p.email || "").toLowerCase().includes(playerFilter.toLowerCase()))
              .slice(playerPage * rowsPerPage, playerPage * rowsPerPage + rowsPerPage)
              .map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.id}</TableCell>
                <TableCell>{p.email}</TableCell>
                <TableCell>{new Date(p.createdAt).toLocaleString()}</TableCell>
                <TableCell>{new Date(p.updatedAt).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>{t("common.confirmDeletion")}</DialogTitle>
        <DialogContent>
          {t("admin.users.confirmDeleteBody", { count: selectedEmails.length })}
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
              // reload lists
              const [u, p] = await Promise.all([
                fetch(`${base}/api/admin/users`, { headers: headers }),
                fetch(`${base}/api/admin/players`, { headers: headers })
              ]);
              const usersJson = await u.json();
              const playersJson = await p.json();
              setUsers(usersJson || []);
              setPlayers(playersJson || []);
            } catch (e: any) {
              setError(e?.Message || e?.message || t("errors.deleteFailed"));
            }
          }}>{t("common.delete")}</Button>
        </DialogActions>
      </Dialog>
      <TablePagination
        component="div"
        count={players.filter((p) => (p.email || "").toLowerCase().includes(playerFilter.toLowerCase())).length}
        page={playerPage}
        onPageChange={(_, p) => setPlayerPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setUserPage(0); setPlayerPage(0); }}
      />
    </Box>
  );
};

export default AdminUsers;


