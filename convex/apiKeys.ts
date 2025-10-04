import { ConvexError, v } from "convex/values";
import { action, mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import { apiKeyValidator } from "./schema";
import type { Id } from "./_generated/dataModel";

// Helper to get member from sessionId
async function getMemberFromSession(ctx: QueryCtx | MutationCtx, sessionId: Id<"sessions">) {
  const session = await ctx.db.get(sessionId);
  if (!session || !session.memberId) {
    return null;
  }
  return await ctx.db.get(session.memberId);
}

export const apiKeyForCurrentMember = query({
  args: {},
  returns: v.union(v.null(), apiKeyValidator),
  handler: async (ctx) => {
    const member = await ctx.db.query("convexMembers").first();
    return member?.apiKey ?? null;
  },
});

export const setApiKeyForCurrentMember = mutation({
  args: {
    apiKey: apiKeyValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const member = await ctx.db.query("convexMembers").first();
    if (!member) {
      throw new ConvexError({ code: "NotFound", message: "No member found" });
    }
    await ctx.db.patch(member._id, { apiKey: args.apiKey });
  },
});

export const deleteApiKeyForCurrentMember = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const member = await ctx.db.query("convexMembers").first();
    if (!member) return;
    await ctx.db.patch(member._id, { apiKey: undefined });
  },
});

export const deleteAnthropicApiKeyForCurrentMember = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const member = await ctx.db.query("convexMembers").first();
    if (!member || !member.apiKey) return;
    await ctx.db.patch(member._id, {
      apiKey: {
        ...member.apiKey,
        value: undefined,
      },
    });
  },
});

export const deleteOpenaiApiKeyForCurrentMember = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const member = await ctx.db.query("convexMembers").first();
    if (!member || !member.apiKey) return;
    await ctx.db.patch(member._id, {
      apiKey: {
        ...member.apiKey,
        openai: undefined,
      },
    });
  },
});

export const deleteXaiApiKeyForCurrentMember = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const member = await ctx.db.query("convexMembers").first();
    if (!member || !member.apiKey) return;
    await ctx.db.patch(member._id, {
      apiKey: {
        ...member.apiKey,
        xai: undefined,
      },
    });
  },
});

export const deleteGoogleApiKeyForCurrentMember = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const member = await ctx.db.query("convexMembers").first();
    if (!member || !member.apiKey) return;
    await ctx.db.patch(member._id, {
      apiKey: {
        ...member.apiKey,
        google: undefined,
      },
    });
  },
});

export const validateAnthropicApiKey = action({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": args.apiKey,
      },
    });

    if (response.status === 401) {
      return false;
    }
    return true;
  },
});

export const validateOpenaiApiKey = action({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${args.apiKey}`,
      },
    });

    if (response.status === 401) {
      return false;
    }
    return true;
  },
});

export const validateGoogleApiKey = action({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${args.apiKey}`);

    if (response.status === 400) {
      return false;
    }
    return true;
  },
});

export const validateXaiApiKey = action({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const response = await fetch("https://api.x.ai/v1/models", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${args.apiKey}`,
      },
    });
    if (response.status === 400) {
      return false;
    }
    return true;
  },
});
