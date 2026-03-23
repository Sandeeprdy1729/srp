import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Calendar, Activity } from 'lucide-react';
import { sharingApi } from '@/services/api';

export default function ShareViewPage() {
  const { token } = useParams<{ token: string }>();
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (token) {
      fetchSharedDocument(token);
    }
  }, [token]);
  
  const fetchSharedDocument = async (shareToken: string) => {
    try {
      const response = await sharingApi.getByToken(shareToken);
      setDocument(response.data);
    } catch (error: any) {
      if (error.response?.status === 410) {
        setError('This link has expired or been revoked');
      } else if (error.response?.status === 404) {
        setError('Invalid sharing link');
      } else {
        setError('Failed to load document');
      }
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Unable to Access</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Shared Health Document</h1>
          <p className="text-gray-500">View only - Shared via AarogyaKosha</p>
        </div>
        
        {/* Document Card */}
        <div className="card mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-4 bg-primary-100 rounded-lg">
              <FileText className="h-8 w-8 text-primary-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">{document?.title}</h2>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {document?.document_date 
                    ? new Date(document.document_date).toLocaleDateString()
                    : 'Date not specified'}
                </span>
                <span className="px-2 py-1 bg-gray-100 rounded-full text-xs capitalize">
                  {document?.document_type?.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
          
          {/* AI Summary */}
          {document?.ai_summary && (
            <div className="p-4 bg-primary-50 rounded-lg mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-5 w-5 text-primary-600" />
                <h3 className="font-medium text-primary-900">AI Summary</h3>
              </div>
              <p className="text-primary-800">{document.ai_summary}</p>
            </div>
          )}
          
          {/* File Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-500">File Name</p>
              <p className="text-sm font-medium text-gray-900 truncate">{document?.file_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">File Type</p>
              <p className="text-sm font-medium text-gray-900">{document?.mime_type}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Views</p>
              <p className="text-sm font-medium text-gray-900">{document?.access_count}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Access</p>
              <p className="text-sm font-medium text-green-600">View Only</p>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>This document was shared securely via AarogyaKosha</p>
          <p className="mt-1">You are viewing a read-only copy</p>
        </div>
      </div>
    </div>
  );
}
