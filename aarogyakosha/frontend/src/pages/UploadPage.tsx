import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { uploadApi, patientsApi } from '@/services/api';
import type { Patient } from '@/types';
import toast from 'react-hot-toast';

const documentTypes = [
  { value: 'prescription', label: 'Prescription' },
  { value: 'lab_report', label: 'Lab Report' },
  { value: 'discharge_summary', label: 'Discharge Summary' },
  { value: 'op_consultation', label: 'OP Consultation' },
  { value: 'immunization', label: 'Immunization Record' },
  { value: 'wellness_record', label: 'Wellness Record' },
  { value: 'health_document', label: 'Health Document' },
  { value: 'other', label: 'Other' },
];

export default function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [documentType, setDocumentType] = useState('other');
  const [documentDate, setDocumentDate] = useState('');
  const [sourceHospital, setSourceHospital] = useState('');
  
  useState(() => {
    patientsApi.list().then(res => {
      setPatients(res.data);
      if (res.data.length > 0) {
        setSelectedPatient(res.data[0].id);
      }
    }).catch(() => {});
  });
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      setFiles(prev => [...prev, ...Array.from(selectedFiles)]);
    }
  };
  
  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };
  
  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select at least one file');
      return;
    }
    
    setUploading(true);
    
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
        formData.append('document_type', documentType);
        formData.append('patient_id', selectedPatient);
        if (documentDate) {
          formData.append('document_date', documentDate);
        }
        if (sourceHospital) {
          formData.append('source_hospital', sourceHospital);
        }
        
        await uploadApi.upload(formData);
      }
      
      toast.success(`${files.length} file(s) uploaded successfully!`);
      navigate('/documents');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Documents</h1>
        <p className="text-gray-500">Add medical records to your vault</p>
      </div>
      
      {/* File Upload Area */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-400 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.tiff"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-700">
          Click to upload or drag and drop
        </p>
        <p className="text-sm text-gray-500 mt-1">
          PDF, Images (JPG, PNG) up to 50MB each
        </p>
      </div>
      
      {/* Selected Files */}
      {files.length > 0 && (
        <div className="card">
          <h3 className="font-medium text-gray-900 mb-3">Selected Files ({files.length})</h3>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Document Details */}
      <div className="card">
        <h3 className="font-medium text-gray-900 mb-4">Document Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Patient
            </label>
            <select
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="input-field"
            >
              {patients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.display_name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Type
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="input-field"
            >
              {documentTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Date (optional)
            </label>
            <input
              type="date"
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
              className="input-field"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source Hospital (optional)
            </label>
            <input
              type="text"
              value={sourceHospital}
              onChange={(e) => setSourceHospital(e.target.value)}
              placeholder="e.g., Apollo Hospital"
              className="input-field"
            />
          </div>
        </div>
      </div>
      
      {/* Upload Button */}
      <div className="flex justify-end gap-4">
        <button
          onClick={() => navigate('/documents')}
          className="btn-secondary"
          disabled={uploading}
        >
          Cancel
        </button>
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          className="btn-primary flex items-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload {files.length} File{files.length !== 1 ? 's' : ''}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
