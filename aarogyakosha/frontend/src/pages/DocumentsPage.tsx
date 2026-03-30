import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, Filter, ChevronRight, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { documentsApi } from '@/services/api';
import { Document } from '@/types';
import { format, parseISO } from 'date-fns';

const TYPE_LABELS: Record<string, string> = {
  prescription: 'Prescription',
  lab_report: 'Lab Report',
  discharge_summary: 'Discharge Summary',
  op_consultation: 'OP Consultation',
  immunization: 'Immunization',
  wellness_record: 'Wellness',
  health_document: 'Health Document',
  other: 'Other',
};

const STATUS_MAP: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  completed: { icon: CheckCircle2, color: 'text-emerald-600', label: 'Processed' },
  processing: { icon: Loader2, color: 'text-gray-900 animate-spin', label: 'Processing' },
  pending: { icon: Clock, color: 'text-amber-500', label: 'Pending' },
  failed: { icon: AlertCircle, color: 'text-red-500', label: 'Failed' },
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    setLoading(true);
    const params: any = { page, page_size: pageSize };
    if (search) params.search = search;
    if (typeFilter) params.document_type = typeFilter;
    documentsApi.list(params)
      .then(r => {
        const data = r.data;
        setDocs(Array.isArray(data) ? data : data.items || []);
        setTotal(data.total ?? (Array.isArray(data) ? data.length : 0));
      })
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, [search, typeFilter, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} record{total !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/upload" className="btn-primary text-sm px-4 py-2">Upload</Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="input pl-10"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            className="input pl-10 pr-8 appearance-none cursor-pointer min-w-[160px]"
          >
            <option value="">All types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Document List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-5 h-5 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <div className="card text-center py-16">
          <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-1">No documents found</p>
          <Link to="/upload" className="text-sm text-gray-900 hover:underline font-medium">Upload your first document</Link>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {docs.map(doc => {
            const s = STATUS_MAP[doc.status] || STATUS_MAP.pending;
            const StatusIcon = s.icon;
            return (
              <Link key={doc.id} to={`/documents/${doc.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.title || doc.file_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="badge-gray text-[11px]">{TYPE_LABELS[doc.document_type] || doc.document_type}</span>
                    {doc.source_hospital && (
                      <span className="text-xs text-gray-400">{doc.source_hospital}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs">
                      <StatusIcon className={`h-3.5 w-3.5 ${s.color}`} />
                      <span className="text-gray-500">{s.label}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {doc.created_at ? format(parseISO(doc.created_at), 'dd MMM yyyy') : ''}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn px-3 py-1.5 text-sm disabled:opacity-40">Previous</button>
          <span className="text-sm text-gray-500">{page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn px-3 py-1.5 text-sm disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
