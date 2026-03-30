import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Upload, Share2, Users, Shield,
  LogOut, Menu, X, Search, Bell, ChevronRight,
  Heart, CheckCircle, User
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { authApi, documentsApi } from '@/services/api';
import toast from 'react-hot-toast';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Upload', href: '/upload', icon: Upload },
  { name: 'Sharing', href: '/sharing', icon: Share2 },
  { name: 'Family', href: '/family', icon: Users },
  { name: 'Consents', href: '/consents', icon: Shield },
];

/* ── Search Modal (⌘K) ── */
function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) { setQuery(''); setResults([]); setTimeout(() => inputRef.current?.focus(), 100); }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await documentsApi.list({ search: query, page_size: 6 });
        setResults(Array.isArray(res.data) ? res.data : res.data.items || []);
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-[18%] left-1/2 -translate-x-1/2 w-full max-w-lg animate-scale-in">
        <div className="bg-white rounded-3xl shadow-modal border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-3 px-5 border-b border-gray-100">
            <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search documents..." className="flex-1 py-4 text-sm bg-transparent outline-none placeholder:text-gray-400" />
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-pill border border-gray-200 text-[10px] text-gray-400 font-mono">ESC</kbd>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {loading && <div className="px-5 py-8 text-center text-sm text-gray-400">Searching...</div>}
            {!loading && query && results.length === 0 && <div className="px-5 py-8 text-center text-sm text-gray-400">No documents found</div>}
            {!loading && results.map((doc: any) => (
              <button key={doc.id} onClick={() => { navigate(`/documents/${doc.id}`); onClose(); }}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 text-left transition-colors">
                <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.title || doc.file_name}</p>
                  <p className="text-xs text-gray-400">{doc.document_type?.replace('_', ' ')}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
              </button>
            ))}
            {!query && <div className="px-5 py-8 text-center text-sm text-gray-400">Type to search your documents</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Notifications Dropdown ── */
function NotificationsDropdown({ open, onClose, anchorRef }: { open: boolean; onClose: () => void; anchorRef: React.RefObject<HTMLButtonElement | null> }) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) onClose();
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose, anchorRef]);
  if (!open) return null;
  return (
    <div ref={dropdownRef} className="absolute right-0 top-full mt-2 w-80 bg-white rounded-3xl shadow-elevated border border-gray-200 overflow-hidden animate-scale-in z-50">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
        <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-700 font-medium">Mark all read</button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        <div className="px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50 border-b border-gray-50">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Upload className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div><p className="text-sm text-gray-900">Welcome to AarogyaKosha!</p><p className="text-xs text-gray-400 mt-0.5">Upload your first document to get started</p></div>
        </div>
        <div className="px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50">
          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div><p className="text-sm text-gray-900">Your account is ready</p><p className="text-xs text-gray-400 mt-0.5">All features are available</p></div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Layout — letters.app light aesthetic ── */
export default function DashboardLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const { user, logout } = useAuthStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    logout(); toast.success('Logged out');
  };

  /* letters.app style sidebar — white/light with subtle borders */
  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex flex-col h-full bg-white border-r border-gray-200 ${mobile ? 'w-72' : ''}`}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 h-16 px-5">
        <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center">
          <Heart className="h-4 w-4 text-white" fill="currentColor" />
        </div>
        <span className="text-base font-bold text-gray-900 tracking-tight">AarogyaKosha</span>
        {mobile && (
          <button onClick={() => setMobileOpen(false)} className="ml-auto p-1 rounded-xl hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 mt-2 space-y-1">
        {navigation.map(item => {
          const active = location.pathname === item.href ||
                        (item.href !== '/' && location.pathname.startsWith(item.href));
          return (
            <Link key={item.name} to={item.href}
              onClick={() => mobile && setMobileOpen(false)}
              className={active ? 'nav-item-active' : 'nav-item-default'}>
              <item.icon className="h-[18px] w-[18px]" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom user */}
      <div className="p-3 border-t border-gray-100">
        <Link to="/profile" onClick={() => mobile && setMobileOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-gray-50 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-white">{user?.full_name?.charAt(0).toUpperCase() || 'U'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name}</p>
            <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
          </div>
        </Link>
        <button onClick={handleLogout} className="w-full nav-item-default mt-1">
          <LogOut className="h-[18px] w-[18px]" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 animate-fade-in"><Sidebar mobile /></div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-[260px] lg:flex-shrink-0"><Sidebar /></div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — clean white, matches letters.app header */}
        <header className="flex items-center h-16 bg-white border-b border-gray-200 px-5 lg:px-8 flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>

          {/* Search — rounded pill like letters.app inputs */}
          <button onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2.5 ml-2 lg:ml-0 px-4 py-2 rounded-pill border border-gray-200 text-sm text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors w-72">
            <Search className="h-3.5 w-3.5" />
            <span className="text-[13px]">Search...</span>
            <kbd className="ml-auto text-[10px] px-2 py-0.5 rounded-pill border border-gray-200 text-gray-400 font-mono">⌘K</kbd>
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-1 relative">
            <button onClick={() => setSearchOpen(true)} className="sm:hidden p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <Search className="h-5 w-5" />
            </button>
            <button ref={bellRef} onClick={() => setNotifOpen(!notifOpen)}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full ring-2 ring-white" />
            </button>
            <NotificationsDropdown open={notifOpen} onClose={() => setNotifOpen(false)} anchorRef={bellRef} />
            <Link to="/profile" className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <User className="h-5 w-5" />
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-5 sm:px-8 lg:px-10 py-8">
            <Outlet />
          </div>
        </main>
      </div>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
