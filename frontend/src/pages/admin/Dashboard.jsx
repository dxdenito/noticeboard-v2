import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  PlusCircle, CalendarPlus, CheckSquare, FileText, CalendarDays, LayoutList, Pin,
  Users, Tags, Network, Building2, ScrollText, Mail, AlertCircle, ArrowRight, Send
} from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import {
  isAdmin, canApprove, canManageUsers, canCreateCategories, canPin, canManageOrgUnits,
  isCorporateSuperAdmin, canViewAuditLog, canViewAllNotices, canViewAllEvents,
  canManageInstitutionalDomains,canSendDigest
} from "../../lib/permissions";

const QUICK_LINKS = [
  { to: "/dashboard/post", label: "Post Notice", icon: PlusCircle, show: isAdmin },
  { to: "/dashboard/post-event", label: "Post Event", icon: CalendarPlus, show: isAdmin },
  { to: "/dashboard/my-notices", label: "My Notices", icon: FileText, show: isAdmin },
  { to: "/dashboard/my-events", label: "My Events", icon: CalendarDays, show: isAdmin },
  { to: "/dashboard/review-queue", label: "Review Queue", icon: CheckSquare, show: canApprove },
  { to: "/dashboard/email-digest", label: "Email Digest", icon: Send, show: canSendDigest },  
  { to: "/dashboard/all-notices", label: "All Notices", icon: LayoutList, show: canViewAllNotices },
  { to: "/dashboard/all-events", label: "All Events", icon: LayoutList, show: canViewAllEvents },
  { to: "/dashboard/pinned", label: "Pinned Notices", icon: Pin, show: canPin },
  { to: "/dashboard/users", label: "Manage Users", icon: Users, show: canManageUsers },
  { to: "/dashboard/corporate-admins", label: "Corporate Admins", icon: Building2, show: isCorporateSuperAdmin },
  { to: "/dashboard/tags", label: "Manage Tags", icon: Tags, show: canCreateCategories },
  { to: "/dashboard/org-units", label: "Org Units", icon: Network, show: canManageOrgUnits },
  { to: "/dashboard/institutional-domains", label: "Institutional Domains", icon: Mail, show: canManageInstitutionalDomains },
  { to: "/dashboard/audit-log", label: "Audit Log", icon: ScrollText, show: canViewAuditLog },
];

const EMPTY_DATA = {
  myNotices: null, myEvents: null,
  pendingNotices: null, pendingEvents: null,
  allNotices: null, allEvents: null,
  sitePinned: null, feedPinned: null,
  orgUnitCount: null, recent: null,
  digest: null,
};

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

async function safe(request) {
  try {
    return await request;
  } catch {
    return null;
  }
}

function StatCard({ label, value, to, accent }) {
  const accentStyles = {
    green: "text-jkuat-green",
    amber: "text-amber-600",
    red: "text-jkuat-red",
  };
  const base = "bg-white border border-gray-200 rounded-lg p-4";
  const body = (
    <>
      <p className={`text-2xl font-extrabold ${accent ? accentStyles[accent] : "text-gray-900"}`}>
        {value ?? "–"}
      </p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </>
  );
  if (to) {
    return (
      <Link to={to} className={`${base} block hover:border-jkuat-green hover:shadow-sm transition-all`}>
        {body}
      </Link>
    );
  }
  return <div className={base}>{body}</div>;
}

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-xs font-bold text-gray-500 uppercase mb-3">{title}</h2>
      {children}
    </section>
  );
}

