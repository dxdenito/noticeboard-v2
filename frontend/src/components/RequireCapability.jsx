import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RequireCapability({ require, children }) {
  const { user } = useAuth();
  if (!require(user)) return <Navigate to="/dashboard" replace />;
  return children;
}