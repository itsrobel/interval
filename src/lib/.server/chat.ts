import { createScopedLogger } from 'chef-agent/utils/logger';
import { convexAgent } from '../.server/llm/convex-agent';
import type { Message } from 'ai';
import type { ModelProvider } from '../.server/llm/provider';
import type { PromptCharacterCounts } from 'chef-agent/ChatContextManager';

type Messages = Message[];

const logger = createScopedLogger('api.chat');

export async function chatAction({ request }: { request: Request }) {
  const body = (await request.json()) as {
    messages: Messages;
    firstUserMessage: boolean;
    chatInitialId: string;
    modelProvider: ModelProvider;
    modelChoice: string | undefined;
    userApiKey:
      | { preference: 'always' | 'quotaExhausted'; value?: string; openai?: string; xai?: string; google?: string }
      | undefined;
    shouldDisableTools: boolean;
    recordRawPromptsForDebugging?: boolean;
    collapsedMessages: boolean;
    promptCharacterCounts?: PromptCharacterCounts;
    featureFlags: {
      enableResend?: boolean;
    };
  };
  const { messages, firstUserMessage, chatInitialId, recordRawPromptsForDebugging } = body;

  // Extract user API key based on provider (optional - will fallback to .env)
  let userApiKey: string | undefined;
  if (body.modelProvider === 'Anthropic' || body.modelProvider === 'Bedrock') {
    userApiKey = body.userApiKey?.value;
    body.modelProvider = 'Anthropic';
  } else if (body.modelProvider === 'OpenAI') {
    userApiKey = body.userApiKey?.openai;
  } else if (body.modelProvider === 'XAI') {
    userApiKey = body.userApiKey?.xai;
  } else {
    userApiKey = body.userApiKey?.google;
  }

  logger.info(`Using model provider: ${body.modelProvider} (user API key: ${!!userApiKey})`);

  try {
    const totalMessageContent = messages.reduce((acc, message) => acc + message.content, '');
    logger.debug(`Total message length: ${totalMessageContent.split(' ').length} words`);

    const dataStream = await convexAgent({
      chatInitialId,
      firstUserMessage,
      messages,
      tracer: null,
      modelProvider: body.modelProvider,
      modelChoice: body.modelChoice,
      userApiKey,
      shouldDisableTools: body.shouldDisableTools,
      recordUsageCb: async () => {}, // No usage recording for personal use
      recordRawPromptsForDebugging: !!recordRawPromptsForDebugging,
      collapsedMessages: body.collapsedMessages,
      promptCharacterCounts: body.promptCharacterCounts,
      featureFlags: {
        enableResend: body.featureFlags.enableResend ?? false,
      },
    });

    return new Response(dataStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
        'Text-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    logger.error(error);

    if (error.message?.includes('API key')) {
      throw new Response('Invalid or missing API key', {
        status: 401,
        statusText: 'Unauthorized',
      });
    }

    throw new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
