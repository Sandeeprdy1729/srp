import { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Calendar, LogOut, Shield, Heart } from 'lucide-react';


export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authApi.logout();
    } catch {}
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const infoItems = [
    { label: 'Full Name', value: user.full_name, icon: User },
    { label: 'Email', value: user.email, icon: Mail },
    { label: 'Phone', value: user.phone || 'Not set', icon: Phone },
    { label: 'Date of Birth', value: user.date_of_birth || 'Not set', icon: Calendar },
    { label: 'Gender', value: user.gender || 'Not set', icon: User },
    { label: 'Role', value: user.role, icon: Shield },
  ];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Profile</h1>

      {/* Avatar */}
      <div className="card p-8 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl font-bold text-gray-700">{user.full_name[0]?.toUpperCase()}</span>
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">{user.full_name}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
          {user.is_verified && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 mt-1">
              <Shield className="h-3 w-3" />Verified
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="card divide-y divide-gray-100">
        {infoItems.map(item => (
          <div key={item.label} className="flex items-center gap-4 px-6 py-3.5">
            <div className="w-9 h-9 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <item.icon className="h-4 w-4 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400">{item.label}</p>
              <p className="text-sm text-gray-900 capitalize">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ABHA */}
      {(user.abha_number || user.abha_address) && (
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Heart className="h-4 w-4 text-blue-600" />
            ABHA Details
          </h3>
          {user.abha_number && (
            <div className="mb-2">
              <p className="text-xs text-gray-400">ABHA Number</p>
              <p className="text-sm text-gray-900 font-mono">{user.abha_number}</p>
            </div>
          )}
          {user.abha_address && (
            <div>
              <p className="text-xs text-gray-400">ABHA Address</p>
              <p className="text-sm text-gray-900 font-mono">{user.abha_address}</p>
            </div>
          )}
        </div>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors text-sm font-medium"
      >
        <LogOut className="h-4 w-4" />
        {loggingOut ? 'Signing out...' : 'Sign Out'}
      </button>
    </div>
  );
}
