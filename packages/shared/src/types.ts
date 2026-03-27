// Portal user roles
export type UserRole = "buyer" | "seller" | "admin";

// Approval workflow states
export type ApprovalStatus = "pending" | "approved" | "rejected" | "suspended";

// Order lifecycle states
export type OrderStatus =
  | "inquiry"
  | "quoted"
  | "ordered"
  | "confirmed"
  | "pickup_scheduled"
  | "in_transit"
  | "delivered"
  | "completed"
  | "cancelled";

// Listing states
export type ListingStatus = "draft" | "pending_review" | "published" | "archived" | "rejected";
