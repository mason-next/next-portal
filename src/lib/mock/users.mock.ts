import type { AppUser } from "@/types/user";

const SEEDED_AT = "2026-01-01T00:00:00.000Z";

export const SAMPLE_USERS: AppUser[] = [
  {
    id: "user-dana-whitfield",
    name: "Dana Whitfield",
    title: "Project Manager",
    email: "dana.whitfield@nextops.com",
    avatarUrl: null,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    id: "user-marcus-reed",
    name: "Marcus Reed",
    title: "Solutions Executive",
    email: "marcus.reed@nextops.com",
    avatarUrl: null,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    id: "user-priya-subramaniam",
    name: "Priya Subramaniam",
    title: "Solutions Engineer",
    email: "priya.subramaniam@nextops.com",
    avatarUrl: null,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    id: "user-carlos-ibarra",
    name: "Carlos Ibarra",
    title: "Lead Technician",
    email: "carlos.ibarra@nextops.com",
    avatarUrl: null,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
];
