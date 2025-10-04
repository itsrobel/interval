import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Stubbed out for self-hosted use - no deployment tracking

export const recordDeploy = mutation({
  args: {
    sessionId: v.id("sessions"),
    id: v.string(),
  },
  handler: async (ctx, { id, sessionId }) => {
    // No-op
  },
});

export const hasBeenDeployed = query({
  args: {
    sessionId: v.id("sessions"),
    id: v.string(),
  },
  handler: async (ctx, { id, sessionId }) => {
    return false;
  },
});
