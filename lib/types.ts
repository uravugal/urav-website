export type Role = "student" | "recruiter" | "admin" | "superadmin";

/** Roles that may enter /admin. */
export const ADMIN_ROLES: Role[] = ["admin", "superadmin"];
export function isAdminRole(role?: string): boolean {
  return role === "admin" || role === "superadmin";
}
export function isSuperAdmin(role?: string): boolean {
  return role === "superadmin";
}

/** Envelope returned by any list endpoint called with ?page=… */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** Only meaningful for recruiters — read fresh from the DB by /api/auth/me. */
  approvalStatus?: ApprovalStatus;
  companyName?: string;
}

export interface JobItem {
  _id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  experience?: string;
  salary?: string;
  description?: string;
  skills?: string[];
  active?: boolean;
  createdAt?: string;
  postedByRole?: "admin" | "recruiter";
  postedBy?:
    | string
    | {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
        companyName?: string;
      }
    | null;
}

/** A slide in the homepage hero slider. */
export interface HeroSlideItem {
  _id: string;
  title: string;
  description?: string;
  /** Wide banner, used from the `md` breakpoint up. */
  desktopImageUrl: string;
  desktopImageKey?: string;
  /** Taller crop for phones. Falls back to the desktop image when empty. */
  mobileImageUrl?: string;
  mobileImageKey?: string;
  /** "light" = white copy over a dark scrim; "dark" = navy copy over a light one. */
  textTone?: "light" | "dark";
  order?: number;
  active?: boolean;
  createdAt?: string;
}

export interface WebinarItem {
  _id: string;
  title: string;
  speaker: string;
  date: string;
  time: string;
  description?: string;
  /** Uploaded cover image. Empty when the admin didn't add one. */
  imageUrl?: string;
  imageKey?: string;
  /**
   * Always set by the webinar API — the uploaded image, or the built-in
   * placeholder. Use this for rendering.
   */
  displayImageUrl?: string;
  live?: boolean;
  active?: boolean;
  createdAt?: string;
}

export interface StudentRecord {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dob?: string;
  gender?: string;
  studentType?: "School Student" | "College Student";
  // College
  college?: string;
  degree?: string;
  department?: string;
  currentYear?: string;
  // School
  schoolName?: string;
  classGrade?: string;
  board?: string;
  schoolStream?: string;
  // Shared
  graduationYear?: string;
  cgpa?: string;
  linkedin?: string;
  github?: string;
  resumeUrl?: string;
  resumeKey?: string;
  createdAt?: string;
}

/** An admin / superadmin account, as listed in the Admins screen. */
export interface AdminRecord {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: "admin" | "superadmin";
  createdAt?: string;
}

export interface ApplicationItem {
  _id: string;
  kind: "job" | "webinar";
  status: string;
  note?: string;
  resumeUrl?: string;
  createdAt?: string;
  job?: JobItem | null;
  webinar?: WebinarItem | null;
  user?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    college?: string;
    degree?: string;
    resumeUrl?: string;
  } | null;
}

export interface RecruiterRecord {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName?: string;
  designation?: string;
  companyWebsite?: string;
  companyLocation?: string;
  industry?: string;
  companySize?: string;
  companyAbout?: string;
  linkedin?: string;
  approvalStatus?: ApprovalStatus;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt?: string;
  /** Added by /api/admin/recruiters */
  jobCount?: number;
  activeJobCount?: number;
  applicantCount?: number;
}

/* ------------------------------------------------------------------ */
/* Consultations                                                       */
/* ------------------------------------------------------------------ */

export const CONSULTATION_STATUSES = [
  "New",
  "In Progress",
  "Responded",
  "Closed",
] as const;

export type ConsultationStatus = (typeof CONSULTATION_STATUSES)[number];

/**
 * A consultation request sent from the public consultation form.
 *
 * `internalNote` and `handledBy` are stripped by the student-facing
 * `/api/consultations` route and only ever populated for admins.
 */
export interface ConsultationRecord {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  studentType?: "School Student" | "College Student" | "Other";
  institution?: string;
  topic: string;
  preferredMode?: "Email" | "Phone Call" | "Video Call";
  preferredTime?: string;
  message: string;
  status: ConsultationStatus;
  response?: string;
  respondedAt?: string;
  createdAt?: string;
  /** Admin view only. */
  internalNote?: string;
  /** Populated when the sender was a signed-in student. */
  user?:
    | string
    | {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        resumeUrl?: string;
        studentType?: string;
      }
    | null;
  handledBy?:
    | string
    | { _id: string; firstName: string; lastName: string; email: string }
    | null;
}

/* ------------------------------------------------------------------ */
/* Contact page                                                        */
/* ------------------------------------------------------------------ */

/**
 * The editable contact details behind /contact.
 *
 * Every field is optional: an empty one is hidden on the public page rather
 * than rendered blank, so a superadmin can leave out the parts that don't
 * apply. `_id` is absent while the built-in defaults are being shown.
 */
export interface ContactInfoRecord {
  _id?: string;
  intro?: string;
  email?: string;
  altEmail?: string;
  phone?: string;
  altPhone?: string;
  whatsapp?: string;
  address?: string;
  hours?: string;
  updatedAt?: string;
  updatedBy?:
    | string
    | { _id: string; firstName: string; lastName: string; email: string }
    | null;
}

export const CONTACT_MESSAGE_STATUSES = [
  "New",
  "Read",
  "Replied",
  "Closed",
] as const;

export type ContactMessageStatus = (typeof CONTACT_MESSAGE_STATUSES)[number];

/** A message sent from the contact form. `internalNote` and `ip` are admin-only. */
export interface ContactMessageRecord {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  status: ContactMessageStatus;
  reply?: string;
  repliedAt?: string;
  createdAt?: string;
  /** Admin view only. */
  internalNote?: string;
  ip?: string;
  dayKey?: string;
  /** Populated when the sender was signed in. */
  user?:
    | string
    | {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        role?: string;
      }
    | null;
  handledBy?:
    | string
    | { _id: string; firstName: string; lastName: string; email: string }
    | null;
}
