export const LICENSE_STATUSES = ["Active", "Expiring", "Expired", "Suspended"] as const;
export type LicenseStatus = (typeof LICENSE_STATUSES)[number];

export interface LicenseAttachment {
  storedName: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface License {
  id: string;
  state: string;
  licenseType: string;
  licenseNumber: string;
  holderName: string;
  renewalDate: string | null;
  renewalRequirements: string;
  status: LicenseStatus;
  notes: string;
  attachments: LicenseAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateLicenseInput {
  state: string;
  licenseType: string;
  licenseNumber: string;
  holderName: string;
  renewalDate: string | null;
  renewalRequirements: string;
  status: LicenseStatus;
  notes: string;
}
