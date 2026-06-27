export interface Subcontractor {
  id: string;
  name: string;
  trade: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// A resolved technician entry — either an internal user or a subcontractor company.
export interface ProjectTechnicianEntry {
  id: string;                    // ProjectTechnician.id
  userId: string | null;
  userName: string | null;
  avatarUrl: string | null;
  subcontractorId: string | null;
  subcontractorName: string | null;
  trade: string;
}
