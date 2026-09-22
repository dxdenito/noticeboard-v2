import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import logo from "../../images/jkuatlogo.png"
import { LayoutDashboard } from "lucide-react";
import NotificationBell from "./NotificationBell";

export default function AdminNavbar(){
  const { user, loading, logout } = useAuth();

    return(
        <>
            <nav className="sticky w-full z-50 top-0 start-0 h-16 sm:h-20 bg-white border-b border-gray-200 flex justify-between items-stretch shadow-md font-sans select-none">

      {/* 1. BRAND BLOCK (Left - Red Background) */}
      <Link
        to="/dashboard"
        className="bg-jkuat-red text-white flex items-center gap-2 sm:gap-3 pl-3 sm:pl-6 pr-6 sm:pr-12 relative z-10 hover:bg-jkuat-red hover:bg-opacity-80 transition-colors cursor-pointer decoration-transparent shrink-0"
        style={{
          clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)',
          minWidth: '120px'
        }}
      >
        <img src={logo} className="h-8 sm:h-10" alt="Jkuat Logo" />

        {/* Website Name */}
        <div className="hidden sm:flex flex-col leading-tight">
          <span className="font-extrabold text-lg tracking-wide uppercase">JKUAT</span>
          <span className="text-xs font-medium text-red-100 -mt-1">Noticeboard Admin</span>
        </div>
      </Link>


      {/* 3. ACTION BLOCK (Right - Clean White layout with Green accent button) */}
      <div className="flex items-center gap-3 sm:gap-6 pr-3 sm:pr-6 shrink-0 bg-white pl-4 shadow-[-15px_0_15px_-5px_rgba(255,255,255,0.9)] z-10">


        {/* Login Button */}
        {!loading && user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/dashboard"
              title="Dashboard"
              className="p-2 text-green-700 hover:bg-green-50 rounded-md transition-colors"
            >
              <LayoutDashboard size={19} />
            </Link>
            <NotificationBell />
            <button onClick={logout} className="text-gray-500 text-xs sm:text-sm font-semibold hover:text-red-600">
              Log out
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-5 py-2.5 rounded-md shadow-sm transition-colors cursor-pointer decoration-transparent"
          >
            LOGIN
          </Link>
        )}
      </div>

    </nav>


        </>
    )
}