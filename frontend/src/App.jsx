import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Feed from "./pages/Feed";
import MainLayout from "./layouts/MainLayout";
import AsymmetricLoginPage from "./pages/Login";
import AsymmetricNoticeboard from "./pages/TestFeed"
import AdminLayout from "./layouts/MainLayout";
import Dashboard from "./pages/admin/Dashboard";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<AsymmetricNoticeboard />} />
          <Route path="/login" element={<AsymmetricLoginPage />} />
        </Route>
        
        <Route element={<AdminLayout/>}>
          <Route path="/dashboard" element={<Dashboard/>}/>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;