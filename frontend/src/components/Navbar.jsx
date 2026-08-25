import logo from "../images/jkuatlogo.png"
import React, { useRef } from 'react';

export default function Navbar(){
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
          <span className="text-xs font-medium text-red-100 -mt-1">Noticeboard</span>
        </div>
      </a>

      {/* 2. SCROLLABLE MENU (Center - Moves behind the angled cut) */}
      <div 
        ref={scrollRef}
        className="flex-1 flex items-center gap-6 overflow-x-auto scrollbar-none px-8 relative -ml-6"
        style={{
          msOverflowStyle: 'none', /* IE and Edge */
          scrollbarWidth: 'none',  /* Firefox */
        }}
      >
        {/* Custom style block to hide webkit scrollbars inline */}
        <style>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {menuItems.map((item, index) => (
          <a
            key={index}
            href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
            className="text-gray-700 font-semibold hover:text-green-600 whitespace-nowrap transition-colors py-2 px-3 rounded-md hover:bg-gray-50 cursor-pointer decoration-transparent"
          >
            {item}
          </a>
        ))}
      </div>

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
        {/* <header className="sticky w-full z-20 top-0 start-0">
            <nav className="bg-jkuat-green text-white">
                <div className="flex flex-wrap justify-between items-center mx-auto max-w-screen-xl p-4">
                    <a href="" className="flex items-center space-x-3 rtl:space-x-reverse">
                        <img src={logo} className="h-7" alt="Jkuat Logo" />
                        <span className="self-center text-xl text-heading font-semibold whitespace-nowrap">Jkuat Noticeboard</span>
                    </a>
                    <div className="flex items-center space-x-6 rtl:space-x-reverse">
                        <a href="https://www.jkuat.ac.ke" className="text-sm  text-body hover:underline">jkuat website</a>
                        <a href="#" className="text-sm font-medium text-fg-brand hover:underline">Login</a>
                    </div>
                </div>
            </nav>
            <nav className="bg-jkuat-white  shadow-bottom border-default">
                <div className="max-w-screen-xl px-4 py-3 mx-auto">
                    <div className="flex items-center">
                        <ul className="flex flex-row font-medium mt-0 space-x-8 rtl:space-x-reverse text-sm overflow-x-scroll [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                            <li>
                                <a href="#" className="text-heading hover:underline" aria-current="page">Home</a>
                            </li>
                            <li>
                                <a href="#" className="text-heading hover:underline">Students</a>
                            </li>
                            <li>
                                <a href="#" className="text-heading hover:underline">Staff</a>
                            </li>
                            <li>
                                <a href="#" className="text-heading hover:underline">departments</a>
                            </li>
                            <li>
                                <a href="#" className="text-heading hover:underline">courses</a>
                            </li>
                            <li>
                                <a href="#" className="text-heading hover:underline">public</a>
                            </li>
                            <li>
                                <a href="#" className="text-heading hover:underline">Past Notices</a>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>
        </header> */}

        </>
    )
}