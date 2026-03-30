import { useState, useEffect } from 'react';
import { Share2, Copy, ExternalLink, Trash2, Plus, QrCode, X, Clock } from 'lucide-react';
import { sharingApi, documentsApi } from '@/services/api';
import { SharingLink, Document } from '@/types';
import { format, parseISO } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

export default function SharingPage() {
  const [links, setLinks] = useState<SharingLink[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState('');
  const [purpose, setPurpose] = useState('');
  const [hours, setHours] = useState(72);
  const [creating, setCreating] = useState(false);
  const [qrLink, setQrLink] = useState<SharingLink | null>(null);

  const fetchLinks = () => {
    sharingApi.list()
      .then(r => setLinks(Array.isArray(r.data) ? r.data : r.data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLinks();
    documentsApi.list({ page_size: 100 })
      .then(r => {
        const d = Array.isArray(r.data) ? r.data : r.data.items || [];
        setDocs(d);
        if (d.length > 0) setSelectedDoc(d[0].id);
      })
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!selectedDoc) return toast.error('Select a document');
    setCreating(true);
    try {
      await sharingApi.create({ document_id: selectedDoc, purpose: purpose || undefined, expires_in_hours: hours });
      toast.success('Share link created');
      setShowCreate(false);
      setPurpose('');
      fetchLinks();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to create link');
    } finally {
      setCreating(false);
    }
  };

  const copyLink = (link: SharingLink) => {
    const url = link.share_url || `${window.location.origin}/share/${link.token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied');
  };

  const revokeLink = async (id: string) => {
    if (!confirm('Revoke this share link?')) return;
    try {
      await sharingApi.revoke(id);
      toast.success('Link revoked');
      fetchLinks();
    } catch {
      toast.error('Failed to revoke');
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
          <h1 className="text-xl font-bold text-gray-900">Sharing</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage shared document links</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          New Link
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-3xl shadow-elevated w-full max-w-md p-8 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Create Share Link</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded"><X className="h-4 w-4" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document</label>
              <select value={selectedDoc} onChange={e => setSelectedDoc(e.target.value)} className="input">
                {docs.map(d => <option key={d.id} value={d.id}>{d.title || d.file_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purpose <span className="text-gray-400">(optional)</span></label>
              <input type="text" value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g., For Dr. Kumar" className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expires in (hours)</label>
              <select value={hours} onChange={e => setHours(Number(e.target.value))} className="input">
                <option value={24}>24 hours</option>
                <option value={72}>3 days</option>
                <option value={168}>1 week</option>
                <option value={720}>30 days</option>
              </select>
            </div>
            <button onClick={handleCreate} disabled={creating} className="btn-primary w-full py-2.5">
              {creating ? 'Creating...' : 'Create Link'}
            </button>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrLink && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setQrLink(null)}>
          <div className="bg-white rounded-3xl shadow-elevated p-8 text-center" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Scan to view document</h3>
            <QRCodeSVG value={qrLink.share_url || `${window.location.origin}/share/${qrLink.token}`} size={200} className="mx-auto" />
            <button onClick={() => setQrLink(null)} className="btn mt-4 text-sm px-4 py-2">Close</button>
          </div>
        </div>
      )}

      {/* Links */}
      {links.length === 0 ? (
        <div className="card text-center py-16">
          <Share2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-1">No active share links</p>
          <button onClick={() => setShowCreate(true)} className="text-sm text-gray-900 hover:underline font-medium">Create your first link</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {links.map(link => (
            <div key={link.id} className="card p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{link.purpose || 'Shared Document'}</p>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">{link.token}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                <Clock className="h-3.5 w-3.5" />
                {link.expires_at ? `Expires ${format(parseISO(link.expires_at), 'dd MMM yyyy')}` : 'No expiry'}
                <span className="text-gray-300">·</span>
                {link.access_count} view{link.access_count !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => copyLink(link)} className="btn text-xs px-2.5 py-1.5 flex items-center gap-1">
                  <Copy className="h-3 w-3" />Copy
                </button>
                <button onClick={() => setQrLink(link)} className="btn text-xs px-2.5 py-1.5 flex items-center gap-1">
                  <QrCode className="h-3 w-3" />QR
                </button>
                <button onClick={() => window.open(`/share/${link.token}`, '_blank')} className="btn text-xs px-2.5 py-1.5 flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />Open
                </button>
                <button onClick={() => revokeLink(link.id)} className="btn text-xs px-2.5 py-1.5 text-red-500 hover:bg-red-50 flex items-center gap-1 ml-auto">
                  <Trash2 className="h-3 w-3" />Revoke
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
