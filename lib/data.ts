import {
  Mic2,
  Video,
  Award,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

export const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Courses", href: "/courses" },
  { label: "Webinars", href: "/webinars" },
  { label: "Jobs", href: "/jobs" },
  { label: "Consultation", href: "/consultation" },
  { label: "Contact", href: "/contact" },
];

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const features: Feature[] = [
  { icon: Mic2, title: "Expert Speakers", description: "Learn from industry experts" },
  { icon: Video, title: "Live Webinars", description: "Interactive & engaging" },
  { icon: Award, title: "Certifications", description: "Boost your career" },
  { icon: Briefcase, title: "Job Opportunities", description: "Find the perfect job" },
];

export interface Webinar {
  title: string;
  date: string;
  time: string;
  speaker: string;
  live?: boolean;
  // Dummy placeholder for now. Swap to a real image path in /public later.
  image?: string;
}

export const webinars: Webinar[] = [
  {
    title: "AI in Business Transformation",
    date: "May 24, 2024",
    time: "10:00 AM",
    speaker: "Dr. Sarah Johnson",
    live: true,
    image: "/placeholders/webinar.jpg",
  },
  {
    title: "Marketing Strategies for 2024",
    date: "May 28, 2024",
    time: "11:00 AM",
    speaker: "Michael Smith",
    image: "/placeholders/webinar.jpg",
  },
  {
    title: "Data Analytics with Python",
    date: "May 30, 2024",
    time: "02:00 PM",
    speaker: "David Brown",
    image: "/placeholders/webinar.jpg",
  },
];

export interface Job {
  title: string;
  company: string;
  location: string;
  type: string;
  posted: string;
}

export const jobs: Job[] = [
  {
    title: "Frontend Developer",
    company: "TechNova Solutions",
    location: "Remote",
    type: "Full Time",
    posted: "2h ago",
  },
  {
    title: "Business Analyst",
    company: "InnovateX",
    location: "Bangalore",
    type: "Full Time",
    posted: "5h ago",
  },
  {
    title: "UI/UX Designer",
    company: "Pixel Perfect",
    location: "Hybrid",
    type: "Full Time",
    posted: "1d ago",
  },
];

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

export const footerColumns: FooterColumn[] = [
  {
    heading: "Quick Links",
    links: [
      { label: "Home", href: "/" },
      { label: "About Us", href: "/about" },
      { label: "Services", href: "/services" },
      { label: "Webinars", href: "/webinars" },
      { label: "Jobs", href: "/jobs" },
      { label: "Consultation", href: "/consultation" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "For Students",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Webinars", href: "/webinars" },
      { label: "Jobs", href: "/jobs" },
      { label: "Consultation", href: "/consultation" },
      { label: "Profile", href: "/dashboard" },
    ],
  },
  {
    heading: "For Recruiters",
    links: [
      { label: "Dashboard", href: "/admin" },
      { label: "Post a Job", href: "/admin/jobs" },
      { label: "Candidates", href: "/admin/students" },
      { label: "Interviews", href: "/admin/applications" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];
