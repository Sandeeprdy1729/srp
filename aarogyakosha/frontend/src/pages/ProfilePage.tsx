import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Calendar, LogOut, Shield, Heart, Globe } from 'lucide-react';

const LANGUAGES: Record<string, string> = {
  en: 'English', hi: 'Hindi', bn: 'Bengali', ta: 'Tamil', te: 'Telugu',
  mr: 'Marathi', ml: 'Malayalam', kn: 'Kannada', gu: 'Gujarati', pa: 'Punjabi',
  or: 'Odia', as: 'Assamese', ne: 'Nepali', sd: 'Sindhi', si: 'Sinhala',
  ur: 'Urdu', ar: 'Arabic', fr: 'French', de: 'German', es: 'Spanish',
  pt: 'Portuguese', ru: 'Russian', zh: 'Chinese', ja: 'Japanese', ko: 'Korean'
};

export default function ProfilePage() {
  const { user, setUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [savingLang, setSavingLang] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en');

  useEffect(() => {
    if (user?.preferences?.preferred_language) {
      setSelectedLang(user.preferences.preferred_language);
    }
  }, [user]);

  const handleLanguageChange = async () => {
    if (!user) return;
    setSavingLang(true);
    try {
      const newPrefs = { ...user.preferences, preferred_language: selectedLang };
      await authApi.updateMe({ preferences: newPrefs });
      setUser({ ...user, preferences: newPrefs });
    } catch (e) {
      console.error('Failed to save language preference', e);
    }
    setSavingLang(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authApi.logout();
    } catch {}
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Profile</h1>

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

      <div className="card divide-y divide-gray-100">
        <div className="flex items-center gap-4 px-6 py-3.5">
          <div className="w-9 h-9 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400">Full Name</p>
            <p className="text-sm text-gray-900">{user.full_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 px-6 py-3.5">
          <div className="w-9 h-9 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Mail className="h-4 w-4 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400">Email</p>
            <p className="text-sm text-gray-900">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 px-6 py-3.5">
          <div className="w-9 h-9 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Phone className="h-4 w-4 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400">Phone</p>
            <p className="text-sm text-gray-900">{user.phone || 'Not set'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 px-6 py-3.5">
          <div className="w-9 h-9 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Calendar className="h-4 w-4 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400">Date of Birth</p>
            <p className="text-sm text-gray-900">{user.date_of_birth || 'Not set'}</p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Globe className="h-4 w-4 text-blue-600" />
          Preferred Language
        </h3>
        <div className="flex gap-3">
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            className="input flex-1"
          >
            {Object.entries(LANGUAGES).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
          <button
            onClick={handleLanguageChange}
            disabled={savingLang || selectedLang === user.preferences?.preferred_language}
            className="btn-secondary"
          >
            {savingLang ? 'Saving...' : 'Save'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          AI analysis will be translated to your preferred language
        </p>
      </div>

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
