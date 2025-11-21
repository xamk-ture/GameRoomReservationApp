import { Box, Grid, Paper, Typography, CircularProgress, Alert } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../api/api";
import { OpenAPI } from "../../api/core/OpenAPI";
import PeopleIcon from "@mui/icons-material/People";
import DevicesIcon from "@mui/icons-material/Devices";
import EventIcon from "@mui/icons-material/Event";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        users: 0,
        players: 0,
        devices: 0,
        bookings: 0,
        activeBookings: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadStats = async () => {
            try {
                setLoading(true);
                const base = OpenAPI.BASE || "";
                const headers = OpenAPI.HEADERS as any;

                const [usersResp, playersResp, devices, bookings] = await Promise.all([
                    fetch(`${base}/api/admin/users`, { headers }),
                    fetch(`${base}/api/admin/players`, { headers }),
                    api.DevicesService.getAllDevices(),
                    api.RoomBookingsService.getAllBookings(),
                ]);

                const users = usersResp.ok ? await usersResp.json() : [];
                const players = playersResp.ok ? await playersResp.json() : [];

                const now = new Date();
                const active = (bookings || []).filter((b: any) => {
                    if (!b.bookingDateTime) return false;
                    const start = new Date(b.bookingDateTime);
                    const end = new Date(start.getTime() + (b.duration || 0) * 60 * 60 * 1000);
                    return start <= now && end >= now;
                }).length;

                setStats({
                    users: (users || []).length,
                    players: (players || []).length,
                    devices: (devices || []).length,
                    bookings: (bookings || []).length,
                    activeBookings: active,
                });
            } catch (err: any) {
                console.error("Failed to load dashboard stats", err);
                setError(t("errors.loadError"));
            } finally {
                setLoading(false);
            }
        };

        loadStats();
    }, [t]);

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    const StatCard = ({ title, value, icon, color, onClick }: { title: string; value: number | string; icon: React.ReactNode; color: string; onClick?: () => void }) => (
        <Paper
            elevation={3}
            sx={{
                p: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                height: "100%",
                borderLeft: `6px solid ${color}`,
                cursor: onClick ? "pointer" : "default",
                transition: "transform 0.2s",
                "&:hover": onClick ? {
                    transform: "scale(1.02)",
                    boxShadow: 6
                } : {}
            }}
            onClick={onClick}
        >
            <Box>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                    {title}
                </Typography>
                <Typography variant="h3" component="div" fontWeight="bold">
                    {value}
                </Typography>
            </Box>
            <Box sx={{ color: color, opacity: 0.8 }}>{icon}</Box>
        </Paper>
    );

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: "bold" }}>
                {t("admin.dashboard.title", "Dashboard")}
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title={t("admin.dashboard.totalUsers", "Total Users")}
                        value={stats.users}
                        icon={<PeopleIcon sx={{ fontSize: 60 }} />}
                        color="#1976d2"
                        onClick={() => navigate("/admin/users")}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title={t("admin.dashboard.totalDevices", "Devices")}
                        value={stats.devices}
                        icon={<DevicesIcon sx={{ fontSize: 60 }} />}
                        color="#ed6c02"
                        onClick={() => navigate("/admin/devices")}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title={t("admin.dashboard.activeBookings", "Active Bookings")}
                        value={stats.activeBookings}
                        icon={<EventIcon sx={{ fontSize: 60 }} />}
                        color="#9c27b0"
                        onClick={() => navigate("/admin/bookings")}
                    />
                </Grid>
            </Grid>

            <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>
                    {t("admin.dashboard.quickStats", "Quick Stats")}
                </Typography>
                <Paper sx={{ p: 2 }}>
                    <Typography variant="body1">
                        {t("admin.dashboard.totalBookings", "Total Bookings All Time")}: <strong>{stats.bookings}</strong>
                    </Typography>
                </Paper>
            </Box>
        </Box>
    );
};

export default AdminDashboard;
