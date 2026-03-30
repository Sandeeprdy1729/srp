import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Shield, Heart, Calendar, AlertCircle } from 'lucide-react';
import { sharingApi } from '@/services/api';
import { format, parseISO } from 'date-fns';

interface SharedDoc {
  title: string;
  document_type: string;
  source_hospital?: string;
  document_date?: string;
  extracted_text?: string;
  ai_summary?: string;
  created_at?: string;
  owner_name?: string;
}

export default function ShareViewPage() {
  const { token } = useParams<{ token: string }>();
  const [doc, setDoc] = useState<SharedDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    sharingApi.getByToken(token)
      .then(r => setDoc(r.data))
      .catch(e => setError(e.response?.data?.detail || 'This link is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-6 h-6 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface px-4">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Link Unavailable</h1>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!doc) return null;

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gray-900 flex items-center justify-center">
              <Heart className="h-3.5 w-3.5 text-white" fill="currentColor" />
            </div>
            <span className="text-sm font-semibold text-gray-900">AarogyaKosha</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Shield className="h-3.5 w-3.5 text-emerald-500" />
            Shared securely
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="card p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <FileText className="h-6 w-6 text-gray-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{doc.title}</h1>
              <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500">
                <span className="badge-gray">{doc.document_type}</span>
                {doc.source_hospital && <span>{doc.source_hospital}</span>}
                {doc.created_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(parseISO(doc.created_at), 'dd MMM yyyy')}
                  </span>
                )}
              </div>
              {doc.owner_name && (
                <p className="text-xs text-gray-400 mt-1">Shared by {doc.owner_name}</p>
              )}
            </div>
          </div>

          {doc.ai_summary && (
            <div className="bg-blue-50 rounded-2xl p-4 mb-4">
              <p className="text-xs font-medium text-blue-700 mb-1">AI Summary</p>
              <p className="text-sm text-blue-900 leading-relaxed">{doc.ai_summary}</p>
            </div>
          )}

          {doc.extracted_text && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Document Content</p>
              <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                {doc.extracted_text}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
