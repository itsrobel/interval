import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

// Create a new chat session
export const createChatSession = mutation({
  args: {},
  handler: async (ctx) => {
    const sessionId = crypto.randomUUID();
    const sessionDocId = await ctx.db.insert("chatSessions", {
      sessionId,
      createdAt: Date.now(),
    });
    return { sessionId, sessionDocId };
  },
});

// Get chat messages for a session
export const getChatMessages = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .order("asc")
      .collect();
    return messages;
  },
});

// Add a message to the chat
export const addChatMessage = mutation({
  args: {
    sessionId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    isComplete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("chatMessages", {
      sessionId: args.sessionId,
      role: args.role,
      content: args.content,
      timestamp: Date.now(),
      isComplete: args.isComplete ?? true,
    });
    return messageId;
  },
});

// Update a message (for streaming updates)
export const updateChatMessage = mutation({
  args: {
    messageId: v.id("chatMessages"),
    content: v.string(),
    isComplete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      content: args.content,
      isComplete: args.isComplete ?? true,
    });
  },
});

// Temporary Claude Code integration via HTTP endpoint
export const sendClaudeMessage = action({
  args: {
    sessionId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    messageId?: string;
    response: string;
  }> => {
    try {
      // Add user message to database
      await ctx.runMutation(api.claudeCode.addChatMessage, {
        sessionId: args.sessionId,
        role: "user",
        content: args.message,
      });

      // Create assistant message placeholder
      const assistantMessageId = await ctx.runMutation(api.claudeCode.addChatMessage, {
        sessionId: args.sessionId,
        role: "assistant",
        content: "",
        isComplete: false,
      });

      // Call TanStack server route (will be created next)
      const siteUrl = (ctx as any).env?.SITE_URL || 'http://localhost:3000';
      const response = await fetch(`${siteUrl}/api/claude-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: args.message,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const claudeResponse = data.response || "Sorry, I couldn't process your request.";

      // Update the assistant message with the final response
      await ctx.runMutation(api.claudeCode.updateChatMessage, {
        messageId: assistantMessageId,
        content: claudeResponse,
        isComplete: true,
      });

      return {
        success: true,
        messageId: assistantMessageId,
        response: claudeResponse,
      };
    } catch (error) {
      console.error("Claude Code integration error:", error);

      // Add error message to chat
      await ctx.runMutation(api.claudeCode.addChatMessage, {
        sessionId: args.sessionId,
        role: "assistant",
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });

      return {
        success: false,
        response: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});