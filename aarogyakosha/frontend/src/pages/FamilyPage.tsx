import { useEffect, useState } from 'react';
import { Plus, Users, X, Shield, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { familyApi, patientsApi } from '@/services/api';
import type { FamilyAccess, Patient } from '@/types';
import toast from 'react-hot-toast';

const addMemberSchema = z.object({
  member_email: z.string().email('Invalid email'),
  patient_id: z.string().uuid('Select a patient'),
  relationship_type: z.string().optional(),
  can_view: z.boolean().default(true),
  can_upload: z.boolean().default(false),
});

type AddMemberForm = z.infer<typeof addMemberSchema>;

export default function FamilyPage() {
  const [members, setMembers] = useState<FamilyAccess[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<any[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddMemberForm>({
    resolver: zodResolver(addMemberSchema),
  });
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      const [membersRes, sharedRes, patientsRes] = await Promise.all([
        familyApi.list(),
        familyApi.sharedWithMe(),
        patientsApi.list(),
      ]);
      setMembers(membersRes.data);
      setSharedWithMe(sharedRes.data);
      setPatients(patientsRes.data);
    } catch (error) {
      toast.error('Failed to load family data');
    } finally {
      setLoading(false);
    }
  };
  
  const onSubmit = async (data: AddMemberForm) => {
    try {
      await familyApi.add({
        ...data,
        patient_id: data.patient_id,
      });
      toast.success('Family member added');
      setShowAddModal(false);
      reset();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to add member');
    }
  };
  
  const handleRemove = async (id: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    
    try {
      await familyApi.remove(id);
      setMembers(members.filter(m => m.id !== id));
      toast.success('Member removed');
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };
  
  const handleUpdate = async (id: string, data: { can_view?: boolean; can_upload?: boolean }) => {
    try {
      await familyApi.update(id, data);
      fetchData();
      toast.success('Permissions updated');
    } catch (error) {
      toast.error('Failed to update permissions');
    }
  };
  
  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Family Access</h1>
          <p className="text-gray-500">Manage who can access your health records</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Member
        </button>
      </div>
      
      {/* Family members with access to your records */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary-600" />
          Members with Access
        </h2>
        
        {members.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No family members added yet</p>
        ) : (
          <div className="space-y-4">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-700">
                      {member.member_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{member.member_name}</p>
                    <p className="text-sm text-gray-500">{member.member_email}</p>
                    {member.relationship_type && (
                      <span className="text-xs text-gray-400">{member.relationship_type}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={member.can_view}
                        onChange={(e) => handleUpdate(member.id, { can_view: e.target.checked })}
                        className="mr-1"
                      />
                      View
                    </label>
                    <label className="text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={member.can_upload}
                        onChange={(e) => handleUpdate(member.id, { can_upload: e.target.checked })}
                        className="mr-1"
                      />
                      Upload
                    </label>
                  </div>
                  <button
                    onClick={() => handleRemove(member.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Records shared with you */}
      {sharedWithMe.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Shared With You
          </h2>
          
          <div className="space-y-4">
            {sharedWithMe.map((item) => (
              <div key={item.access_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{item.owner_name}</p>
                  <p className="text-sm text-gray-500">Viewing: {item.patient_name}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {item.can_view && <span className="px-2 py-1 bg-green-100 text-green-700 rounded">View</span>}
                  {item.can_upload && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">Upload</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Family Member</h3>
              <button onClick={() => setShowAddModal(false)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    {...register('member_email')}
                    type="email"
                    placeholder="family@example.com"
                    className="input-field pl-10"
                  />
                </div>
                {errors.member_email && (
                  <p className="mt-1 text-sm text-red-600">{errors.member_email.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient
                </label>
                <select
                  {...register('patient_id')}
                  className="input-field"
                >
                  <option value="">Select patient</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.display_name}
                    </option>
                  ))}
                </select>
                {errors.patient_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.patient_id.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship (optional)
                </label>
                <input
                  {...register('relationship_type')}
                  type="text"
                  placeholder="e.g., Spouse, Parent, Child"
                  className="input-field"
                />
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...register('can_view')} className="rounded" />
                  <span className="text-sm text-gray-700">Allow viewing records</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...register('can_upload')} className="rounded" />
                  <span className="text-sm text-gray-700">Allow uploading documents</span>
                </label>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                >
                  {isSubmitting ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
