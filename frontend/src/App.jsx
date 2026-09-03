import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Feed from "./pages/Feed";
import AsymmetricLoginPage from "./pages/Login";
import AsymmetricNoticeboard from "./pages/TestFeed"
import Dashboard from "./pages/admin/Dashboard";
import AdminLayout from "./layouts/AdminLayout";
import MainLayout from "./layouts/MainLayout"
import AdminRoute from "./components/AdminRoute";
import { ToastProvider } from "./context/ToastContext";
import PostNotice from "./pages/admin/PostNotice";
import MyNotices from "./pages/admin/MyNotices";
import ReviewQueue from "./pages/admin/ReviewQueue";
import ManageUsers from "./pages/admin/ManageUsers";
import ManageTags from "./pages/admin/ManageTags";
import PinnedNotices from "./pages/admin/PinnedNotices";
import NoticeDetail from "./pages/NoticeDetail";
import EditNotice from "./pages/admin/EditNotice";

function App() {
  return (
    <AuthProvider>
     <ToastProvider>
      <Routes>
        <Route element={<MainLayout/>}>
          <Route path="/" element={<AsymmetricNoticeboard />} />
          <Route path="/login" element={<AsymmetricLoginPage />} />
          <Route path="/notices/:id" element={<NoticeDetail />} />
        </Route>
        
        <Route element={<AdminRoute><AdminLayout/></AdminRoute>}>
          <Route path="/dashboard" element={<Dashboard/>}/>
          <Route path="/dashboard/post" element={<PostNotice/>}/>
          <Route path="/dashboard/my-notices" element={<MyNotices/>}/>
          <Route path="/dashboard/review-queue" element={<ReviewQueue/>}/>
          <Route path="/dashboard/users" element={<ManageUsers/>}/>
          <Route path="/dashboard/tags" element={<ManageTags/>}/>
          <Route path="/dashboard/pinned" element={<PinnedNotices/>}/>
          <Route path="/dashboard/edit-notice/:id" element={<EditNotice/>}/>

        </Route>
      </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;