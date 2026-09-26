import { useState, useEffect, useRef } from "react";
import logo from "../images/jkuatlogo.png"
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Search, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MENU_ITEMS = [
  { label: 'Sections', to: '/browse/sections' },
  { label: 'Events', to: '/events' },
  { label: 'Staff', to: '/browse/staff' },
  { label: 'Students', to: '/browse/students' },
  { label: 'Categories', to: '/browse/categories' },
];

export default function Navbar(){
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [searchValue, setSearchValue] = useState(() => searchParams.get("q") || "");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const debounceRef = useRef(null);
  const mobileSearchInputRef = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(location.pathname === "/" ? location.search : "");
      if (searchValue) {
        params.set("q", searchValue);
      } else {
        params.delete("q");
      }
      const query = params.toString();
      navigate(`/${query ? `?${query}` : ""}`, { replace: true });
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [searchValue]);

  useEffect(() => {
    if (mobileSearchOpen) mobileSearchInputRef.current?.focus();
  }, [mobileSearchOpen]);

  return (
    <nav className="sticky w-full z-20 top-0 start-0 bg-white border-b border-gray-200 shadow-md font-sans select-none">
      <div className="h-20 flex items-stretch">
        <Link
          to="/"
          className="bg-jkuat-green text-white flex items-center gap-3 pl-4 md:pl-6 pr-8 md:pr-12 relative z-10 hover:bg-jkuat-green/50 transition-colors cursor-pointer decoration-transparent shrink-0"
          style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)', minWidth: '160px' }}
        >
          <img src={logo} className="h-9 md:h-10" alt="Jkuat Logo" />
          <div className=" flex flex-col leading-tight">
            <span className="font-extrabold text-lg tracking-wide uppercase">JKUAT</span>
            <span className="text-xs font-medium text-green-100 -mt-1">Noticeboard</span>
          </div>
        </Link>

        <div
          className="hidden md:flex flex-1 items-center gap-6 overflow-x-auto scrollbar-none px-8 relative -ml-6"
          style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
        >
          <style>{`div::-webkit-scrollbar { display: none; }`}</style>
          {MENU_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-gray-700 font-semibold hover:text-jkuat-red whitespace-nowrap transition-colors py-2 px-3 rounded-md hover:bg-gray-50 cursor-pointer decoration-transparent"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex flex-1 items-center justify-end gap-4 pr-6 pl-4">
          <div className="relative w-full max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search notices..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-jkuat-green/40 focus:bg-white transition-colors"
            />
          </div>
        </div>

        <div className="flex md:hidden items-center gap-1 pr-3 ml-auto shrink-0">
          <button
            onClick={() => { setMobileSearchOpen((v) => !v); setMobileMenuOpen(false); }}
            aria-label="Toggle search"
            className="p-2.5 text-gray-600 hover:text-jkuat-green"
          >
            {mobileSearchOpen ? <X size={20} /> : <Search size={20} />}
          </button>
          <button
            onClick={() => { setMobileMenuOpen((v) => !v); setMobileSearchOpen(false); }}
            aria-label="Toggle menu"
            className="p-2.5 text-gray-600 hover:text-jkuat-green"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="md:hidden px-4 pb-3 pt-1 border-t border-gray-100">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              ref={mobileSearchInputRef}
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search notices..."
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-jkuat-green/40 focus:bg-white transition-colors"
            />
          </div>
        </div>
      )}

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 px-2 py-2">
          {MENU_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className="block text-gray-700 font-semibold hover:text-jkuat-red transition-colors py-2.5 px-3 rounded-md hover:bg-gray-50"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}