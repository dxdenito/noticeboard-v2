import logo from "../images/jkuatlogo.png"
import React, { useRef } from 'react';

export default function AdminNavbar(){
      const scrollRef = useRef(null);

  // Sample menu items
  const menuItems = ['Home', 'Courses', 'Departments', 'Clubs', 'Staff', 'Students', 'Support', 'Careers'];

    return(
        <> 
            <nav className="sticky w-full z-20 top-0 start-0  h-20 bg-white border-b border-gray-200 flex items-stretch shadow-md font-sans select-none">
      
      {/* 1. BRAND BLOCK (Left - Red Background) */}
      <a 
        href="#home"
        className="bg-red-600 text-white flex items-center gap-3 pl-6 pr-12 relative z-10 hover:bg-red-700 transition-colors cursor-pointer decoration-transparent"
        style={{
          clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)',
          minWidth: '240px'
        }}
      >
        <img src={logo} className="h-10" alt="Jkuat Logo" />
        
        {/* Website Name */}
        <div className="flex flex-col leading-tight">
          <span className="font-extrabold text-lg tracking-wide uppercase">JKUAT</span>
          <span className="text-xs font-medium text-red-100 -mt-1">Noticeboard Admin</span>
        </div>
      </a>

      {/* 2. SCROLLABLE MENU (Center - Moves behind the angled cut) */}
      

      {/* 3. ACTION BLOCK (Right - Clean White layout with Green accent button) */}
      <div className="flex items-center gap-6 pr-6 shrink-0 bg-white pl-4 shadow-[-15px_0_15px_-5px_rgba(255,255,255,0.9)] z-10">
        
        {/* ISO-9001 Badge */}
        <a 
          href="#iso-info"
          className="border-2 border-green-600 text-green-700 text-xs font-bold px-3 py-1 rounded tracking-wider hover:bg-green-50 transition-all cursor-pointer decoration-transparent"
        >
          ISO - 9001
        </a>

        {/* Login Button */}
        <a 
          href="#login"
          className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-5 py-2.5 rounded-md shadow-sm transition-colors cursor-pointer decoration-transparent"
        >
          LOGIN
        </a>
      </div>

    </nav>
        

        </>
    )
}