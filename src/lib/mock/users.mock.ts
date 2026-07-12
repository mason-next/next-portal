import type { AppUser, UserCertification } from "@/types/user";

const SEEDED_AT = "2026-01-01T00:00:00.000Z";

const DEFAULTS: {
  location: string;
  emergencyContact: string;
  mustChangePassword: boolean;
  certifications: UserCertification[];
  lastActiveAt: null;
} = {
  location: "",
  emergencyContact: "",
  mustChangePassword: false,
  certifications: [],
  lastActiveAt: null,
};

export const SAMPLE_USERS: AppUser[] = [
  {
    ...DEFAULTS,
    id: "user-dana-whitfield",
    name: "Dana Whitfield",
    title: "Project Manager",
    email: "dana.whitfield@nextops.com",
    phone: "(555) 201-4471",
    avatarUrl: null,
    roleTypes: ["ProjectManagement"],
    isActive: true,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    ...DEFAULTS,
    id: "user-marcus-reed",
    name: "Marcus Reed",
    title: "Solutions Executive",
    email: "marcus.reed@nextops.com",
    phone: "(555) 201-7732",
    avatarUrl: null,
    roleTypes: ["Sales"],
    isActive: true,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    ...DEFAULTS,
    id: "user-priya-subramaniam",
    name: "Priya Subramaniam",
    title: "Solutions Engineer",
    email: "priya.subramaniam@nextops.com",
    phone: "(555) 201-9015",
    avatarUrl: null,
    roleTypes: ["Engineering"],
    isActive: true,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    ...DEFAULTS,
    id: "user-carlos-ibarra",
    name: "Carlos Ibarra",
    title: "Lead Technician",
    email: "carlos.ibarra@nextops.com",
    phone: "(555) 201-3360",
    avatarUrl: null,
    roleTypes: ["Installation"],
    isActive: true,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    ...DEFAULTS,
    id: "user-juan-lazo",
    name: "Juan Lazo",
    title: "Administrator",
    email: "jlazo@mason247.com",
    phone: "(555) 201-1100",
    avatarUrl: null,
    roleTypes: ["Management", "Administrator"],
    isActive: true,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    ...DEFAULTS,
    id: "user-sandra-verissimo",
    name: "Sandra Verissimo",
    title: "Sr. Inside Project Manager",
    email: "sverissimo@mason247.com",
    phone: "(555) 201-5588",
    avatarUrl: null,
    roleTypes: ["ProjectManagement"],
    isActive: true,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    ...DEFAULTS,
    id: "user-alex-behan",
    name: "Alex Behan",
    title: "Inside Project Manager",
    email: "abehan@mason247.com",
    phone: "(555) 201-6694",
    avatarUrl: null,
    roleTypes: ["ProjectManagement"],
    isActive: true,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
];
