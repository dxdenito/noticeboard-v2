import AdminNavbar from "../components/admin/AdminNavbar";
import { Menu, X, LayoutDashboard, PlusCircle, FileText, CheckSquare, Users, Tags, Pin, LogOut, Network, Building2, ScrollText, LayoutList } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect, useCallback } from "react";
import { useLocation, Link, Outlet } from "react-router-dom";
import { isAdmin, canApprove, canManageUsers, canCreateCategories, canPin, canManageOrgUnits, isCorporateSuperAdmin, canViewAuditLog, canViewAllNotices } from "../lib/permissions";
import { api } from "../api/client";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: isAdmin },
  { to: "/dashboard/post", label: "Post Notice", icon: PlusCircle, show: isAdmin },
  { to: "/dashboard/my-notices", label: "My Notices", icon: FileText, show: isAdmin },
  { to: "/dashboard/all-notices", label: "All Notices", icon: LayoutList, show: canViewAllNotices },
  { to: "/dashboard/review-queue", label: "Review Queue", icon: CheckSquare, show: canApprove, badgeKey: "pending" },
  { to: "/dashboard/rejected-notices", label: "Rejected Notices", icon: X, show: canApprove, badgeKey: "rejected" },
  { to: "/dashboard/users", label: "Manage Users", icon: Users, show: canManageUsers },
  { to: "/dashboard/corporate-admins", label: "Corporate Admins", icon: Building2, show: isCorporateSuperAdmin },
  { to: "/dashboard/tags", label: "Manage Tags", icon: Tags, show: canCreateCategories },
  { to: "/dashboard/pinned", label: "Pinned Notices", icon: Pin, show: canPin },
  { to: "/dashboard/org-units", label: "Org Units", icon: Network, show: canManageOrgUnits },
  { to: "/dashboard/audit-log", label: "Audit Log", icon: ScrollText, show: canViewAuditLog },
];

export const PENDING_COUNT_CHANGED_EVENT = "pending-count-changed";

export default function AdminLayout(){
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const location = useLocation();

    const visibleItems = NAV_ITEMS.filter((item) => item.show(user));

    const refetchPendingCount = useCallback(() => {
        if (!canApprove(user)) return;
        api.get("/notices/pending/count")
            .then((data) => setPendingCount(data.count))
            .catch(() => {});
    }, [user]);

    useEffect(() => {
        refetchPendingCount();
    }, [refetchPendingCount, location.pathname]);

    useEffect(() => {
        window.addEventListener(PENDING_COUNT_CHANGED_EVENT, refetchPendingCount);
        return () => window.removeEventListener(PENDING_COUNT_CHANGED_EVENT, refetchPendingCount);
    }, [refetchPendingCount]);

    return(
        <div className="h-screen flex flex-col overflow-hidden">
            <AdminNavbar/>
            <div className="flex flex-1 min-h-0">
                {/* sidebar */}
                <aside
                    className={`fixed inset-y-0 left-0 z-50 md:z-40 w-64 h-full bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out flex flex-col
                    ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static md:h-auto`}
                >
                    <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1">
                        {visibleItems.map((item) => {
                            const Icon = item.icon;
                            const active = location.pathname === item.to;
                            const badgeCount = item.badgeKey === "pending" ? pendingCount : 0;
                            return (
                            <Link
                                key={item.to}
                                to={item.to}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors
                                ${active ? "bg-jkuat-green/10 text-jkuat-green" : "text-gray-600 hover:bg-gray-50"}`}
                            >
                                <Icon size={18} />
                                <span className="flex-1">{item.label}</span>
                                {badgeCount > 0 && (
                                    <span className="bg-jkuat-red text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                                        {badgeCount > 99 ? "99+" : badgeCount}
                                    </span>
                                )}
                            </Link>
                            );
                        })}
                    </nav>
                    <div className="shrink-0 px-3 py-4 border-t border-gray-100">
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
                <div className="flex-1 flex flex-col min-w-0 min-h-0">
                    {/* Mobile top bar with hamburger */}
                    <header className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20 shrink-0">
                    <button onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                        <Menu size={22} />
                    </button>
                    <span className="font-bold text-sm text-jkuat-green">JKUAT Noticeboard Admin</span>
                    <div className="w-[22px]" /> {/* spacer to balance the hamburger */}
                    </header>
                    <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8">
                    <Outlet />
                    </main>
                </div>

            </div>
        </div>
    )
}