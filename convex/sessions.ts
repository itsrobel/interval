import { v } from "convex/values";
import { action, internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { getChatByIdOrUrlIdEnsuringAccess } from "./messages";
import { internal } from "./_generated/api";
import type { UserIdentity } from "convex/server";

export const verifySession = query({
  args: {
    sessionId: v.string(),
    flexAuthMode: v.optional(v.literal("ConvexOAuth")),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const sessionId = ctx.db.normalizeId("sessions", args.sessionId);
    if (!sessionId) {
      return false;
    }
    const session = await ctx.db.get(sessionId);
    if (!session || !session.memberId) {
      return false;
    }
    return isValidSessionForConvexOAuth(ctx, { sessionId, memberId: session.memberId });
  },
});

export async function isValidSession(ctx: QueryCtx, args: { sessionId: Id<"sessions"> }) {
  const session = await ctx.db.get(args.sessionId);
  if (!session || !session.memberId) {
    return false;
  }
  return await isValidSessionForConvexOAuth(ctx, { sessionId: args.sessionId, memberId: session.memberId });
}

async function isValidSessionForConvexOAuth(
  ctx: QueryCtx,
  args: { sessionId: Id<"sessions">; memberId: Id<"convexMembers"> },
): Promise<boolean> {
  const member = await ctx.db.get(args.memberId);
  if (!member) {
    return false;
  }
  return true;
}

export const registerConvexOAuthConnection = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    chatId: v.id("chats"),
    projectSlug: v.string(),
    teamSlug: v.string(),
    deploymentUrl: v.string(),
    deploymentName: v.string(),
    projectDeployKey: v.string(),
  },
  handler: async (ctx, args) => {
    // No-op for self-hosted
  },
});

export const startSession = mutation({
  args: {},
  returns: v.id("sessions"),
  handler: async (ctx) => {
    const member = await getOrCreateCurrentMember(ctx);
    const existingSession = await ctx.db
      .query("sessions")
      .withIndex("byMemberId", (q) => q.eq("memberId", member))
      .unique();
    if (existingSession) {
      return existingSession._id;
    }
    return ctx.db.insert("sessions", {
      memberId: member,
    });
  },
});

async function getOrCreateCurrentMember(ctx: MutationCtx) {
  const existingMember = await ctx.db.query("convexMembers").first();
  if (existingMember) {
    return existingMember._id;
  }

  // Create first member for personal use
  return await ctx.db.insert("convexMembers", {
    convexMemberId: "personal-user",
  });

}

export const convexMemberId = query({
  handler: async (ctx) => {
    const member = await ctx.db.query("convexMembers").first();
    return member?.convexMemberId ?? null;
  },
});

export async function getCurrentMember(ctx: QueryCtx) {
  const member = await ctx.db.query("convexMembers").first();
  if (!member) {
    throw new ConvexError({ code: "NotFound", message: "No member found" });
  }
  return member;
}

// Internal so we can trust this is actually what's in the Convex dashboard, but it's still just a cache
export const saveCachedProfile = internalMutation({
  args: {
    profile: v.object({
      username: v.string(),
      avatar: v.string(),
      email: v.string(),
      id: v.union(v.string(), v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const member = await getCurrentMember(ctx);
    const profile = {
      ...args.profile,
      id: String(args.profile.id),
    };
    await ctx.db.patch(member._id, {
      cachedProfile: profile,
    });
  },
});

export const updateCachedProfile = action({
  args: {
    convexAuthToken: v.string(),
  },
  handler: async (ctx, { convexAuthToken }) => {
  },
});

export interface ConvexProfile {
  name: string;
  email: string;
  id: string;
}
