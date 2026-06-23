export interface AppUser {
  id: string;
  name: string;
  title: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewUserInput {
  name: string;
  title: string;
  email: string;
  avatarUrl: string | null;
}
