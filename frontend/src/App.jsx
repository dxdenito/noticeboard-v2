import { Routes, Route } from "react-router-dom";
import Feed from "./pages/Feed";
import MainLayout from "./layouts/MainLayout";
import AuthenticNoticeboard from "./pages/TestFeed";
import NoticeboardDashboard from "./pages/TestFeed";
import AsymmetricNoticeboard from "./pages/TestFeed";




function App() {
  return (
    <>
        <Routes >
          <Route element={<MainLayout/>}>
            <Route path="/" element={<Feed/>}/>
            <Route path="/test" element={<AsymmetricNoticeboard/>}/>
          </Route>
        </Routes>
      </>
      );
}

export default App;