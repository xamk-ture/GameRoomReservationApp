import {
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  Route,
} from "react-router-dom";
import Login from "./components/Login/Login";
import PlayerProfile from "./components/Player/PlayerProfile";
import Root from "./components/Routes/Root";
import Settings from "./components/Settings";
import Bookings from "./components/GameRoomBooking/Bookings";
import RequireAdmin from "./components/Routes/RequireAdmin.tsx";
import AdminLayout from "./components/Admin/AdminLayout.tsx";
import AdminUsers from "./components/Admin/Users.tsx";
import AdminDevices from "./components/Admin/Devices.tsx";
import AdminBookings from "./components/Admin/Bookings.tsx";
import AdminDashboard from "./components/Admin/Dashboard.tsx";
import AdminCalendar from "./components/Admin/AdminCalendar.tsx";

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<Login />} />
      <Route element={<Root />}>
        <Route path="/profile" element={<PlayerProfile />} />
        <Route path="/calendar" element={<Bookings />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route element={<RequireAdmin />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="devices" element={<AdminDevices />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="calendar" element={<AdminCalendar />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
    </>
  )
);

function App() {
  return (
    <RouterProvider router={router} future={{ v7_startTransition: true }} />
  );
}

export default App;
