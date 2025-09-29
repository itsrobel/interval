import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { Agent } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { openai } from "@ai-sdk/openai";

// Create a simple agent that will bridge to our Claude Code SDK
const claudeCodeAgent = new Agent(components.agent, {
  name: "Claude Code Assistant",
  // We use a placeholder LLM since the actual work happens in TanStack route
  languageModel: openai.chat("gpt-4o-mini"),
  instructions: "You are Claude Code assistant, helping users with coding tasks.",
});

// Create a new chat thread
export const createThread = mutation({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const thread = await claudeCodeAgent.createThread(ctx, {
      userId: args.userId || "anonymous",
    });
    return thread;
  },
});

// Get thread messages using our chat messages table
export const getThreadMessages = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    // Query our chatMessages table for this session/thread
    const messages = await ctx.db
      .query("chatMessages")
      .filter((q) => q.eq(q.field("sessionId"), args.threadId))
      .order("asc")
      .collect();
    return messages;
  },
});

// Send message using the hybrid approach
export const sendMessage = action({
  args: {
    threadId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    response: string;
  }> => {
    try {
      // Save the user message using Agent
      await claudeCodeAgent.saveMessage(ctx, {
        threadId: args.threadId,
        message: {
          role: "user",
          content: args.message,
        },
      });

      // Call our TanStack server route
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

      // Save the assistant response using Agent
      await claudeCodeAgent.saveMessage(ctx, {
        threadId: args.threadId,
        message: {
          role: "assistant",
          content: claudeResponse,
        },
      });

      return {
        success: true,
        response: claudeResponse,
      };
    } catch (error) {
      console.error("Agent integration error:", error);

      // Save error message using Agent
      const errorMessage = `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}`;

      await claudeCodeAgent.saveMessage(ctx, {
        threadId: args.threadId,
        message: {
          role: "assistant",
          content: errorMessage,
        },
      });

      return {
        success: false,
        response: errorMessage,
      };
    }
  },
});

// Export the agent for use in other functions
export { claudeCodeAgent };