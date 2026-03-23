import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/services/api';
import { Heart, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

const profileSchema = z.object({
  full_name: z.string().min(2),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuthStore();
  
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || '',
      phone: user?.phone || '',
      date_of_birth: user?.date_of_birth?.split('T')[0] || '',
      gender: user?.gender || '',
    },
  });
  
  const onSubmit = async () => {
    try {
      const response = await authApi.getMe();
      setUser(response.data);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    }
  };
  
  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    logout();
    navigate('/login');
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-500">Manage your account settings</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <div className="lg:col-span-2">
          <div className="card">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex items-center gap-4 pb-6 border-b">
                <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-3xl font-bold text-primary-700">
                    {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{user?.full_name}</h2>
                  <p className="text-gray-500">{user?.email}</p>
                  <span className="inline-block mt-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full capitalize">
                    {user?.role}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    {...register('full_name')}
                    type="text"
                    className="input-field"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    {...register('phone')}
                    type="tel"
                    className="input-field"
                    placeholder="+91 98765 43210"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    {...register('date_of_birth')}
                    type="date"
                    className="input-field"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <select {...register('gender')} className="input-field">
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
        
        {/* ABHA Card */}
        <div>
          <div className="card bg-gradient-to-br from-primary-500 to-primary-700 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="h-5 w-5" />
              <span className="font-semibold">ABHA</span>
            </div>
            
            {user?.abha_number ? (
              <div>
                <p className="text-sm opacity-80">ABHA Number</p>
                <p className="text-2xl font-mono font-bold tracking-wider">
                  {user.abha_number}
                </p>
                {user.abha_address && (
                  <div className="mt-4">
                    <p className="text-sm opacity-80">ABHA Address</p>
                    <p className="font-mono">{user.abha_address}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm opacity-80">
                Link your ABHA number for ABDM integration
              </p>
            )}
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full mt-4 btn-danger flex items-center justify-center gap-2"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
