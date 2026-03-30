import { useState, useEffect } from 'react';
import { Users, X, Trash2, Eye, Upload as UploadIcon, UserPlus } from 'lucide-react';
import { familyApi, patientsApi } from '@/services/api';
import { FamilyAccess, Patient } from '@/types';
import toast from 'react-hot-toast';

export default function FamilyPage() {
  const [members, setMembers] = useState<FamilyAccess[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState('');
  const [patientId, setPatientId] = useState('');
  const [canView, setCanView] = useState(true);
  const [canUpload, setCanUpload] = useState(false);
  const [adding, setAdding] = useState(false);

  const fetchMembers = () => {
    familyApi.list()
      .then(r => setMembers(Array.isArray(r.data) ? r.data : r.data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMembers();
    patientsApi.list().then(r => {
      const list = Array.isArray(r.data) ? r.data : r.data.items || [];
      setPatients(list);
      if (list.length > 0) setPatientId(list[0].id);
    }).catch(() => {});
  }, []);

  const handleAdd = async () => {
    if (!email) return toast.error('Enter an email');
    if (!patientId) return toast.error('No patient profile available');
    setAdding(true);
    try {
      await familyApi.add({ member_email: email, patient_id: patientId, can_view: canView, can_upload: canUpload });
      toast.success('Family member added');
      setShowAdd(false);
      setEmail('');
      fetchMembers();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Could not add member');
    } finally {
      setAdding(false);
    }
  };

  const togglePermission = async (member: FamilyAccess, field: 'can_view' | 'can_upload') => {
    try {
      await familyApi.update(member.id, { [field]: !member[field] });
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, [field]: !m[field] } : m));
    } catch {
      toast.error('Update failed');
    }
  };

  const removeMember = async (id: string) => {
    if (!confirm('Remove this family member?')) return;
    try {
      await familyApi.remove(id);
      toast.success('Member removed');
      fetchMembers();
    } catch {
      toast.error('Remove failed');
    }
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
          <h1 className="text-xl font-bold text-gray-900">Family</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage family member access</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5">
          <UserPlus className="h-4 w-4" />
          Add Member
        </button>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-3xl shadow-elevated w-full max-w-md p-8 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Add Family Member</h2>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-gray-100 rounded"><X className="h-4 w-4" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Member's Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="family@example.com" className="input" />
            </div>
            {patients.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient Profile</label>
                <select value={patientId} onChange={e => setPatientId(e.target.value)} className="input">
                  {patients.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
                </select>
              </div>
            )}
            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={canView} onChange={e => setCanView(e.target.checked)} className="rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
                <span className="text-sm text-gray-700">Can view records</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={canUpload} onChange={e => setCanUpload(e.target.checked)} className="rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
                <span className="text-sm text-gray-700">Can upload</span>
              </label>
            </div>
            <button onClick={handleAdd} disabled={adding} className="btn-primary w-full py-2.5">
              {adding ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </div>
      )}

      {/* Members List */}
      {members.length === 0 ? (
        <div className="card text-center py-16">
          <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-1">No family members added</p>
          <button onClick={() => setShowAdd(true)} className="text-sm text-gray-900 hover:underline font-medium">Add your first member</button>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-4 px-5 py-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-gray-700">{(m.member_name || m.member_email)[0].toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{m.member_name || 'Unknown'}</p>
                <p className="text-xs text-gray-400">{m.member_email}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => togglePermission(m, 'can_view')}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full transition-colors ${m.can_view ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'}`}
                >
                  <Eye className="h-3 w-3" />View
                </button>
                <button
                  onClick={() => togglePermission(m, 'can_upload')}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full transition-colors ${m.can_upload ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'}`}
                >
                  <UploadIcon className="h-3 w-3" />Upload
                </button>
                <button onClick={() => removeMember(m.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
