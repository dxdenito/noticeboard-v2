// src/pages/dashboard/DashboardHome.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PlusCircle, CheckSquare, FileText, Pin, Users, Tags, Network, Building2, ScrollText } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  isAdmin, canApprove, canManageUsers, canCreateCategories, canPin,
  canManageOrgUnits, isCorporateSuperAdmin, canViewAuditLog,
} from "../../lib/permissions";

const QUICK_LINKS = [
  { to: "/dashboard/post", label: "Post Notice", icon: PlusCircle, show: isAdmin },
  { to: "/dashboard/my-notices", label: "My Notices", icon: FileText, show: isAdmin },
  { to: "/dashboard/review-queue", label: "Review Queue", icon: CheckSquare, show: canApprove },
  { to: "/dashboard/pinned", label: "Pinned Notices", icon: Pin, show: canPin },
  { to: "/dashboard/users", label: "Manage Users", icon: Users, show: canManageUsers },
  { to: "/dashboard/corporate-admins", label: "Corporate Admins", icon: Building2, show: isCorporateSuperAdmin },
  { to: "/dashboard/tags", label: "Manage Tags", icon: Tags, show: canCreateCategories },
  { to: "/dashboard/org-units", label: "Org Units", icon: Network, show: canManageOrgUnits },
  { to: "/dashboard/audit-log", label: "Audit Log", icon: ScrollText, show: canViewAuditLog },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { showError } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const mine = await api.get("/notices/mine");
        const next = {
          myTotal: mine.length,
          myPending: mine.filter((n) => n.status === "pending").length,
          myApproved: mine.filter((n) => n.status === "approved").length,
        };

        if (canApprove(user)) {
          const pending = await api.get("/notices/pending");
          next.pendingReview = pending.length;
        }

        if (canPin(user)) {
          const all = await api.get("/notices/manage");
          next.sitePinned = all.filter((n) => n.is_pinned_site).length;
          next.feedPinned = all.filter((n) => n.is_pinned_feed).length;
        }

        setStats(next);
      } catch (err) {
        showError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (user) loadStats();
  }, [user]);

  const visibleLinks = QUICK_LINKS.filter((link) => link.show(user));

  if (loading || !stats) return <div className="text-gray-400">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">
        Welcome back, {user.full_name}
      </h1>
      <p className="text-sm text-gray-500 mb-6 capitalize">{user.role.name.replace(/_/g, " ")}</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="My Notices" value={stats.myTotal} />
        <StatCard label="My Pending" value={stats.myPending} accent={stats.myPending > 0 ? "amber" : undefined} />
        <StatCard label="My Approved" value={stats.myApproved} accent="green" />

        {stats.pendingReview !== undefined && (
          <StatCard label="Awaiting Review" value={stats.pendingReview} accent={stats.pendingReview > 0 ? "red" : undefined} />
        )}
        {stats.sitePinned !== undefined && (
          <>
            <StatCard label="Pinned to Site" value={stats.sitePinned} />
            <StatCard label="Pinned to Feed" value={stats.feedPinned} />
          </>
        )}
      </div>

      <h2 className="text-xs font-bold text-gray-500 uppercase mb-3">Quick Actions</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {visibleLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              to={link.to}
              className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3 hover:border-jkuat-green hover:shadow-sm transition-all"
            >
              <Icon size={20} className="text-jkuat-green shrink-0" />
              <span className="text-sm font-semibold text-gray-900">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  const accentStyles = {
    green: "text-jkuat-green",
    amber: "text-amber-600",
    red: "text-jkuat-red",
  };
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className={`text-2xl font-extrabold ${accent ? accentStyles[accent] : "text-gray-900"}`}>
        {value}
      </p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}