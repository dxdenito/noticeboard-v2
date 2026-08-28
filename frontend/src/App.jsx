import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Feed from "./pages/Feed";
import AsymmetricLoginPage from "./pages/Login";
import AsymmetricNoticeboard from "./pages/TestFeed"
import Dashboard from "./pages/admin/Dashboard";
import AdminLayout from "./layouts/AdminLayout";
import MainLayout from "./layouts/MainLayout"
import AdminRoute from "./components/AdminRoute";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<MainLayout/>}>
          <Route path="/" element={<AsymmetricNoticeboard />} />
          <Route path="/login" element={<AsymmetricLoginPage />} />
        </Route>
        
        <Route element={<AdminRoute><AdminLayout/></AdminRoute>}>
          <Route path="/dashboard" element={<Dashboard/>}/>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;