// localStorage-based template storage — swap storeTemplate/getTemplate for Supabase calls
// when the database phase begins.

export interface StoredTemplate {
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
  fileName: string;
}

export const TEMPLATE_NAMES = [
  'Welcome Letter',
  'Project Schedule',
  'Internal Kickoff Agenda',
  'Customer Kickoff Agenda',
  'Functional Narrative',
  'Customer GUI Review',
  'Engineering Packet',
  'IP Scope',
  'Drawing Request',
  'Drawing Review Checklist',
  'Walkthrough Checklist',
  'Finishes Approval',
  'Survey',
  'Daily Report',
  'Weekly Customer Update',
  'Issue Tracker',
  'Closeout Packet',
] as const;

export type TemplateName = (typeof TEMPLATE_NAMES)[number];

const key = (name: string) => `sop_template_${name}`;

export function getTemplate(name: string): StoredTemplate | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(key(name));
  return raw ? (JSON.parse(raw) as StoredTemplate) : null;
}

export function storeTemplate(name: string, file: File): Promise<StoredTemplate> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const stored: StoredTemplate = {
        name,
        mimeType: file.type,
        size: file.size,
        dataUrl,
        uploadedAt: new Date().toISOString(),
        fileName: file.name,
      };
      localStorage.setItem(key(name), JSON.stringify(stored));
      resolve(stored);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function removeTemplate(name: string): void {
  localStorage.removeItem(key(name));
}

export function downloadTemplate(name: string): boolean {
  const stored = getTemplate(name);
  if (!stored) return false;
  const link = document.createElement('a');
  link.href = stored.dataUrl;
  link.download = stored.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}
