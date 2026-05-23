import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type OrbitType = 'FORGE' | 'LABS' | 'CORE' | 'OPEN' | 'INTELLIGENCE';
export type MemberRole = 'MEMBER' | 'ORBIT_LEAD' | 'NETWORK_COUNCIL' | 'ARCHITECTURE_BOARD';
export type TaskStatus = 'PENDING' | 'IN_REVIEW' | 'COMPLETE';
export type PromotionStatus = 'PENDING' | 'APPROVED' | 'DEFERRED';
export type OnboardingStage = 'IDENTITY' | 'TRAINING' | 'ORIENTATION' | 'AGREEMENT' | 'APPROVAL' | 'COMPLETE';
export type DocumentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface Member {
  id: string;
  name: string;
  email: string;
  orbit: OrbitType;
  level: number;
  role: MemberRole;
  contribution_score: number;
  skills: string[];
  joined_at: string;
  onboarding_stage: OnboardingStage;
  onboarding_complete: boolean;
}

export interface Document {
  id: string;
  member_id: string;
  category: string;
  document_type: string;
  status: DocumentStatus;
  storage_path: string;
  file_name: string;
  uploaded_by: string | null;
  uploaded_at: string;
  notes: string | null;
}

export interface Agreement {
  id: string;
  title: string;
  type: string;
  version: number;
  orbit: OrbitType | null;
  required_level: number;
  content: string;
  created_by: string | null;
  created_at: string;
}

export interface AgreementAcceptance {
  id: string;
  agreement_id: string;
  member_id: string;
  version: number;
  accepted_at: string;
  signature: string | null;
  notes: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  orbit: OrbitType;
  assignee_id: string;
  created_by: string | null;
  deadline: string;
  status: TaskStatus;
  artifact_url: string | null;
  notes: string | null;
  created_at: string;
  assignee?: Member;
  reviews?: Review[];
}

export interface Review {
  id: string;
  task_id: string;
  reviewer_id: string;
  quality_score: number;
  collaboration_score: number;
  notes: string | null;
  created_at: string;
  reviewer?: Member;
}

export interface Promotion {
  id: string;
  member_id: string;
  from_level: number;
  to_level: number;
  status: PromotionStatus;
  scorecard: Record<string, unknown>;
  notes: string | null;
  requested_at: string;
  decided_at: string | null;
  decided_by: string | null;
  member?: Member;
}

export interface Message {
  id: string;
  sender_id: string;
  channel_id: string | null;
  recipient_id: string | null;
  content: string;
  sent_at: string;
  sender?: Member;
}

export const ORBIT_LABELS: Record<OrbitType, string> = {
  FORGE: 'Orbit Forge', LABS: 'Orbit Labs', CORE: 'Orbit Core', OPEN: 'Orbit Open', INTELLIGENCE: 'Orbit Intelligence',
};

export const ORBIT_SHORT: Record<OrbitType, string> = {
  FORGE: 'Forge', LABS: 'Labs', CORE: 'Core', OPEN: 'Open', INTELLIGENCE: 'Intelligence',
};

export const ORBIT_COLORS: Record<OrbitType, string> = {
  FORGE: '#1D9E75', LABS: '#7F77DD', CORE: '#888780', OPEN: '#BA7517', INTELLIGENCE: '#378ADD',
};

export const LEVEL_ROLES: Record<number, string> = {
  0: 'Applicant', 1: 'Explorer', 2: 'Builder', 3: 'Contributor', 4: 'Specialist', 5: 'Lead Builder', 6: 'Architect', 7: 'Vision Lead',
};

export const ROLE_LABELS: Record<MemberRole, string> = {
  MEMBER: 'Member', ORBIT_LEAD: 'Orbit Lead', NETWORK_COUNCIL: 'Network Council', ARCHITECTURE_BOARD: 'Architecture Board',
};

export const PROMOTION_THRESHOLD = 7.5;
export const MIN_TASKS_FOR_PROMOTION = 5;
