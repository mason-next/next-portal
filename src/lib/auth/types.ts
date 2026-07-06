export interface SessionUser {
  id: string;
  name: string;
  email: string;
  /** All role types assigned to this user. Replaces the old accountType + roleType pair. */
  roleTypes: string[];
  /** True when the user must change their password before accessing the app. */
  mustChangePassword?: boolean;
}
