export type Role = "owner" | "supervisor" | "viewer";

export type AttendanceStatus = "present" | "absent" | "unknown";

export interface Company {
  id: string;
  name: string;
  created_at: string;
}

export interface Site {
  id: string;
  company_id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface Worker {
  id: string;
  company_id: string;
  site_id: string | null;
  name: string;
  worker_code: string | null;
  active: boolean;
  created_at: string;
}

export interface AttendanceSheet {
  id: string;
  company_id: string;
  site_id: string;
  sheet_date: string;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceEntry {
  id: string;
  sheet_id: string;
  worker_id: string;
  status: AttendanceStatus;
  in_time: string | null;
  out_time: string | null;
  note: string | null;
  updated_at: string;
}

export interface Member {
  id: string;
  company_id: string;
  user_id: string;
  role: Role;
  created_at: string;
}

export interface UserContext {
  user: {
    id: string;
    email: string | null;
    full_name: string | null;
  };
  company: Company | null;
  member: Member | null;
  role: Role | null;
}

export type OwnerContext = UserContext & { company: Company };