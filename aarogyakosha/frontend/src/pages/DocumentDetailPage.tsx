import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Calendar, 
  Building, 
  Share2, 
  Trash2,
  Loader2,
  Pill,
  Stethoscope,
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { documentsApi, aiApi, sharingApi } from '@/services/api';
import type { Document } from '@/types';
import toast from 'react-hot-toast';

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [creatingShare, setCreatingShare] = useState(false);
  
  useEffect(() => {
    if (id) {
      fetchDocument(id);
    }
  }, [id]);
  
  const fetchDocument = async (docId: string) => {
    try {
      const response = await documentsApi.get(docId);
      setDocument(response.data);
    } catch (error) {
      toast.error('Failed to load document');
      navigate('/documents');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAnalyze = async () => {
    if (!id) return;
    
    setAnalyzing(true);
    try {
      await aiApi.analyze(id);
      toast.success('Document analyzed successfully');
      fetchDocument(id);
    } catch (error) {
      toast.error('Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };
  
  const handleShare = async () => {
    if (!id) return;
    
    setCreatingShare(true);
    try {
      const response = await sharingApi.create({
        document_id: id,
        expires_in_hours: 24,
      });
      
      const shareUrl = `${window.location.origin}/share/${response.data.token}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to create share link');
    } finally {
      setCreatingShare(false);
    }
  };
  
  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await documentsApi.delete(id);
      toast.success('Document deleted');
      navigate('/documents');
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }
  
  if (!document) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Document not found</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(document.created_at).toLocaleDateString()}
            </span>
            {document.source_hospital && (
              <span className="flex items-center gap-1">
                <Building className="h-4 w-4" />
                {document.source_hospital}
              </span>
            )}
            <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-medium">
              {document.document_type.replace('_', ' ')}
            </span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleShare}
            disabled={creatingShare}
            className="btn-secondary flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            {creatingShare ? 'Creating...' : 'Share'}
          </button>
          <button
            onClick={handleDelete}
            className="btn-danger flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Summary */}
          {(document.ai_summary || document.ai_insights) && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">AI Summary</h2>
              </div>
              
              <p className="text-gray-700">{document.ai_summary || document.ai_insights?.summary}</p>
              
              {document.ai_insights?.key_findings && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Key Findings</h3>
                  <ul className="space-y-2">
                    {document.ai_insights.key_findings.map((finding, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {finding}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {document.ai_insights?.action_items && document.ai_insights.action_items.length > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                  <h3 className="text-sm font-medium text-yellow-800 mb-2">Action Items</h3>
                  <ul className="space-y-1">
                    {document.ai_insights.action_items.map((item, index) => (
                      <li key={index} className="text-sm text-yellow-700">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {/* Analyze Button */}
          {!document.ai_summary && (
            <div className="card text-center py-8">
              <Stethoscope className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">
                Get AI-powered insights from this document
              </p>
              <button
                onClick={handleAnalyze}
                disabled={analyzing || document.status === 'processing'}
                className="btn-primary flex items-center gap-2 mx-auto"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Analyze with AI
                  </>
                )}
              </button>
            </div>
          )}
          
          {/* Extracted Text */}
          {document.extracted_text && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Extracted Text</h2>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
                {document.extracted_text}
              </pre>
            </div>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Extracted Entities */}
          {document.extracted_entities && (
            <div className="card">
              <h3 className="font-medium text-gray-900 mb-4">Extracted Information</h3>
              
              {document.extracted_entities.medications?.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                    <Pill className="h-4 w-4 text-green-600" />
                    Medications
                  </h4>
                  <ul className="space-y-1">
                    {document.extracted_entities.medications.map((med, index) => (
                      <li key={index} className="text-sm text-gray-600">
                        {med.text}
                        {med.dosage && <span className="text-gray-400"> - {med.dosage}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {document.extracted_entities.diagnoses?.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                    <Stethoscope className="h-4 w-4 text-blue-600" />
                    Diagnoses
                  </h4>
                  <ul className="space-y-1">
                    {document.extracted_entities.diagnoses.map((diag, index) => (
                      <li key={index} className="text-sm text-gray-600">{diag.text}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {document.extracted_entities.lab_results?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-purple-600" />
                    Lab Results
                  </h4>
                  <ul className="space-y-1">
                    {document.extracted_entities.lab_results.map((lab: { test?: string; component?: string; value?: string; unit?: string }, index: number) => (
                      <li key={index} className="text-sm text-gray-600">
                        {(lab as any).test || (lab as any).component}: {lab.value} {lab.unit}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {/* Document Info */}
          <div className="card">
            <h3 className="font-medium text-gray-900 mb-4">Document Info</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">File Name</dt>
                <dd className="text-gray-900 truncate max-w-[150px]">{document.file_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Size</dt>
                <dd className="text-gray-900">{formatFileSize(document.file_size)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Status</dt>
                <dd className="text-gray-900 capitalize">{document.status}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Source</dt>
                <dd className="text-gray-900 capitalize">{document.source}</dd>
              </div>
            </dl>
          </div>
          
          {/* Warnings */}
          {document.ai_insights?.warnings && document.ai_insights.warnings.length > 0 && (
            <div className="card border-yellow-300 bg-yellow-50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <h3 className="font-medium text-yellow-800">Important Notes</h3>
              </div>
              <ul className="space-y-2">
                {document.ai_insights.warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-yellow-700">• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
