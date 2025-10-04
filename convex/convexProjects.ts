import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Stubbed out for self-hosted use - no provisioning

export const hasConnectedConvexProject = query({
  args: {
    sessionId: v.id("sessions"),
    chatId: v.string(),
  },
  handler: async (ctx, args) => {
    return false;
  },
});

export const loadConnectedConvexProjectCredentials = query({
  args: {
    sessionId: v.id("sessions"),
    chatId: v.string(),
  },
  returns: v.union(
    v.object({
      kind: v.literal("connected"),
      projectSlug: v.string(),
      teamSlug: v.string(),
      deploymentUrl: v.string(),
      deploymentName: v.string(),
      adminKey: v.string(),
      warningMessage: v.optional(v.string()),
    }),
    v.object({
      kind: v.literal("connecting"),
    }),
    v.object({
      kind: v.literal("failed"),
      errorMessage: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return null;
  },
});

export const startProvisionConvexProject = mutation({
  args: {
    sessionId: v.id("sessions"),
    chatId: v.string(),
  },
  handler: async (ctx, args) => {
    // No-op for self-hosted
  },
});

export const disconnectConvexProject = mutation({
  args: {
    sessionId: v.id("sessions"),
    chatId: v.string(),
  },
  handler: async (ctx, args) => {
    // No-op for self-hosted
  },
});

export function ensureEnvVar(name: string) {
  if (!process.env[name]) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return process.env[name];
}
