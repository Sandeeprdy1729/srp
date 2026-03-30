import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Clock, CheckCircle2, AlertCircle, Loader2, Brain, Share2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { documentsApi, aiApi, sharingApi } from '@/services/api';
import { Document } from '@/types';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

const TYPE_LABELS: Record<string, string> = {
  prescription: 'Prescription', lab_report: 'Lab Report', discharge_summary: 'Discharge Summary',
  op_consultation: 'OP Consultation', immunization: 'Immunization', wellness_record: 'Wellness',
  health_document: 'Health Document', other: 'Other',
};

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showText, setShowText] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [textLoading, setTextLoading] = useState(false);

  const fetchDoc = () => {
    if (!id) return;
    setLoading(true);
    documentsApi.get(id)
      .then(r => setDoc(r.data))
      .catch(() => toast.error('Document not found'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDoc(); }, [id]);

  const handleAnalyze = async () => {
    if (!id) return;
    setAnalyzing(true);
    try {
      await aiApi.analyze(id);
      toast.success('Analysis complete');
      fetchDoc();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Analysis failed. Make sure the document has extracted text.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleToggleText = async () => {
    if (showText) { setShowText(false); return; }
    if (textContent) { setShowText(true); return; }
    if (!id) return;
    setTextLoading(true);
    try {
      const r = await documentsApi.getText(id);
      setTextContent(r.data.text || r.data.extracted_text || 'No text available');
      setShowText(true);
    } catch {
      toast.error('Could not load text');
    } finally {
      setTextLoading(false);
    }
  };

  const handleShare = async () => {
    if (!id) return;
    try {
      const r = await sharingApi.create({ document_id: id, expires_in_hours: 72 });
      const url = r.data.share_url || `${window.location.origin}/share/${r.data.token}`;
      await navigator.clipboard.writeText(url);
      toast.success('Share link copied!');
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Could not create share link');
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Delete this document permanently?')) return;
    try {
      await documentsApi.delete(id);
      toast.success('Document deleted');
      navigate('/documents');
    } catch {
      toast.error('Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-gray-500">Document not found</p>
        <Link to="/documents" className="text-sm text-gray-900 hover:underline font-medium mt-2 inline-block">Back to documents</Link>
      </div>
    );
  }

  const insights = doc.ai_insights;
  const entities = doc.extracted_entities;

  return (
    <div className="space-y-6">
      {/* Back */}
      <button onClick={() => navigate('/documents')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to documents
      </button>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <FileText className="h-6 w-6 text-gray-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{doc.title || doc.file_name}</h1>
              <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500">
                <span className="badge-gray">{TYPE_LABELS[doc.document_type] || doc.document_type}</span>
                {doc.source_hospital && <span>{doc.source_hospital}</span>}
                {doc.created_at && <span>{format(parseISO(doc.created_at), 'dd MMM yyyy')}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="btn px-3 py-2" title="Share">
              <Share2 className="h-4 w-4" />
            </button>
            <button onClick={handleDelete} className="btn px-3 py-2 text-red-500 hover:bg-red-50" title="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 mt-4 text-sm">
          {doc.status === 'completed' && <><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-emerald-600">Processed</span></>}
          {doc.status === 'processing' && <><Loader2 className="h-4 w-4 text-gray-900 animate-spin" /><span className="text-gray-600">Processing</span></>}
          {doc.status === 'pending' && <><Clock className="h-4 w-4 text-amber-500" /><span className="text-amber-600">Pending</span></>}
          {doc.status === 'failed' && <><AlertCircle className="h-4 w-4 text-red-500" /><span className="text-red-600">Failed</span></>}
          <span className="text-gray-400">·</span>
          <span className="text-gray-400">{(doc.file_size / 1024).toFixed(0)} KB</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-5">
          {/* AI Analysis */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Brain className="h-4 w-4 text-blue-600" />
                AI Analysis
              </h2>
              <button onClick={handleAnalyze} disabled={analyzing} className="btn-primary text-xs px-4 py-1.5">
                {analyzing ? (
                  <span className="flex items-center gap-1.5">
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing...
                  </span>
                ) : insights ? 'Re-analyze' : 'Analyze with AI'}
              </button>
            </div>
            {insights ? (
              <div className="space-y-4">
                {insights.summary && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Summary</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{insights.summary}</p>
                  </div>
                )}
                {insights.key_findings?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Key Findings</p>
                    <ul className="space-y-1">
                      {insights.key_findings.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {insights.warnings?.length > 0 && (
                  <div className="bg-amber-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-amber-700 mb-1">Warnings</p>
                    {insights.warnings.map((w, i) => (
                      <p key={i} className="text-sm text-amber-700">{w}</p>
                    ))}
                  </div>
                )}
                {insights.action_items?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Action Items</p>
                    <ul className="space-y-1">
                      {insights.action_items.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Click "Analyze with AI" to generate insights from this document.</p>
            )}
          </div>

          {/* Extracted Text */}
          <div className="card p-6">
            <button onClick={handleToggleText} className="flex items-center justify-between w-full text-sm font-semibold text-gray-900">
              <span>Extracted Text</span>
              {textLoading ? (
                <div className="w-4 h-4 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
              ) : showText ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showText && (
              <pre className="mt-3 text-sm text-gray-600 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                {textContent || 'No text extracted yet.'}
              </pre>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Entities */}
          {entities && (
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Extracted Entities</h3>
              <div className="space-y-3">
                {entities.medications?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Medications</p>
                    <div className="flex flex-wrap gap-1">
                      {entities.medications.map((m, i) => (
                        <span key={i} className="badge-blue text-[11px]">{m.text || m.type}{m.dosage ? ` (${m.dosage})` : ''}</span>
                      ))}
                    </div>
                  </div>
                )}
                {entities.diagnoses?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Diagnoses</p>
                    <div className="flex flex-wrap gap-1">
                      {entities.diagnoses.map((d, i) => (
                        <span key={i} className="badge-red text-[11px]">{d.text || d.type}</span>
                      ))}
                    </div>
                  </div>
                )}
                {entities.lab_results?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Lab Results</p>
                    <div className="flex flex-wrap gap-1">
                      {entities.lab_results.map((l, i) => (
                        <span key={i} className="badge-green text-[11px]">{l.test || l.text}: {l.value} {l.unit || ''}</span>
                      ))}
                    </div>
                  </div>
                )}
                {entities.vitals?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Vitals</p>
                    <div className="flex flex-wrap gap-1">
                      {entities.vitals.map((v, i) => (
                        <span key={i} className="badge-purple text-[11px]">{v.vital || v.text}: {v.value} {v.unit || ''}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Document Info */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Document Info</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Type</dt>
                <dd className="text-gray-900">{TYPE_LABELS[doc.document_type] || doc.document_type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">File</dt>
                <dd className="text-gray-900 truncate max-w-[140px]">{doc.file_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Size</dt>
                <dd className="text-gray-900">{(doc.file_size / 1024).toFixed(0)} KB</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Uploaded</dt>
                <dd className="text-gray-900">{doc.created_at ? format(parseISO(doc.created_at), 'dd MMM yyyy') : '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Source</dt>
                <dd className="text-gray-900">{doc.source || 'upload'}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
