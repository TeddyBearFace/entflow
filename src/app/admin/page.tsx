"use client";

import { useState, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

interface Stats {
  users: any;
  portals: any;
  workflows: any;
  syncs: any;
  ai: any;
  revenue: any;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  const fetchStats = useCallback(async (pw?: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw || password }),
      });
      if (!res.ok) {
        setError(res.status === 401 ? "Wrong password" : "Failed to load");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setStats(data);
      setAuthenticated(true);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [password]);

  // Password gate
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-xs">
          <h1 className="text-xl font-bold text-white text-center mb-6">Admin Dashboard</h1>
          <form onSubmit={(e) => { e.preventDefault(); fetchStats(); }} className="space-y-3">
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password" autoFocus
              className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
              {loading ? "Loading..." : "Enter"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const TIER_COLORS: Record<string, string> = {
    FREE: "#94A3B8", STARTER: "#10B981", GROWTH: "#3B82F6", PRO: "#8B5CF6", ENTERPRISE: "#F59E0B",
  };
  const STATUS_COLORS: Record<string, string> = {
    ACTIVE: "#10B981", INACTIVE: "#94A3B8", ERRORING: "#EF4444",
  };
  const OBJ_COLORS: Record<string, string> = {
    CONTACT: "#3B82F6", DEAL: "#10B981", COMPANY: "#8B5CF6", TICKET: "#F59E0B", CUSTOM: "#94A3B8", UNKNOWN: "#6B7280",
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Entflow Admin</h1>
          <p className="text-xs text-gray-500">Real-time platform metrics</p>
        </div>
        <button onClick={() => fetchStats()} disabled={loading}
          className="px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50">
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Top KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPI label="Total Users" value={stats.users.total} sub={`+${stats.users.today} today`} />
          <KPI label="Active (7d)" value={stats.users.activeLast7d} sub={`${stats.users.activeLast30d} in 30d`} />
          <KPI label="Portals" value={stats.portals.total} />
          <KPI label="Workflows" value={stats.workflows.total.toLocaleString()} />
          <KPI label="MRR" value={`$${stats.revenue.mrr}`} sub={`${stats.revenue.activeSubs} subs`} color="text-emerald-400" />
          <KPI label="AI Calls" value={stats.ai.total} sub={`+${stats.ai.today} today`} color="text-violet-400" />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Signups timeline */}
          <ChartCard title="New Users (30d)" subtitle={`${stats.users.thisMonth} this month`}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.users.signupTimeline}>
                <defs>
                  <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6B7280" }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#3B82F6" fill="url(#signupGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Sync activity */}
          <ChartCard title="Sync Activity (30d)" subtitle={`${stats.syncs.successRate}% success rate · avg ${(stats.syncs.avgDurationMs / 1000).toFixed(1)}s`}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.syncs.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6B7280" }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="completed" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="failed" stackId="a" fill="#EF4444" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Portals by tier */}
          <ChartCard title="Portals by Plan">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={stats.portals.byTier} dataKey="count" nameKey="tier" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2}>
                  {stats.portals.byTier.map((t: any) => (
                    <Cell key={t.tier} fill={TIER_COLORS[t.tier] || "#6B7280"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 px-4 pb-3">
              {stats.portals.byTier.map((t: any) => (
                <span key={t.tier} className="text-[10px] font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: TIER_COLORS[t.tier] || "#6B7280" }} />
                  {t.tier} ({t.count})
                </span>
              ))}
            </div>
          </ChartCard>

          {/* Workflows by status */}
          <ChartCard title="Workflow Status">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={stats.workflows.byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2}>
                  {stats.workflows.byStatus.map((s: any) => (
                    <Cell key={s.status} fill={STATUS_COLORS[s.status] || "#6B7280"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 px-4 pb-3">
              {stats.workflows.byStatus.map((s: any) => (
                <span key={s.status} className="text-[10px] font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[s.status] || "#6B7280" }} />
                  {s.status} ({s.count})
                </span>
              ))}
            </div>
          </ChartCard>

          {/* Workflows by object type */}
          <ChartCard title="Object Types">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={stats.workflows.byObjectType} dataKey="count" nameKey="type" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2}>
                  {stats.workflows.byObjectType.map((t: any) => (
                    <Cell key={t.type} fill={OBJ_COLORS[t.type] || "#6B7280"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 px-4 pb-3">
              {stats.workflows.byObjectType.map((t: any) => (
                <span key={t.type} className="text-[10px] font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: OBJ_COLORS[t.type] || "#6B7280" }} />
                  {t.type} ({t.count})
                </span>
              ))}
            </div>
          </ChartCard>

          {/* AI usage */}
          <ChartCard title="AI Analysis (30d)" subtitle={`${stats.ai.thisWeek} this week`}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stats.ai.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#6B7280" }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 9, fill: "#6B7280" }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#8B5CF6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent signups */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <h3 className="text-sm font-bold">Recent Signups</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-2">User</th>
                    <th className="px-4 py-2">Provider</th>
                    <th className="px-4 py-2">Portals</th>
                    <th className="px-4 py-2">Signed up</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {stats.users.recentSignups.map((u: any) => (
                    <tr key={u.id} className="hover:bg-gray-800/30">
                      <td className="px-4 py-2.5">
                        <div>
                          <p className="text-xs font-medium text-white truncate max-w-[180px]">{u.name || "—"}</p>
                          <p className="text-[10px] text-gray-500 truncate max-w-[180px]">{u.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          {u.providers.length === 0 && <Badge label="email" color="bg-gray-700" />}
                          {u.providers.map((p: string) => (
                            <Badge key={p} label={p} color={p === "google" ? "bg-blue-900/50 text-blue-300" : p === "github" ? "bg-gray-700" : "bg-orange-900/50 text-orange-300"} />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{u.portalCount}</td>
                      <td className="px-4 py-2.5 text-[10px] text-gray-500">{timeAgo(new Date(u.createdAt))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Portals list */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <h3 className="text-sm font-bold">Portals</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-2">Portal</th>
                    <th className="px-4 py-2">Plan</th>
                    <th className="px-4 py-2">WFs</th>
                    <th className="px-4 py-2">Sync</th>
                    <th className="px-4 py-2">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {stats.portals.list.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-800/30">
                      <td className="px-4 py-2.5">
                        <p className="text-xs font-medium text-white truncate max-w-[150px]">{p.name || `Portal ${p.hubspotPortalId}`}</p>
                        <p className="text-[10px] text-gray-500">ID: {p.hubspotPortalId}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${TIER_COLORS[p.planTier] || "#6B7280"}20`, color: TIER_COLORS[p.planTier] || "#6B7280" }}>
                          {p.planTier}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{p.workflowCount}</td>
                      <td className="px-4 py-2.5">
                        <span className={`w-2 h-2 rounded-full inline-block ${
                          p.syncStatus === "COMPLETED" ? "bg-emerald-500" :
                          p.syncStatus === "SYNCING" ? "bg-blue-500 animate-pulse" :
                          p.syncStatus === "FAILED" ? "bg-red-500" : "bg-gray-600"
                        }`} />
                      </td>
                      <td className="px-4 py-2.5 text-[10px] text-gray-500">{timeAgo(new Date(p.createdAt))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Revenue breakdown */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-bold mb-3">Revenue</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-2xl font-bold text-emerald-400">${stats.revenue.mrr}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Monthly MRR</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">${stats.revenue.mrr * 12}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Annual Run Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.revenue.activeSubs}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Active Subscriptions</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.revenue.paidPortals}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Paid Portals</p>
            </div>
          </div>
        </div>

        {/* Sync stats */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-bold mb-3">Sync Health</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div>
              <p className="text-2xl font-bold text-white">{stats.syncs.total}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Total Syncs</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">{stats.syncs.completed}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{stats.syncs.failed}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Failed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">{stats.syncs.successRate}%</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Success Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{(stats.syncs.avgDurationMs / 1000).toFixed(1)}s</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Avg Duration</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Helper components ---

function KPI({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color || "text-white"}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="text-xs font-bold">{title}</h3>
        {subtitle && <p className="text-[10px] text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${color}`}>{label}</span>;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}