function ContentStats({ counts, to }) {
  const pending = counts?.pending;
  const rejected = counts?.rejected;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Total" value={counts?.total} to={to} />
      <StatCard label="Published" value={counts?.approved} accent="green" to={to} />
      <StatCard label="Pending review" value={pending} accent={pending > 0 ? "amber" : undefined} to={to} />
      <StatCard label="Rejected" value={rejected} accent={rejected > 0 ? "red" : undefined} to={to} />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      const [
        myNotices, myEvents, pendingNotices, pendingEvents,
        allNotices, allEvents, manage, orgUnits, recent, digest,
      ] = await Promise.all([
        safe(api.get("/notices/mine/counts")),
        safe(api.get("/events/mine/counts")),
        canApprove(user) ? safe(api.get("/notices/pending/count")) : null,
        canApprove(user) ? safe(api.get("/events/pending/count")) : null,
        canViewAllNotices(user) ? safe(api.get("/notices/all/counts")) : null,
        canViewAllEvents(user) ? safe(api.get("/events/all/counts")) : null,
        canPin(user) ? safe(api.get("/notices/manage")) : null,
        canManageOrgUnits(user) ? safe(api.get("/org-units/")) : null,
        canViewAuditLog(user) ? safe(api.get("/audit-logs/?limit=6")) : null,
        canSendDigest(user) ? safe(api.get("/digest/overview")) : null,
      ]);

      if (cancelled) return;

      setData({
        myNotices,
        myEvents,
        pendingNotices: pendingNotices ? pendingNotices.count : null,
        pendingEvents: pendingEvents ? pendingEvents.count : null,
        allNotices,
        allEvents,
        sitePinned: Array.isArray(manage) ? manage.filter((n) => n.is_pinned_site).length : null,
        feedPinned: Array.isArray(manage) ? manage.filter((n) => n.is_pinned_feed).length : null,
        orgUnitCount: Array.isArray(orgUnits) ? orgUnits.length : null,
        recent,
        digest,
      });
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [user]);

  if (loading) return <div className="text-gray-400">Loading...</div>;

  const attention = [];
  if (data.myNotices?.rejected > 0) {
    attention.push({
      key: "rn",
      text: `${plural(data.myNotices.rejected, "notice")} of yours ${data.myNotices.rejected === 1 ? "was" : "were"} rejected`,
      to: "/dashboard/my-notices",
    });
  }
  if (data.myEvents?.rejected > 0) {
    attention.push({
      key: "re",
      text: `${plural(data.myEvents.rejected, "event")} of yours ${data.myEvents.rejected === 1 ? "was" : "were"} rejected`,
      to: "/dashboard/my-events",
    });
  }
  if (data.pendingNotices > 0) {
    attention.push({
      key: "pn",
      text: `${plural(data.pendingNotices, "notice")} waiting for your review`,
      to: "/dashboard/review-queue",
    });
  }
  if (data.pendingEvents > 0) {
    attention.push({
      key: "pe",
      text: `${plural(data.pendingEvents, "event")} waiting for your review`,
      to: "/dashboard/review-queue",
    });
  }

  const visibleLinks = QUICK_LINKS.filter((link) => link.show(user));
  const showSiteSection = canViewAllNotices(user) || canPin(user) || canManageOrgUnits(user);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">
        Welcome back, {user.full_name}
      </h1>
      <p className="text-sm text-gray-500 mb-6 capitalize">{user.role.name.replace(/_/g, " ")}</p>

      {attention.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 space-y-2">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-800">
            <AlertCircle size={16} /> Needs your attention
          </p>
          {attention.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              className="flex items-center justify-between text-sm text-amber-900 hover:underline"
            >
              <span>{item.text}</span>
              <ArrowRight size={14} />
            </Link>
          ))}
        </div>
      )}

      <Section title="My notices">
        <ContentStats counts={data.myNotices} to="/dashboard/my-notices" />
      </Section>

      <Section title="My events">
        <ContentStats counts={data.myEvents} to="/dashboard/my-events" />
      </Section>

      {canApprove(user) && (
        <Section title="Awaiting your review">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Notices"
              value={data.pendingNotices}
              accent={data.pendingNotices > 0 ? "red" : undefined}
              to="/dashboard/review-queue"
            />
            <StatCard
              label="Events"
              value={data.pendingEvents}
              accent={data.pendingEvents > 0 ? "red" : undefined}
              to="/dashboard/review-queue"
            />
          </div>
        </Section>
      )}
      {canSendDigest(user) && data.digest && (
        <Section title="Email digest">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Last weekly digest"
              value={
                data.digest.last_digest
                  ? new Date(data.digest.last_digest.started_at).toLocaleDateString("default", { day: "numeric", month: "short" })
                  : "None yet"
              }
              to="/dashboard/email-digest"
            />
            <StatCard
              label="Next automatic send"
              value={
                data.digest.next_run
                  ? new Date(data.digest.next_run).toLocaleDateString("default", { weekday: "short", day: "numeric", month: "short" })
                  : "Off"
              }
              to="/dashboard/email-digest"
            />
            <StatCard
              label="Notices waiting to be emailed"
              value={data.digest.pending_notice_count}
              accent={data.digest.pending_notice_count > 0 ? "amber" : undefined}
              to="/dashboard/email-digest"
            />
          </div>
        </Section>
      )}

      {showSiteSection && (
        <Section title="Across the site">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {canViewAllNotices(user) && (
              <StatCard label="All notices" value={data.allNotices?.total} to="/dashboard/all-notices" />
            )}
            {canViewAllEvents(user) && (
              <StatCard label="All events" value={data.allEvents?.total} to="/dashboard/all-events" />
            )}
            {canPin(user) && (
              <>
                <StatCard label="Pinned to site" value={data.sitePinned} to="/dashboard/pinned" />
                <StatCard label="Pinned to feed" value={data.feedPinned} to="/dashboard/pinned" />
              </>
            )}
            {canManageOrgUnits(user) && (
              <StatCard label="Org units" value={data.orgUnitCount} to="/dashboard/org-units" />
            )}
          </div>
        </Section>
      )}

      <Section title="Quick actions">
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
      </Section>

      {canViewAuditLog(user) && Array.isArray(data.recent) && (
        <Section title="Recent activity">
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {data.recent.map((log) => (
              <div key={log.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0 truncate">
                  <span className="text-gray-500">{log.actor?.full_name || "System"}</span>{" "}
                  <span className="font-bold text-gray-700">{log.action}</span>{" "}
                  <span className="text-gray-600">{log.target_label || `${log.target_type} #${log.target_id}`}</span>
                </div>
                <span className="text-gray-400 shrink-0">{new Date(log.created_at).toLocaleString()}</span>
              </div>
            ))}
            {data.recent.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-4">No activity yet.</p>
            )}
          </div>
          <Link
            to="/dashboard/audit-log"
            className="inline-flex items-center gap-1 text-xs font-semibold text-jkuat-green mt-2 hover:underline"
          >
            View full audit log <ArrowRight size={12} />
          </Link>
        </Section>
      )}
    </div>
  );
}