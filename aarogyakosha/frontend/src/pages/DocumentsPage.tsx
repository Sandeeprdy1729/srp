import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Search, 
  Plus, 
  Calendar,
  FileWarning
} from 'lucide-react';
import { documentsApi } from '@/services/api';
import type { Document } from '@/types';
import toast from 'react-hot-toast';

const documentTypeLabels: Record<string, string> = {
  prescription: 'Prescription',
  lab_report: 'Lab Report',
  discharge_summary: 'Discharge Summary',
  op_consultation: 'OP Consultation',
  immunization: 'Immunization',
  wellness_record: 'Wellness Record',
  health_document: 'Health Document',
  other: 'Other',
};

const statusColors: Record<string, string> = {
  pending: 'text-yellow-600 bg-yellow-100',
  processing: 'text-blue-600 bg-blue-100',
  completed: 'text-green-600 bg-green-100',
  failed: 'text-red-600 bg-red-100',
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  useEffect(() => {
    fetchDocuments();
  }, [page, filterType, search]);
  
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await documentsApi.list({
        page,
        page_size: 20,
        document_type: filterType || undefined,
        search: search || undefined,
      });
      setDocuments(response.data.items);
      setTotalPages(response.data.pages);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-500">Manage your medical records</p>
        </div>
        <Link to="/upload" className="btn-primary flex items-center gap-2 w-fit">
          <Plus className="h-4 w-4" />
          Upload Document
        </Link>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="input-field w-full sm:w-48"
        >
          <option value="">All Types</option>
          {Object.entries(documentTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      ) : documents.length ? (
        <div className="space-y-4">
          {documents.map((doc) => (
            <Link
              key={doc.id}
              to={`/documents/${doc.id}`}
              className="card-hover flex items-center gap-4"
            >
              <div className="p-3 bg-gray-100 rounded-lg">
                <FileText className="h-6 w-6 text-gray-600" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900 truncate">{doc.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[doc.status]}`}>
                    {doc.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                  <span>{documentTypeLabels[doc.document_type]}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>
                  <span>{formatFileSize(doc.file_size)}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {doc.ai_summary && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                    AI Summary
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <FileWarning className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
          <p className="text-gray-500 mb-4">
            {search || filterType 
              ? 'Try adjusting your filters' 
              : 'Upload your first medical document to get started'}
          </p>
          <Link to="/upload" className="btn-primary inline-flex">
            Upload Document
          </Link>
        </div>
      )}
      
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-700">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
