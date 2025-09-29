import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

export function useClaudeChat(threadId: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Convex mutations for saving messages
  const addMessage = useMutation(api.claudeCode.addChatMessage)
  const updateMessage = useMutation(api.claudeCode.updateChatMessage)

  const sendMessage = async (message: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // 1. Save user message to Convex
      await addMessage({
        sessionId: threadId,
        role: 'user' as const,
        content: message,
      })

      // 2. Create placeholder for assistant message
      const assistantMessageId = await addMessage({
        sessionId: threadId,
        role: 'assistant' as const,
        content: '',
        isComplete: false,
      })

      // 3. Call Claude Code SDK via LOCAL TanStack API route
      // This runs on YOUR machine, where claude login works
      const response = await fetch('/api/claude-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Claude API error: ${response.status} - ${errorData}`)
      }

      const data = await response.json()
      const claudeResponse = data.response || 'No response received'

      // 4. Update assistant message with response
      await updateMessage({
        messageId: assistantMessageId,
        content: claudeResponse,
        isComplete: true,
      })

      return { success: true, response: claudeResponse }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)

      // Save error message to chat
      await addMessage({
        sessionId: threadId,
        role: 'assistant' as const,
        content: `Error: ${errorMessage}. Make sure you're logged in with 'claude login' and the dev server is running.`,
      })

      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }

  return { sendMessage, isLoading, error }
}