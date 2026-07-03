export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  current_company?: string;
  current_title?: string;
  years_experience?: number;
  skills?: string;
  resume_path?: string;
  cover_letter_template?: string;
  preferences?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SearchQuery {
  id: string;
  user_id: string;
  job_titles: string;
  companies?: string;
  locations?: string;
  experience_level?: string;
  keywords?: string;
  sources?: string;
  is_active: boolean;
  created_at: string;
  last_run_at?: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  company_website?: string;
  company_career_page?: string;
  location?: string;
  description?: string;
  required_experience?: string;
  salary_range?: string;
  job_url?: string;
  source: string;
  status: string;
  posted_date?: string;
  discovered_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface Application {
  id: string;
  job_id: string;
  contact_name?: string;
  contact_title?: string;
  contact_email?: string;
  contact_linkedin?: string;
  email_subject?: string;
  email_body?: string;
  email_status: string;
  application_status: string;
  sent_at?: string;
  first_reply_at?: string;
  last_contact_at?: string;
  follow_up_count: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  job?: { title: string; company: string };
}

export interface EmailThread {
  id: string;
  application_id: string;
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  is_incoming: boolean;
  is_read: boolean;
  sent_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface DashboardStats {
  total_jobs: number;
  total_applications: number;
  replied: number;
  by_status: Record<string, number>;
  by_email_status: Record<string, number>;
}
