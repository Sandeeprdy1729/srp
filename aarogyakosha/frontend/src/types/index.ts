// Type definitions for AarogyaKosha

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  role: 'patient' | 'doctor' | 'admin';
  is_active: boolean;
  is_verified: boolean;
  abha_number?: string;
  abha_address?: string;
  created_at: string;
  last_login?: string;
}

export interface Patient {
  id: string;
  user_id: string;
  display_name: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  allergies: string[];
  medical_conditions: string[];
  current_medications: string[];
  created_at: string;
}

export interface Document {
  id: string;
  patient_id: string;
  user_id: string;
  title: string;
  document_type: DocumentType;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_name: string;
  file_size: number;
  mime_type: string;
  extracted_text?: string;
  ai_summary?: string;
  ai_insights?: AIInsights;
  extracted_entities?: ExtractedEntities;
  fhir_document_id?: string;
  document_date?: string;
  source: string;
  source_hospital?: string;
  created_at: string;
  processed_at?: string;
}

export type DocumentType = 
  | 'prescription'
  | 'lab_report'
  | 'discharge_summary'
  | 'op_consultation'
  | 'immunization'
  | 'wellness_record'
  | 'health_document'
  | 'other';

export interface AIInsights {
  summary: string;
  key_findings: string[];
  document_type: string;
  confidence: number;
  language: string;
  translated_summary?: string;
  action_items: string[];
  warnings: string[];
}

export interface ExtractedEntities {
  medications: Entity[];
  diagnoses: Entity[];
  procedures: Entity[];
  lab_results: Entity[];
  vitals: Entity[];
  dates: Entity[];
  negated_mentions: Entity[];
}

export interface Entity {
  text?: string;
  type: string;
  confidence?: number;
  dosage?: string;
  value?: string;
  unit?: string;
  test?: string;
  component?: string;
  vital?: string;
}

export interface SharingLink {
  id: string;
  token: string;
  share_url: string;
  purpose?: string;
  expires_at?: string;
  access_count: number;
  created_at: string;
}

export interface FamilyAccess {
  id: string;
  member_id: string;
  member_name: string;
  member_email: string;
  relationship_type?: string;
  can_view: boolean;
  can_upload: boolean;
  can_share: boolean;
  can_manage_consent: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Consent {
  id: string;
  consent_id: string;
  purpose: string;
  hi_types: string[];
  status: 'pending' | 'granted' | 'denied' | 'expired' | 'revoked';
  from_date?: string;
  to_date?: string;
  access_count: number;
  created_at: string;
}

export interface DashboardStats {
  total_documents: number;
  documents_this_month: number;
  pending_documents: number;
  recent_activities: Activity[];
  health_trends: Record<string, any>;
  upcoming_reminders: Reminder[];
}

export interface Activity {
  type: string;
  action: string;
  title: string;
  document_type: string;
  timestamp: string;
}

export interface Reminder {
  id: string;
  title: string;
  due_date: string;
  type: string;
}

export interface HealthSummary {
  recent_documents: Document[];
  active_medications: Medication[];
  recent_labs: LabResult[];
  risk_factors: string[];
  recommendations: Recommendation[];
}

export interface Medication {
  name: string;
  dosage?: string;
  frequency?: string;
  instructions?: string;
}

export interface LabResult {
  component: string;
  value: string;
  unit?: string;
  reference_range?: string;
  interpretation?: string;
  date?: string;
}

export interface Recommendation {
  category: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  evidence: string[];
}

export interface CorrelationFinding {
  type: string;
  description: string;
  confidence: number;
  related_records: string[];
  clinical_significance: string;
  recommendation?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface ApiError {
  detail: string;
}
