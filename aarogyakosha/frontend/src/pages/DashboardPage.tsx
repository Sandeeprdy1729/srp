import { useState, useEffect, useMemo } from 'react';
import { FileText, Upload, Share2, Users, Activity, Clock, TrendingUp, Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { DashboardStats } from '@/types';
import { parseISO, formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getStats()
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const statCards = [
    { label: 'Total Documents', value: stats?.total_documents ?? 0, icon: FileText, color: 'text-blue-600 bg-blue-50', to: '/documents' },
    { label: 'This Month', value: stats?.documents_this_month ?? 0, icon: Calendar, color: 'text-emerald-600 bg-emerald-50', to: '/upload' },
    { label: 'Active Shares', value: stats?.active_shares ?? 0, icon: Share2, color: 'text-violet-600 bg-violet-50', to: '/sharing' },
    { label: 'Family Members', value: stats?.family_members ?? 0, icon: Users, color: 'text-amber-600 bg-amber-50', to: '/family' },
  ];

  const quickActions = [
    { label: 'Upload Document', icon: Upload, to: '/upload', color: 'bg-gray-900 text-white hover:bg-black' },
    { label: 'View Records', icon: FileText, to: '/documents', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
    { label: 'Share Records', icon: Share2, to: '/sharing', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{greeting}, {user?.full_name?.split(' ')[0]}</h1>
        <p className="text-sm text-gray-500 mt-1">Here&apos;s an overview of your health vault</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(c => (
          <Link key={c.label} to={c.to} className="card card-hover p-6 group">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${c.color}`}>
                <c.icon className="h-4.5 w-4.5" />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="flex gap-3">
          {quickActions.map(a => (
            <Link key={a.label} to={a.to} className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${a.color}`}>
              <a.icon className="h-4 w-4" />
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
            <Link to="/documents" className="text-xs text-gray-900 hover:underline font-medium">View all</Link>
          </div>
          {stats?.recent_activities && stats.recent_activities.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_activities.slice(0, 5).map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Activity className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{a.title || a.action}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {a.timestamp ? formatDistanceToNow(parseISO(a.timestamp), { addSuffix: true }) : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No recent activity</p>
              <Link to="/upload" className="text-xs text-gray-900 hover:underline font-medium mt-1 inline-block">Upload your first document</Link>
            </div>
          )}
        </div>

        {/* Health Overview */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Health Overview</h2>
          <div className="space-y-4">
            {stats?.medications && stats.medications.length > 0 ? (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Medications</p>
                <div className="flex flex-wrap gap-1.5">
                  {stats.medications.map((m, i) => (
                    <span key={i} className="badge-blue">{m}</span>
                  ))}
                </div>
              </div>
            ) : null}
            {stats?.conditions && stats.conditions.length > 0 ? (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Conditions</p>
                <div className="flex flex-wrap gap-1.5">
                  {stats.conditions.map((c, i) => (
                    <span key={i} className="badge-yellow">{c}</span>
                  ))}
                </div>
              </div>
            ) : null}
            {(!stats?.medications?.length && !stats?.conditions?.length) && (
              <div className="text-center py-8">
                <TrendingUp className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Upload documents to see insights</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
