import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import type { APIEvent } from '@tanstack/react-start'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { chatAction } from '../lib/.server/chat'

export const Route = createAPIFileRoute('/api/chat')({
  POST: async ({ request }: APIEvent) => {
    // For TanStack Start, we need to adapt the Remix ActionFunctionArgs to the request object
    return chatAction({ request } as any)
  },
})
