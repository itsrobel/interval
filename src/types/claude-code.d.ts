declare module '@anthropic-ai/claude-code' {
  interface Message {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: Array<{
      type: 'text' | 'tool_use' | 'tool_result';
      text?: string;
      name?: string;
      input?: any;
      tool_use_id?: string;
      content?: string;
    }>;
  }

  interface MessageParam {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string | Array<{
      type: 'text' | 'image';
      text?: string;
      source?: {
        type: 'base64';
        media_type: string;
        data: string;
      };
    }>;
  }

  interface Usage {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  }

  interface SDKMessage {
    type: 'assistant' | 'user' | 'result' | 'system';
    uuid?: string;
    session_id?: string;
    message?: Message;
    result?: string;
    usage?: Usage;
    total_cost_usd?: number;
    duration_ms?: number;
    is_error?: boolean;
    num_turns?: number;
  }

  interface QueryOptions {
    maxTurns?: number;
    allowedTools?: string[];
    systemPrompt?: string;
    appendSystemPrompt?: string;
    permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';
  }

  interface QueryParams {
    prompt: string | (() => AsyncGenerator<{
      type: 'user';
      message: MessageParam;
    }>);
    options?: QueryOptions;
  }

  export function query(params: QueryParams): AsyncGenerator<SDKMessage>;
}