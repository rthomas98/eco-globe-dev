import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ── Sellers ──────────────────────────────────────────
  sellers: defineTable({
    userId: v.string(),
    companyName: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("suspended"),
    ),
    createdAt: v.number(),
  }).index("by_userId", ["userId"])
    .index("by_status", ["status"]),

  // ── Buyers ───────────────────────────────────────────
  buyers: defineTable({
    userId: v.string(),
    companyName: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("suspended"),
    ),
    createdAt: v.number(),
  }).index("by_userId", ["userId"])
    .index("by_status", ["status"]),

  // ── Listings ─────────────────────────────────────────
  listings: defineTable({
    sellerId: v.id("sellers"),
    title: v.string(),
    description: v.string(),
    feedstockType: v.string(),
    quantity: v.number(),
    unit: v.string(),
    pricePerUnit: v.number(),
    currency: v.string(),
    location: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("pending_review"),
      v.literal("published"),
      v.literal("archived"),
      v.literal("rejected"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_sellerId", ["sellerId"])
    .index("by_status", ["status"])
    .index("by_feedstockType", ["feedstockType"])
    .searchIndex("search_listings", {
      searchField: "title",
      filterFields: ["status", "feedstockType"],
    }),

  // ── Orders ───────────────────────────────────────────
  orders: defineTable({
    listingId: v.id("listings"),
    buyerId: v.id("buyers"),
    sellerId: v.id("sellers"),
    quantity: v.number(),
    totalPrice: v.number(),
    status: v.union(
      v.literal("inquiry"),
      v.literal("quoted"),
      v.literal("ordered"),
      v.literal("confirmed"),
      v.literal("pickup_scheduled"),
      v.literal("in_transit"),
      v.literal("delivered"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_buyerId", ["buyerId"])
    .index("by_sellerId", ["sellerId"])
    .index("by_status", ["status"])
    .index("by_listingId", ["listingId"]),
});
