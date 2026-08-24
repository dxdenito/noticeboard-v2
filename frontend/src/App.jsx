import { Routes, Route } from "react-router-dom";
import Feed from "./pages/Feed";
import MainLayout from "./layouts/MainLayout";




function App() {
  return (
    <>
        <Routes >
          <Route element={<MainLayout/>}>
            <Route path="/" element={<Feed/>}/>
          </Route>
        </Routes>
      </>
      );
}

export default App;