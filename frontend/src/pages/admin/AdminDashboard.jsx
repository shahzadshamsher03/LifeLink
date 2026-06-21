import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Droplets,
  Building2,
  UserCheck,
  ArrowRight,
  Radio,
  ClipboardList,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { getAdminStats } from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import StatCard from '../../components/dashboard/StatCard';
import { DashboardError, DashboardLoading } from '../../components/dashboard/DashboardState';
import StatusBadge from '../../components/requests/StatusBadge';
import { roleLabels } from '../../utils/roleConfig';

const CHART_COLORS = ['#8b5cf6', '#f43f5e', '#10b981', '#0ea5e9', '#f59e0b', '#64748b'];
const STATUS_COLORS = { pending: '#f59e0b', accepted: '#10b981', rejected: '#ef4444' };
const ROLE_COLORS = {
  user: '#0ea5e9',
  donor: '#f43f5e',
  hospital: '#10b981',
  admin: '#8b5cf6',
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const { connected, subscribeToAdminStats } = useSocket();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const { data: res } = await getAdminStats();
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const unsubscribe = subscribeToAdminStats(() => {
      fetchStats(true);
    });
    return unsubscribe;
  }, [subscribeToAdminStats, fetchStats]);

  if (loading) return <DashboardLoading />;
  if (error) return <DashboardError message={error} onRetry={() => fetchStats()} />;

  const stats = data?.stats || {};
  const charts = data?.charts || {};
  const recentUsers = data?.recentUsers || [];
  const recentRequests = data?.recentRequests || [];

  const bloodGroupData = charts.donorsByBloodGroup || [];
  const roleData = (charts.usersByRole || []).map((r) => ({
    name: roleLabels[r.role]?.label || r.role,
    value: r.count,
    role: r.role,
  }));
  const requestStatusData = (charts.requestStatusBreakdown || []).map((r) => ({
    name: r.status,
    value: r.count,
    status: r.status,
  }));

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 p-6 sm:p-8 text-white shadow-xl shadow-violet-500/25"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12),_transparent_50%)]" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-violet-200 text-sm font-medium">LifeLink Admin</p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">Control center</h1>
            <p className="text-violet-100/90 mt-2 text-sm">
              Signed in as {user?.name} · Live analytics from MongoDB
            </p>
          </div>
          {connected && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-xs font-semibold">
              <Radio className="w-3.5 h-3.5" />
              Live updates
            </span>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={stats.totalUsers ?? 0} icon={Users} accent="sky" delay={0.05} />
        <StatCard title="Total Donors" value={stats.totalDonors ?? 0} icon={Droplets} accent="rose" delay={0.1} />
        <StatCard title="Total Hospitals" value={stats.totalHospitals ?? 0} icon={Building2} accent="emerald" delay={0.15} />
        <StatCard
          title="Active Users"
          value={stats.activeUsers ?? 0}
          subtitle="Not blocked"
          icon={UserCheck}
          accent="violet"
          delay={0.2}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Broadcasts" value={stats.totalBroadcastRequests ?? 0} icon={Radio} accent="rose" delay={0.05} />
        <StatCard title="Active Broadcasts" value={stats.activeBroadcastRequests ?? 0} icon={Droplets} accent="amber" delay={0.1} />
        <StatCard title="Resolved Broadcasts" value={stats.resolvedBroadcastRequests ?? 0} icon={UserCheck} accent="emerald" delay={0.15} />
        <StatCard title="Deleted Broadcasts" value={stats.deletedBroadcastRequests ?? 0} icon={Trash2} accent="violet" delay={0.2} />
        <StatCard title="Total Volunteers" value={stats.totalVolunteers ?? 0} icon={UserCheck} accent="sky" delay={0.25} />
      </div>

      {/* AI PRIORITY SCORING HUB */}
      <div className="space-y-4 p-6 rounded-3xl border border-white/60 bg-white/40 backdrop-blur-xl shadow-soft">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Droplets className="w-5 h-5 text-rose-600 animate-pulse" />
          AI Priority Analysis Metrics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="Critical Requests" value={stats.criticalRequestsCount ?? 0} icon={AlertTriangle} accent="rose" delay={0.05} />
          <StatCard title="High Priority Requests" value={stats.highRequestsCount ?? 0} icon={AlertTriangle} accent="amber" delay={0.1} />
          <StatCard 
            title="Emergency Priority (Critical/High)" 
            value={(stats.emergencyPriorityDemand?.Critical ?? 0) + (stats.emergencyPriorityDemand?.High ?? 0)} 
            subtitle={`Critical: ${stats.emergencyPriorityDemand?.Critical ?? 0} · High: ${stats.emergencyPriorityDemand?.High ?? 0}`}
            icon={Building2} 
            accent="violet" 
            delay={0.15} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Chart 1: Donors by blood group */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-5 shadow-soft"
        >
          <h3 className="font-semibold text-slate-900 text-sm">Donors by blood group</h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">Registered donors</p>
          {bloodGroupData.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">No donor data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bloodGroupData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="bloodGroup" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="count" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Chart 2: Users by role */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-5 shadow-soft"
        >
          <h3 className="font-semibold text-slate-900 text-sm">Users by role</h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">Platform distribution</p>
          {roleData.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">No user data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={roleData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={72}
                  label={false}
                >
                  {roleData.map((entry) => (
                    <Cell key={entry.role} fill={ROLE_COLORS[entry.role] || CHART_COLORS[0]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Chart 3: Request status */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-5 shadow-soft"
        >
          <h3 className="font-semibold text-slate-900 text-sm">Request status</h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            {stats.totalRequests ?? 0} total requests
          </p>
          {requestStatusData.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">No requests yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={requestStatusData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {requestStatusData.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={STATUS_COLORS[entry.status] || '#94a3b8'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Chart 4: Blood group demand */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-5 shadow-soft"
        >
          <h3 className="font-semibold text-slate-900 text-sm">Blood group demand</h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">Broadcast requests by blood group</p>
          {!stats.bloodGroupDemand || Object.keys(stats.bloodGroupDemand || {}).length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">No demand data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={Object.entries(stats.bloodGroupDemand || {}).map(([bloodGroup, count]) => ({ bloodGroup, count }))} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="bloodGroup" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Chart 5: Requests by priority level */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-5 shadow-soft"
        >
          <h3 className="font-semibold text-slate-900 text-sm">Requests by priority level</h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">AI priority scoring distribution</p>
          {!charts.requestsByPriorityLevel || charts.requestsByPriorityLevel.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">No request data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={charts.requestsByPriorityLevel.map((r) => ({
                    name: r.priorityLevel,
                    value: r.count,
                    level: r.priorityLevel,
                  }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={72}
                  label={false}
                >
                  {charts.requestsByPriorityLevel.map((entry) => {
                    const colors = {
                      Critical: '#ef4444',
                      High: '#f97316',
                      Medium: '#eab308',
                      Low: '#22c55e',
                    };
                    return <Cell key={entry.priorityLevel} fill={colors[entry.priorityLevel] || '#64748b'} />;
                  })}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-soft overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <h2 className="font-semibold text-slate-900">Recent users</h2>
              <p className="text-sm text-slate-500 mt-0.5">Latest registrations</p>
            </div>
            <Link
              to="/users"
              className="inline-flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-700"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentUsers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                      No users yet
                    </td>
                  </tr>
                ) : (
                  recentUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3">
                        <p className="font-medium text-slate-900">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                            roleLabels[u.role]?.color || ''
                          }`}
                        >
                          {roleLabels[u.role]?.label || u.role}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.isBlocked
                              ? 'bg-red-100 text-red-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {u.isBlocked ? 'Blocked' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-soft overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-violet-600" />
                Recent activity
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">Latest blood requests</p>
            </div>
          </div>
          <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {recentRequests.length === 0 ? (
              <li className="px-6 py-8 text-center text-slate-500 text-sm">No requests yet</li>
            ) : (
              recentRequests.map((r) => (
                <li key={r._id} className="px-6 py-3 hover:bg-slate-50/50">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {r.requesterName} → {r.donorName}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {r.bloodGroup}
                        {r.emergency && (
                          <span className="ml-2 text-amber-600 font-medium">Emergency</span>
                        )}
                        {r.priorityLevel && (
                          <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            r.priorityLevel === 'Critical'
                              ? 'bg-red-50 border-red-100 text-red-600'
                              : r.priorityLevel === 'High'
                              ? 'bg-orange-50 border-orange-100 text-orange-600'
                              : r.priorityLevel === 'Medium'
                              ? 'bg-amber-50 border-amber-100 text-amber-600'
                              : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                          }`}>
                            {r.priorityLevel}
                          </span>
                        )}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}
                  </p>
                </li>
              ))
            )}
          </ul>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
