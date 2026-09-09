import logo from "../images/jkuatlogo.png"
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar(){
  const { user, loading, logout } = useAuth();

  const menuItems = [
    { label: 'Departments', to: '/browse/departments' },
    { label: 'Clubs', to: '/browse/clubs' },
    { label: 'Courses', to: '/browse/courses' },
    { label: 'Categories', to: '/browse/categories' },
    { label: 'Staff', to: '/browse/staff' },
    { label: 'Students', to: '/browse/students' },
  ];

  return (
    <nav className="sticky w-full z-20 top-0 start-0 h-20 bg-white border-b border-gray-200 flex items-stretch shadow-md font-sans select-none">
      <Link
        to="/"
        className="bg-jkuat-green text-white flex items-center gap-3 pl-6 pr-12 relative z-10 hover:bg-jkuat-green/50 transition-colors cursor-pointer decoration-transparent"
        style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)', minWidth: '240px' }}
      >
        <img src={logo} className="h-10" alt="Jkuat Logo" />
        <div className="flex flex-col leading-tight">
          <span className="font-extrabold text-lg tracking-wide uppercase">JKUAT</span>
          <span className="text-xs font-medium text-green-100 -mt-1">Noticeboard</span>
        </div>
      </Link>

      <div
        className="flex-1 flex items-center gap-6 overflow-x-auto scrollbar-none px-8 relative -ml-6"
        style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        {menuItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="text-gray-700 font-semibold hover:text-green-600 whitespace-nowrap transition-colors py-2 px-3 rounded-md hover:bg-gray-50 cursor-pointer decoration-transparent"
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-6 pr-6 shrink-0 bg-white pl-4 shadow-[-15px_0_15px_-5px_rgba(255,255,255,0.9)] z-10">
        
        

        
      </div>
    </nav>
  );
}