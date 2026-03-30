import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart, Eye, EyeOff, Upload, FileText, Brain, Share2, Shield,
  Users, Lock, Server, Trash2, ChevronRight, Sparkles, Zap,
  Star
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type Form = z.infer<typeof schema>;

/* ── NAV LINKS for scrolling ── */
const NAV_ITEMS = [
  { label: 'Features', id: 'features' },
  { label: 'How it works', id: 'how-it-works' },
  { label: 'Security', id: 'security' },
  { label: 'Testimonials', id: 'testimonials' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser, setTokens } = useAuthStore();
  const [show, setShow] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenu(false);
  };

  const onSubmit = async (data: Form) => {
    try {
      const res = await authApi.login(data.email, data.password);
      setTokens(res.data.access_token, res.data.refresh_token);
      const me = await authApi.getMe();
      setUser(me.data);
      toast.success('Welcome back!');
      navigate('/');
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ════════════════════  STICKY NAV  ════════════════════ */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 sm:px-10 h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center">
              <Heart className="h-4 w-4 text-white" fill="currentColor" />
            </div>
            <span className="text-base font-bold text-gray-900 tracking-tight">AarogyaKosha</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => scrollTo(item.id)}
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={() => setShowLogin(true)}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">
              Login
            </button>
            <Link to="/register" className="btn-primary text-sm">Sign up</Link>
            {/* Mobile hamburger */}
            <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-1.5 rounded-xl hover:bg-gray-100">
              <div className="space-y-1.5">
                <div className="w-5 h-0.5 bg-gray-900" />
                <div className="w-5 h-0.5 bg-gray-900" />
                <div className="w-3.5 h-0.5 bg-gray-900" />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3">
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => scrollTo(item.id)}
                className="block text-sm text-gray-600 hover:text-gray-900 font-medium w-full text-left py-1">
                {item.label}
              </button>
            ))}
            <button onClick={() => { setShowLogin(true); setMobileMenu(false); }}
              className="block text-sm text-gray-600 hover:text-gray-900 font-medium w-full text-left py-1">
              Login
            </button>
          </div>
        )}
      </header>

      {/* ════════════════════  LOGIN MODAL  ════════════════════ */}
      {showLogin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowLogin(false)}>
          <div className="bg-white rounded-3xl shadow-modal w-full max-w-md p-8 sm:p-10 animate-scale-in"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Welcome back</h2>
                <p className="text-sm text-gray-500 mt-0.5">Sign in to your health vault</p>
              </div>
              <button onClick={() => setShowLogin(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input {...register('email')} type="email" className="input" placeholder="you@example.com" />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input {...register('password')} type={show ? 'text' : 'password'} className="input pr-10" placeholder="Enter your password" />
                  <button type="button" onClick={() => setShow(!show)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
              </div>
              <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
                {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Login'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="font-semibold text-gray-900 hover:underline">Sign up for free</Link>
            </p>
          </div>
        </div>
      )}

      {/* ════════════════════  HERO SECTION  ════════════════════ */}
      <section className="pt-16" style={{ background: 'linear-gradient(180deg, #8EA8C3 0%, #A8BDCF 20%, #C3D3E1 40%, #DDE5ED 60%, #EEF1F5 80%, #F6F7F9 100%)' }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-10 pt-20 sm:pt-28 pb-16 sm:pb-24">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.08] tracking-tight">
              Health records,<br />not paperwork
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-white/80 max-w-xl mx-auto leading-relaxed">
              Store records securely. Enjoy AI-powered insights. Share instantly with your doctor. Save hours every week.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="btn-primary text-base px-8 py-3.5">
                Sign up for free
              </Link>
              <button onClick={() => setShowLogin(true)}
                className="btn-secondary text-base px-8 py-3.5 bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm">
                Login
              </button>
            </div>
          </div>

          {/* Hero demo card — like letters.app before/after */}
          <div className="mt-16 sm:mt-20 max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl shadow-elevated border border-gray-200/60 overflow-hidden">
              <div className="grid md:grid-cols-2">
                {/* Before */}
                <div className="p-6 sm:p-8 border-b md:border-b-0 md:border-r border-gray-100">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 mb-4">
                    <FileText className="h-3 w-3" /> Raw Document
                  </span>
                  <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-500 leading-relaxed font-mono">
                    <p>Patient: Rahul Sharma</p>
                    <p>Date: 15/03/2026</p>
                    <p>Diagnosis: Type 2 DM, HTN</p>
                    <p>Rx: Tab Metformin 500mg BD</p>
                    <p>Tab Amlodipine 5mg OD</p>
                    <p>FBS: 142 mg/dL (H)</p>
                    <p>HbA1c: 7.2%</p>
                    <p>Review: 3 months</p>
                  </div>
                </div>
                {/* After */}
                <div className="p-6 sm:p-8">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 mb-4">
                    <Brain className="h-3 w-3" /> AI-Analyzed
                  </span>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Summary</p>
                      <p className="text-sm text-gray-700 mt-1">Patient on dual therapy for diabetes and hypertension. HbA1c slightly above target.</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Medications</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">Metformin 500mg</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">Amlodipine 5mg</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Alert</p>
                      <div className="flex items-start gap-2 mt-1 bg-amber-50 rounded-xl p-2.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-700">Fasting blood sugar elevated — consider dose adjustment at next review.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════  STATS BAR  ════════════════════ */}
      <section className="bg-surface">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
          <p className="text-center text-sm font-medium text-gray-500 mb-10">
            Save <span className="text-gray-900 font-bold text-lg">5+</span> hours a week with AarogyaKosha
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: '100%', label: 'Secure & Encrypted', icon: Lock },
              { value: 'AI', label: 'Powered Insights', icon: Brain },
              { value: 'ABDM', label: 'Compliant', icon: Shield },
              { value: '∞', label: 'Family Sharing', icon: Users },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <s.icon className="h-5 w-5 text-gray-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════  FEATURES  ════════════════════ */}
      <section id="features" className="bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-20 sm:py-28">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 mb-4">
              <Sparkles className="h-3 w-3" /> Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
              Managing health records<br />never been easier
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Upload,
                badge: 'Upload',
                title: 'Upload any document',
                desc: 'PDF, images, Word documents — upload prescriptions, lab reports, discharge summaries and more. We extract text automatically.',
                color: 'bg-violet-50 text-violet-700 border-violet-100',
                iconColor: 'bg-violet-100 text-violet-600',
              },
              {
                icon: Brain,
                badge: 'AI Analysis',
                title: 'AI-powered insights',
                desc: 'Our AI reads your documents and extracts medications, diagnoses, lab results, and vitals. Get summaries, key findings, and action items.',
                color: 'bg-blue-50 text-blue-700 border-blue-100',
                iconColor: 'bg-blue-100 text-blue-600',
              },
              {
                icon: Share2,
                badge: 'Sharing',
                title: 'Share instantly',
                desc: 'Generate secure, time-limited share links with QR codes. Share with any doctor instantly — no app needed on their end.',
                color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                iconColor: 'bg-emerald-100 text-emerald-600',
              },
              {
                icon: Users,
                badge: 'Family',
                title: 'Family health vault',
                desc: 'Manage records for your entire family. Grant view or upload access to family members with granular permissions.',
                color: 'bg-amber-50 text-amber-700 border-amber-100',
                iconColor: 'bg-amber-100 text-amber-600',
              },
              {
                icon: Shield,
                badge: 'Consent',
                title: 'ABDM consent management',
                desc: 'Full consent lifecycle — grant, deny, and revoke access to your health data following ABDM guidelines. Your data, your control.',
                color: 'bg-rose-50 text-rose-700 border-rose-100',
                iconColor: 'bg-rose-100 text-rose-600',
              },
              {
                icon: FileText,
                badge: 'Records',
                title: 'Organized health timeline',
                desc: 'All your documents in one searchable timeline. Filter by type, search by content, track your health journey over time.',
                color: 'bg-gray-50 text-gray-700 border-gray-200',
                iconColor: 'bg-gray-100 text-gray-600',
              },
            ].map(f => (
              <div key={f.title} className="bg-white rounded-3xl border border-gray-200/80 p-8 hover:shadow-card hover:border-gray-300 transition-all duration-200 group">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${f.color} mb-5`}>
                  {f.badge}
                </span>
                <div className={`w-11 h-11 rounded-2xl ${f.iconColor} flex items-center justify-center mb-4`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════  HOW IT WORKS  ════════════════════ */}
      <section id="how-it-works" className="bg-surface">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-20 sm:py-28">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 mb-4">
              <Zap className="h-3 w-3" /> How it works
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
              Three steps to your<br />personal health vault
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: Upload,
                title: 'Upload your records',
                desc: 'Upload prescriptions, lab reports, discharge summaries — any health document in PDF, image, or Word format.',
              },
              {
                step: '02',
                icon: Brain,
                title: 'AI processes everything',
                desc: 'Our AI extracts text, identifies medications, diagnoses, lab results, and generates a comprehensive summary.',
              },
              {
                step: '03',
                icon: Share2,
                title: 'Share with your doctor',
                desc: 'Generate a secure link or QR code. Your doctor views documents instantly — no login required on their end.',
              },
            ].map((s, i) => (
              <div key={s.step} className="relative">
                <div className="bg-white rounded-3xl border border-gray-200/80 p-8 h-full">
                  <span className="text-xs font-bold text-gray-300 tracking-widest">{s.step}</span>
                  <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center mt-4 mb-5">
                    <s.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
                {/* Connector arrow */}
                {i < 2 && (
                  <div className="hidden md:flex absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ChevronRight className="h-5 w-5 text-gray-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════  SECURITY  ════════════════════ */}
      <section id="security" className="bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-20 sm:py-28">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 text-center mb-16">
            Your data is safe
          </h2>

          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {[
              {
                icon: Lock,
                title: 'Secure with bank-grade protection',
                desc: 'AarogyaKosha complies with Indian health data privacy regulations, including IT Act 2000 and upcoming DPDP Act guidelines.',
              },
              {
                icon: Server,
                title: 'Your data stays in India',
                desc: 'We don\'t use overseas servers. All data is processed and stored exclusively on secure servers located in India.',
              },
              {
                icon: Trash2,
                title: 'Files are never shared or sold',
                desc: 'Your health documents are never shared or sold. You have full control to delete your data permanently at any time.',
              },
            ].map(s => (
              <div key={s.title} className="bg-[#f5f5f7] rounded-[2rem] p-8 sm:p-10">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-6 shadow-xs">
                  <s.icon className="h-5 w-5 text-blue-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{s.title}</h3>
                <p className="text-[15px] text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Padlock illustration — matching letters.app */}
          <div className="flex justify-center">
            <div className="relative w-48 h-56 sm:w-56 sm:h-64">
              {/* Lock body */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-b from-gray-800 to-gray-950 flex items-center justify-center shadow-elevated">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gray-900 border border-gray-700 flex items-center justify-center shadow-lg">
                  <div className="text-center">
                    <Heart className="h-5 w-5 text-white mx-auto mb-0.5" fill="currentColor" />
                    <span className="text-[8px] font-bold text-white/70 tracking-wider">APP</span>
                  </div>
                </div>
              </div>
              {/* Lock shackle */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-32 sm:w-32 sm:h-36">
                <div className="w-full h-full rounded-t-full border-[10px] sm:border-[12px] border-gray-300 border-b-0"
                  style={{ background: 'linear-gradient(180deg, #d1d5db 0%, #9ca3af 50%, #6b7280 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent)', maskImage: 'linear-gradient(to bottom, black 70%, transparent)' }} />
                <div className="absolute inset-0 rounded-t-full border-[10px] sm:border-[12px] border-transparent border-b-0"
                  style={{ borderLeftColor: '#e5e7eb', borderTopColor: '#e5e7eb' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════  TESTIMONIALS  ════════════════════ */}
      <section id="testimonials" className="bg-surface">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-20 sm:py-28">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100 mb-4">
              <Star className="h-3 w-3" /> Testimonials
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
              Trusted by users
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: 'AarogyaKosha has transformed how I manage my family\'s health records. Everything is in one place, and sharing with our doctor takes seconds.',
                name: 'Dr. Priya Sharma',
                role: 'General Physician',
                initials: 'PS',
              },
              {
                quote: 'The AI analysis is remarkably useful — it catches medication interactions and lab abnormalities that I might review later. A great second pair of eyes.',
                name: 'Dr. Rajesh Kumar',
                role: 'Cardiologist',
                initials: 'RK',
              },
              {
                quote: 'As a practice manager, I recommend AarogyaKosha to all our patients. The QR code sharing feature alone saves us 30 minutes per consultation.',
                name: 'Ananya Patel',
                role: 'Practice Manager',
                initials: 'AP',
              },
            ].map(t => (
              <div key={t.name} className="bg-white rounded-3xl border border-gray-200/80 p-8">
                <div className="flex items-center gap-1 mb-4">
                  {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-white">{t.initials}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════  BOTTOM CTA  ════════════════════ */}
      <section style={{ background: 'linear-gradient(180deg, #F6F7F9 0%, #C3D3E1 30%, #8EA8C3 100%)' }}>
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-20 sm:py-28 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            Health records,<br />not paperwork
          </h2>
          <p className="mt-4 text-base sm:text-lg text-white/80 max-w-lg mx-auto leading-relaxed">
            Store records securely. Enjoy AI-powered insights. Share instantly with your doctor. Save 5+ hours weekly on paperwork.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="btn-primary text-base px-8 py-3.5 bg-white text-gray-900 hover:bg-gray-100">
              Sign up for free
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════  FOOTER  ════════════════════ */}
      <footer className="bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-xl bg-gray-900 flex items-center justify-center">
                  <Heart className="h-3.5 w-3.5 text-white" fill="currentColor" />
                </div>
                <span className="text-sm font-bold text-gray-900">AarogyaKosha</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed max-w-[200px]">
                Your personal health vault. Secure, AI-powered, and always with you.
              </p>
            </div>

            {/* Links */}
            <div>
              <p className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Product</p>
              <div className="space-y-2">
                {['Features', 'How it works', 'Security'].map(l => (
                  <button key={l} onClick={() => scrollTo(l.toLowerCase().replace(/ /g, '-'))}
                    className="block text-sm text-gray-500 hover:text-gray-900 transition-colors">{l}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Account</p>
              <div className="space-y-2">
                <Link to="/register" className="block text-sm text-gray-500 hover:text-gray-900 transition-colors">Sign up</Link>
                <button onClick={() => setShowLogin(true)} className="block text-sm text-gray-500 hover:text-gray-900 transition-colors">Login</button>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Project</p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>GRIET — AIML Department</p>
                <p>Vipin · Siddartha · Sandeep</p>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-gray-400">All rights reserved &copy; {new Date().getFullYear()} AarogyaKosha</p>
            <p className="text-xs text-gray-400">Made with ❤️ in India</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
