export interface AuditEntry {
  field: string;
  oldValue: string;
  newValue: string;
  user: string;
  time: string; // ISO 8601
}
