import { Navigate, Outlet } from "react-router-dom";

const PublicRoute = () => {
  const token = localStorage.getItem("token");

  // If token exists, redirect to dashboard
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />; // Fixed self-closing tag
};

export default PublicRoute;
