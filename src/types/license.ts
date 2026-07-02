export const LICENSE_STATUSES = ["Active", "Expiring", "Expired", "Suspended"] as const;
export type LicenseStatus = (typeof LICENSE_STATUSES)[number];

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
