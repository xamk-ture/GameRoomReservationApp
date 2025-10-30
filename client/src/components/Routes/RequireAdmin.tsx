import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";

const RequireAdmin = () => {
  const { isAdmin, token } = useAuth();
  if (!token) return <Navigate to="/" replace />;
  if (!isAdmin) return <Navigate to="/profile" replace />;
  return <Outlet />;
};

export default RequireAdmin;


