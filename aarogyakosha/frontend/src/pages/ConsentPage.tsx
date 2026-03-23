import { useEffect, useState } from 'react';
import { Shield, FileText } from 'lucide-react';
import { consentApi } from '@/services/api';
import type { Consent } from '@/types';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const statusColors: Record<string, string> = {
  pending: 'text-yellow-600 bg-yellow-100',
  granted: 'text-green-600 bg-green-100',
  denied: 'text-red-600 bg-red-100',
  expired: 'text-gray-600 bg-gray-100',
  revoked: 'text-gray-600 bg-gray-100',
};

const hiTypeLabels: Record<string, string> = {
  Prescription: 'Prescriptions',
  DiagnosticReport: 'Lab Reports',
  OPConsultation: 'Consultation Notes',
  DischargeSummary: 'Discharge Summaries',
  ImmunizationRecord: 'Immunization Records',
  HealthDocument: 'Health Documents',
};

export default function ConsentPage() {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchConsents();
  }, []);
  
  const fetchConsents = async () => {
    try {
      const response = await consentApi.list();
      setConsents(response.data);
    } catch (error) {
      toast.error('Failed to load consents');
    } finally {
      setLoading(false);
    }
  };
  
  const handleGrant = async (id: string) => {
    try {
      await consentApi.grant(id);
      toast.success('Consent granted');
      fetchConsents();
    } catch (error) {
      toast.error('Failed to grant consent');
    }
  };
  
  const handleDeny = async (id: string) => {
    try {
      await consentApi.deny(id);
      toast.success('Consent denied');
      fetchConsents();
    } catch (error) {
      toast.error('Failed to deny consent');
    }
  };
  
  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this consent?')) return;
    
    try {
      await consentApi.revoke(id);
      toast.success('Consent revoked');
      fetchConsents();
    } catch (error) {
      toast.error('Failed to revoke consent');
    }
  };
  
  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Consents</h1>
        <p className="text-gray-500">Manage your data sharing consents</p>
      </div>
      
      {/* Info Card */}
      <div className="card bg-primary-50 border-primary-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary-100 rounded-lg">
            <Shield className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h3 className="font-medium text-primary-900">Your data, your control</h3>
            <p className="text-sm text-primary-700 mt-1">
              You have full control over who can access your health records. 
              All sharing requires your explicit consent.
            </p>
          </div>
        </div>
      </div>
      
      {/* Consents List */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Consent History</h2>
        
        {consents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No consents yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {consents.map((consent) => (
              <div key={consent.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900 capitalize">{consent.purpose}</h3>
                    <p className="text-sm text-gray-500">
                      ID: {consent.consent_id}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusColors[consent.status]}`}>
                    {consent.status}
                  </span>
                </div>
                
                <div className="mb-3">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Data types:</span>{' '}
                    {consent.hi_types.map(t => hiTypeLabels[t] || t).join(', ')}
                  </p>
                  {consent.from_date && consent.to_date && (
                    <p className="text-sm text-gray-500 mt-1">
                      Valid: {new Date(consent.from_date).toLocaleDateString()} - {new Date(consent.to_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    Created {formatDistanceToNow(new Date(consent.created_at), { addSuffix: true })}
                  </p>
                  
                  {consent.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleGrant(consent.consent_id)}
                        className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                      >
                        Grant
                      </button>
                      <button
                        onClick={() => handleDeny(consent.consent_id)}
                        className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                      >
                        Deny
                      </button>
                    </div>
                  )}
                  
                  {consent.status === 'granted' && (
                    <button
                      onClick={() => handleRevoke(consent.consent_id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
