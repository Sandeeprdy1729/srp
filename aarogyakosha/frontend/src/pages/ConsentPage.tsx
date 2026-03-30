import { useState, useEffect } from 'react';
import { Shield, CheckCircle2, XCircle, Clock, Ban, Plus, X } from 'lucide-react';
import { consentApi } from '@/services/api';
import { Consent } from '@/types';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_MAP: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  granted: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  denied: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  revoked: { icon: Ban, color: 'text-gray-600', bg: 'bg-gray-100' },
  expired: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-50' },
};

const HI_TYPES = ['Prescription', 'DiagnosticReport', 'OPConsultation', 'DischargeSummary', 'ImmunizationRecord', 'WellnessRecord', 'HealthDocumentRecord'];

export default function ConsentPage() {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [hiTypes, setHiTypes] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const fetchConsents = () => {
    consentApi.list()
      .then(r => setConsents(Array.isArray(r.data) ? r.data : r.data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchConsents(); }, []);

  const handleCreate = async () => {
    if (!purpose) return toast.error('Enter a purpose');
    if (!hiTypes.length) return toast.error('Select at least one health info type');
    setCreating(true);
    try {
      await consentApi.create({ purpose, hi_types: hiTypes });
      toast.success('Consent request created');
      setShowCreate(false);
      setPurpose('');
      setHiTypes([]);
      fetchConsents();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to create consent');
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (id: string, action: 'grant' | 'deny' | 'revoke') => {
    try {
      if (action === 'grant') await consentApi.grant(id);
      else if (action === 'deny') await consentApi.deny(id);
      else await consentApi.revoke(id);
      toast.success(`Consent ${action}ed`);
      fetchConsents();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || `Failed to ${action} consent`);
    }
  };

  const toggleHiType = (t: string) => {
    setHiTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Consent Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Control access to your health data</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          New Consent
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
        <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-900">Your data, your control</p>
          <p className="text-xs text-blue-700 mt-0.5">Manage who can access your health information following ABDM guidelines.</p>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-3xl shadow-elevated w-full max-w-md p-8 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">New Consent Request</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded"><X className="h-4 w-4" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
              <input type="text" value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g., Dr. consultation" className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Health Info Types</label>
              <div className="flex flex-wrap gap-2">
                {HI_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => toggleHiType(t)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      hiTypes.includes(t) ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleCreate} disabled={creating} className="btn-primary w-full py-2.5">
              {creating ? 'Creating...' : 'Create Request'}
            </button>
          </div>
        </div>
      )}

      {/* Consent List */}
      {consents.length === 0 ? (
        <div className="card text-center py-16">
          <Shield className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-1">No consent records yet</p>
          <button onClick={() => setShowCreate(true)} className="text-sm text-gray-900 hover:underline font-medium">Create your first consent</button>
        </div>
      ) : (
        <div className="space-y-3">
          {consents.map(c => {
            const s = STATUS_MAP[c.status] || STATUS_MAP.pending;
            const Icon = s.icon;
            return (
              <div key={c.id} className="card p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                      <Icon className={`h-4 w-4 ${s.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{c.purpose}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-medium capitalize ${s.color}`}>{c.status}</span>
                        <span className="text-xs text-gray-400">
                          {c.created_at ? format(parseISO(c.created_at), 'dd MMM yyyy') : ''}
                        </span>
                      </div>
                      {c.hi_types?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {c.hi_types.map((t, i) => (
                            <span key={i} className="badge-gray text-[11px]">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {c.status === 'pending' && (
                      <>
                        <button onClick={() => handleAction(c.id, 'grant')} className="btn text-xs px-2.5 py-1.5 text-emerald-600 hover:bg-emerald-50">Grant</button>
                        <button onClick={() => handleAction(c.id, 'deny')} className="btn text-xs px-2.5 py-1.5 text-red-600 hover:bg-red-50">Deny</button>
                      </>
                    )}
                    {c.status === 'granted' && (
                      <button onClick={() => handleAction(c.id, 'revoke')} className="btn text-xs px-2.5 py-1.5 text-amber-600 hover:bg-amber-50">Revoke</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
