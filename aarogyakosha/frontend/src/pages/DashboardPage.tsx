import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Upload, 
  TrendingUp, 
  Clock,
  AlertCircle,
  Activity,
  Pill,
  Heart
} from 'lucide-react';
import { dashboardApi, patientsApi } from '@/services/api';
import type { DashboardStats, Patient } from '@/types';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, patientsRes] = await Promise.all([
          dashboardApi.getStats(),
          patientsApi.list(),
        ]);
        setStats(statsRes.data);
        setPatients(patientsRes.data);
      } catch (error) {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Your health at a glance</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Documents"
          value={stats?.total_documents || 0}
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="This Month"
          value={stats?.documents_this_month || 0}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Pending"
          value={stats?.pending_documents || 0}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="Active Patients"
          value={patients.length}
          icon={Heart}
          color="purple"
        />
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/upload"
          className="card-hover flex items-center gap-4"
        >
          <div className="p-3 bg-primary-100 rounded-lg">
            <Upload className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Upload Document</h3>
            <p className="text-sm text-gray-500">Add new medical records</p>
          </div>
        </Link>
        
        <Link
          to="/documents"
          className="card-hover flex items-center gap-4"
        >
          <div className="p-3 bg-green-100 rounded-lg">
            <FileText className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">View Records</h3>
            <p className="text-sm text-gray-500">Browse all documents</p>
          </div>
        </Link>
        
        <Link
          to="/sharing"
          className="card-hover flex items-center gap-4"
        >
          <div className="p-3 bg-purple-100 rounded-lg">
            <Activity className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Health Summary</h3>
            <p className="text-sm text-gray-500">View AI insights</p>
          </div>
        </Link>
      </div>
      
      {/* Recent Activity */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        {stats?.recent_activities.length ? (
          <div className="space-y-4">
            {stats.recent_activities.slice(0, 5).map((activity, index) => (
              <div key={index} className="flex items-center gap-4 py-3 border-b last:border-0">
                <div className={`p-2 rounded-lg ${
                  activity.document_type === 'lab_report' ? 'bg-blue-100' :
                  activity.document_type === 'prescription' ? 'bg-green-100' :
                  'bg-gray-100'
                }`}>
                  <FileText className={`h-4 w-4 ${
                    activity.document_type === 'lab_report' ? 'text-blue-600' :
                    activity.document_type === 'prescription' ? 'text-green-600' :
                    'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                  <p className="text-xs text-gray-500">
                    {activity.action} • {new Date(activity.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No recent activity</p>
            <Link to="/upload" className="text-primary-600 hover:text-primary-700 text-sm">
              Upload your first document
            </Link>
          </div>
        )}
      </div>
      
      {/* Health Overview */}
      {patients.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Medications</h2>
            {patients[0]?.current_medications?.length ? (
              <ul className="space-y-3">
                {patients[0].current_medications.map((med, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <Pill className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-gray-700">{med}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No medications recorded</p>
            )}
          </div>
          
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Health Conditions</h2>
            {patients[0]?.medical_conditions?.length ? (
              <ul className="space-y-3">
                {patients[0].medical_conditions.map((condition, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-gray-700">{condition}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No conditions recorded</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: number; 
  icon: any; 
  color: string; 
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600',
  };
  
  return (
    <div className="card">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{title}</p>
        </div>
      </div>
    </div>
  );
}
