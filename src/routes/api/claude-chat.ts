import { createFileRoute } from '@tanstack/react-router'

// The route path should match the file structure
export const Route = createFileRoute('/api/claude-chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const { message } = body

          if (!message) {
            return new Response(
              JSON.stringify({ error: 'Message is required' }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
              }
            )
          }

          // Import Claude Code SDK (runs in Node.js environment)
          const { query } = await import('@anthropic-ai/claude-code')

          let accumulatedResponse = ''

          // Create async generator for streaming input
          async function* generateMessages() {
            yield {
              type: 'user' as const,
              message: {
                role: 'user' as const,
                content: message,
              },
            }
          }

          // Process Claude Code response
          for await (const claudeMessage of query({
            prompt: generateMessages as any, // Type assertion for now
            options: {
              maxTurns: 3,
              allowedTools: ['Read', 'Grep'], // Safe tools for now
            },
          })) {
            if (claudeMessage.type === 'assistant' && claudeMessage.message) {
              // Extract text content from assistant message
              for (const block of claudeMessage.message.content) {
                if (block.type === 'text' && block.text) {
                  accumulatedResponse += block.text
                }
              }
            } else if (claudeMessage.type === 'result') {
              // Final result
              return new Response(
                JSON.stringify({
                  success: true,
                  response: claudeMessage.result || accumulatedResponse || 'No response received',
                }),
                {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' }
                }
              )
            }
          }

          // Fallback response
          return new Response(
            JSON.stringify({
              success: true,
              response: accumulatedResponse || 'No response received',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )

        } catch (error) {
          console.error('Claude Code SDK error:', error)

          // Check for common Claude Code SDK errors
          let errorMessage = 'Unknown error occurred'

          if (error instanceof Error) {
            if (error.message.includes('not logged in')) {
              errorMessage = 'Claude Code not authenticated. Please run "claude login" first.'
            } else if (error.message.includes('command not found')) {
              errorMessage = 'Claude Code CLI not installed. Please install @anthropic-ai/claude-code globally.'
            } else {
              errorMessage = error.message
            }
          }

          return new Response(
            JSON.stringify({
              success: false,
              error: errorMessage,
              response: `Sorry, I encountered an error: ${errorMessage}`,
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }
      },
    },
  },
})