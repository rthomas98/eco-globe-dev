"use client";

import { useEffect, useState } from "react";

export type UserRole = "buyer" | "seller" | "admin";

export type Industry =
  | "Refinery"
  | "Petrochemical"
  | "Pulp & Paper"
  | "Carbon Black"
  | "Chemicals"
  | "Construction"
  | "Other";

export type CompanySize = "Big" | "Medium" | "Startup";

export type DecisionRole =
  | "Plant Manager"
  | "Business Developer"
  | "Sustainability Manager"
  | "Trader"
  | "Owner";

export interface Facility {
  id: string;
  label: string;
  address: string;
  lat?: number;
  lng?: number;
}

export interface DemoUser {
  /** Currently active portal/role. */
  role: UserRole;
  /**
   * All roles this account holds. A user who joined as both buyer and seller
   * has ["buyer", "seller"]. Falls back to [role] for older sessions that
   * predate this field. Drives the header "Switch to" vs "Add access" actions.
   */
  roles?: UserRole[];
  email: string;
  name: string;
  industry?: Industry;
  companySize?: CompanySize;
  userRole?: DecisionRole;
  facilities?: Facility[];
}

/** Roles an account holds, tolerant of older sessions without `roles`. */
export function getUserRoles(user: DemoUser): UserRole[] {
  return user.roles && user.roles.length > 0 ? user.roles : [user.role];
}

/** True when the account holds the given role. */
export function hasRole(user: DemoUser, role: UserRole): boolean {
  return getUserRoles(user).includes(role);
}

const KEY = "ecoglobe.demoUser";
const EVENT = "ecoglobe.demoUser.changed";

export function readDemoUser(): DemoUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DemoUser;
  } catch {
    return null;
  }
}

export function writeDemoUser(user: DemoUser | null) {
  if (typeof window === "undefined") return;
  if (user) localStorage.setItem(KEY, JSON.stringify(user));
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function clearDemoUser() {
  writeDemoUser(null);
}

const SELLER_FACILITIES: Facility[] = [
  {
    id: "norco-plant",
    label: "Norco Plant",
    address: "15536 River Rd, Norco, LA 70079",
    lat: 30.0021,
    lng: -90.4159,
  },
  {
    id: "deer-park-plant",
    label: "Deer Park Plant",
    address: "5900 TX-225, Deer Park, TX 77536",
    lat: 29.7218,
    lng: -95.1158,
  },
];

const BUYER_FACILITIES: Facility[] = [
  {
    id: "buyer-ashford",
    label: "Ashford Houston",
    address: "270 Dairy Ashford Rd, Houston, TX 77079",
    lat: 29.7817,
    lng: -95.6065,
  },
  {
    id: "buyer-allen-parkway",
    label: "Allen Parkway Houston",
    address: "7777 Allen Parkway, Houston, TX 77019",
    lat: 29.7609,
    lng: -95.4010,
  },
  {
    id: "buyer-huldy",
    label: "Huldy Street Houston",
    address: "5412 Huldy Street, Houston, TX 77019",
    lat: 29.7406,
    lng: -95.4195,
  },
];

const DEFAULT_PROFILE: Record<
  UserRole,
  Omit<DemoUser, "role" | "name" | "email">
> = {
  seller: {
    industry: "Refinery",
    companySize: "Big",
    userRole: "Plant Manager",
    facilities: SELLER_FACILITIES,
  },
  buyer: {
    industry: "Carbon Black",
    companySize: "Big",
    userRole: "Sustainability Manager",
    facilities: BUYER_FACILITIES,
  },
  admin: {
    industry: "Other",
    companySize: "Startup",
    userRole: "Owner",
    facilities: [],
  },
};

export function buildDemoUser(
  role: UserRole,
  overrides: Partial<DemoUser> = {},
): DemoUser {
  const base = DEFAULT_PROFILE[role];
  const defaultName =
    role === "seller"
      ? "Sam Reyes"
      : role === "buyer"
        ? "Joanna Bell"
        : "Demo Admin";
  const defaultEmail =
    role === "seller"
      ? "demo.seller@ecoglobe.com"
      : role === "buyer"
        ? "demo.buyer@ecoglobe.com"
        : "demo.admin@ecoglobe.com";
  return {
    role,
    roles: [role],
    name: overrides.name || defaultName,
    email: overrides.email || defaultEmail,
    ...base,
    ...overrides,
  };
}

/** React hook — re-renders when the demo user changes (login, logout, profile edit). */
export function useDemoUser(): DemoUser | null {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUser(readDemoUser());
    setMounted(true);
    const refresh = () => setUser(readDemoUser());
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY || e.key === null) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return mounted ? user : null;
}
