import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Clock, Eye, Share2, Trash2 } from 'lucide-react';
import { sharingApi } from '@/services/api';
import type { SharingLink } from '@/types';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export default function SharingPage() {
  const [links, setLinks] = useState<SharingLink[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchLinks();
  }, []);
  
  const fetchLinks = async () => {
    try {
      const response = await sharingApi.list();
      setLinks(response.data);
    } catch (error) {
      toast.error('Failed to load sharing links');
    } finally {
      setLoading(false);
    }
  };
  
  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };
  
  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this sharing link?')) return;
    
    try {
      await sharingApi.revoke(id);
      setLinks(links.filter(l => l.id !== id));
      toast.success('Link revoked');
    } catch (error) {
      toast.error('Failed to revoke link');
    }
  };
  
  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sharing</h1>
        <p className="text-gray-500">Manage your document sharing links</p>
      </div>
      
      {links.length === 0 ? (
        <div className="card text-center py-12">
          <Share2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sharing links</h3>
          <p className="text-gray-500 mb-4">
            Share links will appear here when you share documents
          </p>
          <Link to="/documents" className="btn-primary inline-flex">
            View Documents
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {links.map((link) => {
            const isExpired = link.expires_at && new Date(link.expires_at) < new Date();
            const shareUrl = `${window.location.origin}/share/${link.token}`;
            
            return (
              <div key={link.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-medium text-gray-900">{link.purpose || 'Document Sharing'}</h3>
                    <p className="text-sm text-gray-500">
                      Created {formatDistanceToNow(new Date(link.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isExpired ? (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                        Expired
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-2 bg-white border rounded-lg">
                    <QRCodeSVG value={shareUrl} size={80} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="input-field text-sm py-1"
                      />
                      <button
                        onClick={() => copyToClipboard(shareUrl)}
                        className="p-2 text-gray-500 hover:text-gray-700"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {link.access_count} views
                      </span>
                      {link.expires_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Expires {formatDistanceToNow(new Date(link.expires_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={() => handleRevoke(link.id)}
                    className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    Revoke
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
