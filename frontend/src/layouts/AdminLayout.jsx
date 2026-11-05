import AdminNavbar from "../components/admin/AdminNavbar";
import {
  Menu, LayoutDashboard, PlusCircle, FileText, CheckSquare, Users, Tags, Pin, LogOut,
  Network, Building2, ScrollText, LayoutList, Mail, KeyRound, CalendarPlus, CalendarDays,
  ChevronDown, ShieldCheck, Database,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate, Link, Outlet } from "react-router-dom";
import {
  isAdmin, canApprove, canManageUsers, canCreateCategories, canPin, canManageOrgUnits,
  isCorporateSuperAdmin, canViewAuditLog, canViewAllNotices, canManageInstitutionalDomains, canViewAllEvents,
} from "../lib/permissions";
import { api } from "../api/client";

const NAV_ENTRIES = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: isAdmin },
  {
    key: "notices",
    label: "Notices",
    icon: FileText,
    matchPrefixes: ["/dashboard/notices/", "/dashboard/edit-notice/"],
    children: [
      { to: "/dashboard/post", label: "Post Notice", icon: PlusCircle, show: isAdmin },
      { to: "/dashboard/my-notices", label: "My Notices", icon: FileText, show: isAdmin },
      { to: "/dashboard/all-notices", label: "All Notices", icon: LayoutList, show: canViewAllNotices },
      { to: "/dashboard/pinned", label: "Pinned Notices", icon: Pin, show: canPin },
    ],
  },
  {
    key: "events",
    label: "Events",
    icon: CalendarDays,
    matchPrefixes: ["/dashboard/events/", "/dashboard/edit-event/"],
    children: [
      { to: "/dashboard/post-event", label: "Post Event", icon: CalendarPlus, show: isAdmin },
      { to: "/dashboard/my-events", label: "My Events", icon: CalendarDays, show: isAdmin },
      { to: "/dashboard/all-events", label: "All Events", icon: LayoutList, show: canViewAllEvents },
    ],
  },
  { to: "/dashboard/review-queue", label: "Review Queue", icon: CheckSquare, show: canApprove, badgeKey: "pending" },
  { to: "/dashboard/users", label: "Manage Users", icon: Users, show: canManageUsers },
  { to: "/dashboard/corporate-admins", label: "Corporate Admins", icon: Building2, show: isCorporateSuperAdmin },
  {
    key: "reference",
    label: "Reference Data",
    icon: Database,
    children: [
      { to: "/dashboard/tags", label: "Manage Tags", icon: Tags, show: canCreateCategories },
      { to: "/dashboard/org-units", label: "Org Units", icon: Network, show: canManageOrgUnits },
      { to: "/dashboard/institutional-domains", label: "Institutional Domains", icon: Mail, show: canManageInstitutionalDomains },
    ],
  },
  {
    key: "security",
    label: "Security",
    icon: ShieldCheck,
    children: [
      { to: "/dashboard/audit-log", label: "Audit Log", icon: ScrollText, show: canViewAuditLog },
      { to: "/dashboard/change-password", label: "Change Password", icon: KeyRound, show: isAdmin },
    ],
  },
];

export const PENDING_COUNT_CHANGED_EVENT = "pending-count-changed";

function groupIsActive(entry, pathname) {
  if (entry.children.some((child) => child.to === pathname)) return true;
  return (entry.matchPrefixes || []).some((prefix) => pathname.startsWith(prefix));
}

function NavItem({ item, active, badgeCount, nested, onNavigate }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-lg text-sm font-semibold transition-colors ${
        nested ? "px-3 py-2" : "px-3 py-2.5"
      } ${active ? "bg-jkuat-green/10 text-jkuat-green" : "text-gray-600 hover:bg-gray-50"}`}
    >
      <Icon size={nested ? 16 : 18} />
      <span className="flex-1">{item.label}</span>
      {badgeCount > 0 && (
        <span className="bg-jkuat-red text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </Link>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [openGroups, setOpenGroups] = useState({});
  const location = useLocation();
  const navigate = useNavigate();

  const visibleEntries = NAV_ENTRIES.map((entry) => {
    if (!entry.children) return entry.show(user) ? entry : null;
    const children = entry.children.filter((child) => child.show(user));
    return children.length > 0 ? { ...entry, children } : null;
  }).filter(Boolean);

  const refetchPendingCount = useCallback(() => {
    if (!canApprove(user)) return;
    Promise.allSettled([
      api.get("/notices/pending/count"),
      api.get("/events/pending/count"),
    ]).then((results) => {
      const total = results.reduce(
        (sum, result) => (result.status === "fulfilled" ? sum + (result.value.count || 0) : sum),
        0
      );
      setPendingCount(total);
    });
  }, [user]);

  useEffect(() => {
    if (user?.must_change_password && location.pathname !== "/dashboard/change-password") {
      navigate("/dashboard/change-password", { replace: true });
    }
  }, [user, location.pathname, navigate]);

  useEffect(() => {
    refetchPendingCount();
  }, [refetchPendingCount, location.pathname]);

  useEffect(() => {
    window.addEventListener(PENDING_COUNT_CHANGED_EVENT, refetchPendingCount);
    return () => window.removeEventListener(PENDING_COUNT_CHANGED_EVENT, refetchPendingCount);
  }, [refetchPendingCount]);

  useEffect(() => {
    for (const entry of NAV_ENTRIES) {
      if (entry.children && groupIsActive(entry, location.pathname)) {
        setOpenGroups((prev) => (prev[entry.key] ? prev : { ...prev, [entry.key]: true }));
      }
    }
  }, [location.pathname]);

  function toggleGroup(key) {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <AdminNavbar />
      <div className="flex flex-1 min-h-0">
        <aside
          className={`fixed inset-y-0 left-0 z-50 md:z-40 w-64 h-full bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out flex flex-col
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static md:h-auto`}
        >
          <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1">
            {visibleEntries.map((entry) => {
              if (!entry.children) {
                return (
                  <NavItem
                    key={entry.to}
                    item={entry}
                    active={location.pathname === entry.to}
                    badgeCount={entry.badgeKey === "pending" ? pendingCount : 0}
                    onNavigate={closeSidebar}
                  />
                );
              }

              const Icon = entry.icon;
              const open = !!openGroups[entry.key];
              const active = groupIsActive(entry, location.pathname);

              return (
                <div key={entry.key}>
                  <button
                    onClick={() => toggleGroup(entry.key)}
                    aria-expanded={open}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      active ? "text-jkuat-green" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={18} />
                    <span className="flex-1 text-left">{entry.label}</span>
                    <ChevronDown
                      size={15}
                      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  {open && (
                    <div className="mt-1 ml-5 pl-3 border-l border-gray-100 space-y-1">
                      {entry.children.map((child) => (
                        <NavItem
                          key={child.to}
                          item={child}
                          nested
                          active={location.pathname === child.to}
                          badgeCount={0}
                          onNavigate={closeSidebar}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
          <div className="shrink-0 px-3 py-4 border-t border-gray-100">
            <button
              onClick={logout}
              className="flex gap-2 w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              <LogOut /> Log out
            </button>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-30 md:hidden"
            onClick={closeSidebar}
          />
        )}

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <header className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20 shrink-0">
            <button onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <Menu size={22} />
            </button>
            <span className="font-bold text-sm text-jkuat-green">JKUAT Noticeboard Admin</span>
            <div className="w-[22px]" />
          </header>
          <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}