import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("pending_review"),
        v.literal("published"),
        v.literal("archived"),
        v.literal("rejected"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return ctx.db
        .query("listings")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    }
    return ctx.db.query("listings").collect();
  },
});

export const getPublished = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("listings")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();
  },
});

export const search = query({
  args: {
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("listings")
      .withSearchIndex("search_listings", (q) =>
        q.search("title", args.searchTerm).eq("status", "published"),
      )
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("listings") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    sellerId: v.id("sellers"),
    title: v.string(),
    description: v.string(),
    feedstockType: v.string(),
    quantity: v.number(),
    unit: v.string(),
    pricePerUnit: v.number(),
    currency: v.string(),
    location: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("listings", {
      ...args,
      status: "draft",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
