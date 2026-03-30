import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
  full_name: z.string().min(2, 'Name required'),
  phone: z.string().optional(),
});
type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setUser, setTokens } = useAuthStore();
  const [show, setShow] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    try {
      await authApi.register(data);
      const res = await authApi.login(data.email, data.password);
      setTokens(res.data.access_token, res.data.refresh_token);
      const me = await authApi.getMe();
      setUser(me.data);
      toast.success('Account created!');
      navigate('/');
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* letters.app style top bar */}
      <header className="flex items-center justify-between px-6 sm:px-10 h-16 bg-white/80 backdrop-blur-sm border-b border-gray-100 fixed top-0 inset-x-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center">
            <Heart className="h-4 w-4 text-white" fill="currentColor" />
          </div>
          <span className="text-base font-bold text-gray-900 tracking-tight">AarogyaKosha</span>
        </div>
        <Link to="/login" className="btn-primary text-sm">Login</Link>
      </header>

      {/* Hero gradient */}
      <div className="flex-1 flex flex-col items-center pt-16"
        style={{ background: 'linear-gradient(180deg, #8EA8C3 0%, #B8C9DB 35%, #dfe7ef 60%, #f6f7f9 100%)' }}>

        <div className="text-center pt-12 pb-8 px-6">
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight tracking-tight mb-4">
            Start your health<br />journey today
          </h1>
          <p className="text-base sm:text-lg text-white/80 max-w-md mx-auto leading-relaxed">
            Create your personal vault in seconds.<br />
            Upload prescriptions, lab reports, and more.
          </p>
        </div>

        {/* Register card */}
        <div className="w-full max-w-md mx-auto px-4 pb-16">
          <div className="bg-white rounded-3xl shadow-elevated p-8 sm:p-10 border border-gray-200/60">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Create your vault</h2>
            <p className="text-sm text-gray-500 mb-7">Start managing your health records</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input {...register('full_name')} type="text" className="input" placeholder="Rahul Sharma" />
                {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input {...register('email')} type="email" className="input" placeholder="rahul@example.com" />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone <span className="text-gray-400">(optional)</span></label>
                <input {...register('phone')} type="tel" className="input" placeholder="+91 98765 43210" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input {...register('password')} type={show ? 'text' : 'password'} className="input pr-10" placeholder="Min. 8 characters" />
                  <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
              </div>
              <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
                {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create account'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-gray-900 hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
