import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, File, Image, CheckCircle2, AlertCircle } from 'lucide-react';
import { uploadApi, patientsApi } from '@/services/api';
import { Patient } from '@/types';
import toast from 'react-hot-toast';

const DOC_TYPES = [
  { value: 'prescription', label: 'Prescription' },
  { value: 'lab_report', label: 'Lab Report' },
  { value: 'discharge_summary', label: 'Discharge Summary' },
  { value: 'op_consultation', label: 'OP Consultation' },
  { value: 'immunization', label: 'Immunization' },
  { value: 'wellness_record', label: 'Wellness Record' },
  { value: 'health_document', label: 'Health Document' },
  { value: 'other', label: 'Other' },
];

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

export default function UploadPage() {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [docType, setDocType] = useState('health_document');
  const [title, setTitle] = useState('');
  const [hospital, setHospital] = useState('');
  const [uploading, setUploading] = useState(false);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    patientsApi.list().then(r => {
      const list = Array.isArray(r.data) ? r.data : r.data.items || [];
      setPatients(list);
      if (list.length > 0) setSelectedPatient(list[0].id);
    }).catch(() => {});
  }, []);

  const autoCreatePatient = async () => {
    setCreatingPatient(true);
    try {
      const res = await patientsApi.create({ display_name: 'My Profile' });
      const p = res.data;
      setPatients([p]);
      setSelectedPatient(p.id);
      toast.success('Patient profile created');
    } catch {
      toast.error('Could not create patient profile');
    } finally {
      setCreatingPatient(false);
    }
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles)
      .filter(f => f.type === 'application/pdf' || f.type.startsWith('image/') || f.type === 'application/msword' || f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      .map(f => ({ file: f, id: crypto.randomUUID(), status: 'pending' as const }));
    if (arr.length === 0) {
      toast.error('Unsupported file type. Use PDF, images, or Word docs.');
      return;
    }
    setFiles(prev => [...prev, ...arr]);
    if (!title && arr.length === 1) {
      setTitle(arr[0].file.name.replace(/\.[^.]+$/, ''));
    }
  }, [title]);

  const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id));

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleUpload = async () => {
    if (!files.length) return toast.error('Add at least one file');
    if (!selectedPatient) return toast.error('Please select or create a patient');

    setUploading(true);
    let success = 0;
    for (const uf of files) {
      if (uf.status === 'done') { success++; continue; }
      setFiles(prev => prev.map(f => f.id === uf.id ? { ...f, status: 'uploading' } : f));
      try {
        const fd = new FormData();
        fd.append('file', uf.file);
        fd.append('title', title || uf.file.name);
        fd.append('document_type', docType);
        fd.append('patient_id', selectedPatient);
        if (hospital) fd.append('source_hospital', hospital);
        await uploadApi.upload(fd);
        setFiles(prev => prev.map(f => f.id === uf.id ? { ...f, status: 'done' } : f));
        success++;
      } catch (e: any) {
        const msg = e.response?.data?.detail || 'Upload failed';
        setFiles(prev => prev.map(f => f.id === uf.id ? { ...f, status: 'error', error: msg } : f));
      }
    }
    setUploading(false);
    if (success > 0) {
      toast.success(`${success} file${success > 1 ? 's' : ''} uploaded`);
      setTimeout(() => navigate('/documents'), 1500);
    }
  };

  const fileIcon = (mime: string) => {
    if (mime.startsWith('image/')) return Image;
    return File;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Upload Document</h1>
        <p className="text-sm text-gray-500 mt-0.5">Add health records to your vault</p>
      </div>

      {/* Patient Selection */}
      <div className="card p-6">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Patient</label>
        {patients.length === 0 ? (
          <div className="flex items-center gap-3 py-3 px-4 bg-amber-50 rounded-lg border border-amber-100">
            <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-700 flex-1">
              No patient profile found. Create one to start uploading.
            </p>
            <button onClick={autoCreatePatient} disabled={creatingPatient} className="btn-primary text-xs px-4 py-1.5">
              {creatingPatient ? 'Creating...' : 'Create Profile'}
            </button>
          </div>
        ) : (
          <select value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)} className="input">
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.display_name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInput.current?.click()}
        className={`card border-2 border-dashed cursor-pointer transition-colors
          ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
          flex flex-col items-center justify-center py-12 px-6`}
      >
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${dragOver ? 'bg-blue-100' : 'bg-gray-100'}`}>
          <Upload className={`h-6 w-6 ${dragOver ? 'text-blue-600' : 'text-gray-400'}`} />
        </div>
        <p className="text-sm font-medium text-gray-700">
          {dragOver ? 'Drop files here' : 'Click or drag files to upload'}
        </p>
        <p className="text-xs text-gray-400 mt-1">PDF, Images, Word documents</p>
        <input
          ref={fileInput}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
          onChange={e => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="card divide-y divide-gray-100">
          {files.map(uf => {
            const Icon = fileIcon(uf.file.type);
            return (
              <div key={uf.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{uf.file.name}</p>
                  <p className="text-xs text-gray-400">{(uf.file.size / 1024).toFixed(0)} KB</p>
                </div>
                {uf.status === 'done' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                {uf.status === 'error' && <span className="text-xs text-red-500">{uf.error}</span>}
                {uf.status === 'uploading' && <div className="w-4 h-4 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />}
                {uf.status === 'pending' && (
                  <button onClick={(e) => { e.stopPropagation(); removeFile(uf.id); }} className="p-1 hover:bg-gray-100 rounded">
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Document Details */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Document Details</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Blood Test Report" className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
          <select value={docType} onChange={e => setDocType(e.target.value)} className="input">
            {DOC_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hospital / Source <span className="text-gray-400">(optional)</span></label>
          <input type="text" value={hospital} onChange={e => setHospital(e.target.value)} placeholder="e.g., AIIMS Delhi" className="input" />
        </div>
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={uploading || !files.length || !selectedPatient}
        className="btn-primary w-full py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Uploading...
          </span>
        ) : (
          `Upload ${files.length || ''} File${files.length !== 1 ? 's' : ''}`
        )}
      </button>
    </div>
  );
}
