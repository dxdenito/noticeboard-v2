import AdminNavbar from "../components/admin/AdminNavbar";
import { Menu, X, LayoutDashboard, PlusCircle, FileText, CheckSquare, Users, Tags, Pin, LogOut, Network } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import { useLocation, Link, Outlet } from "react-router-dom";
import { isAdmin, canApprove, canManageUsers, canCreateCategories, canPin, canManageOrgUnits } from "../lib/permissions";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: isAdmin },
  { to: "/dashboard/post", label: "Post Notice", icon: PlusCircle, show: isAdmin },
  { to: "/dashboard/my-notices", label: "My Notices", icon: FileText, show: isAdmin },
  { to: "/dashboard/review-queue", label: "Review Queue", icon: CheckSquare, show: canApprove },
  { to: "/dashboard/users", label: "Manage Users", icon: Users, show: canManageUsers },
  { to: "/dashboard/tags", label: "Manage Tags", icon: Tags, show: canCreateCategories },
  { to: "/dashboard/pinned", label: "Pinned Notices", icon: Pin, show: canPin },
  { to: "/dashboard/org-units", label: "Org Units", icon: Network, show: canManageOrgUnits },
];
export default function AdminLayout(){
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    
    const visibleItems = NAV_ITEMS.filter((item) => item.show(user));
    return(
        <>
            <AdminNavbar/>
            <div className="flex">
                {/* sidebar */}
                <aside
                    className={`fixed inset-y-0 left-0 z-50 md:z-40 w-64 h-full bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out
                    ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static md:flex md:flex-col`}
                >
                    <nav className="flex-1 px-3 py-4 space-y-1">
                        {visibleItems.map((item) => {
                            const Icon = item.icon;
                            const active = location.pathname === item.to;
                            return (
                            <Link
                                key={item.to}
                                to={item.to}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors
                                ${active ? "bg-jkuat-green/10 text-jkuat-green" : "text-gray-600 hover:bg-gray-50"}`}
                            >
                                <Icon size={18} />
                                {item.label}
                            </Link>
                            );
                        })}
                    </nav>
                    <div className="px-3 py-4 border-t border-gray-100">
                        <button
                            onClick={logout}
                            className="flex gap-2 w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                           <LogOut/> Log out
                        </button>
                    </div>
                </aside>
                {/* Mobile overlay backdrop when sidebar is open */}
               {sidebarOpen && (
                 <div
                   className="fixed inset-0 bg-black/30 z-30 md:hidden"
                   onClick={() => setSidebarOpen(false)}
                 />
               )}
                {/* main layout */}
                {/* Main content column */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Mobile top bar with hamburger */}
                    <header className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20">
                    <button onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                        <Menu size={22} />
                    </button>
                    <span className="font-bold text-sm text-jkuat-green">JKUAT Noticeboard Admin</span>
                    <div className="w-[22px]" /> {/* spacer to balance the hamburger */}
                    </header>
                    <main className="flex-1 p-4 md:p-8">
                    <Outlet />
                    </main>
                </div>

            </div>
        </>
    )
}