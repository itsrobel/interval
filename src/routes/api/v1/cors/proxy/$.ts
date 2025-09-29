import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/v1/cors/proxy/$')({
  server: {
    handlers: {
      ALL: async ({ request, params }) => {
        try {
          // Extract target URL from the splat parameter
          const targetUrl = (params as any)['$'] || ''

          if (!targetUrl) {
            return new Response(
              JSON.stringify({ error: 'Missing target URL' }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
              }
            )
          }

          const headers: Record<string, string> = {}

          // Copy headers from original request, filtering out problematic ones
          for (const [key, value] of request.headers.entries()) {
            if (!['host', 'origin', 'x-forwarded-host', 'x-forwarded-for', 'x-forwarded-port', 'x-forwarded-proto', 'via'].includes(key.toLowerCase())) {
              headers[key] = value
            }
          }

          // Handle Claude OAuth hello endpoint
          if (targetUrl.includes("console.anthropic.com/v1/oauth/hello")) {
            console.log('User tried starting Claude')
          }

          // Handle Claude profile endpoint
          if (targetUrl.includes("api.anthropic.com/api/oauth/profile")) {
            const response = await fetch(`https://${targetUrl}`, {
              method: request.method,
              headers,
              body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined
            })

            const profile = await response.clone().json() as any
            console.log(`User logged in! name: ${profile.account?.full_name} (${profile.account?.email})`)

            return response
          }

          // Handle Claude API message endpoints
          if (targetUrl.includes('api.anthropic.com') && targetUrl.includes('messages')) {
            delete headers["host"]
            delete headers["origin"]
            delete headers["x-forwarded-host"]
            delete headers["x-forwarded-for"]
            delete headers["x-forwarded-port"]
            delete headers["x-forwarded-proto"]
            headers["user-agent"] = "claude-cli (external, cli)"
            delete headers["via"]

            const body = request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined

            const response = await fetch(`https://${targetUrl}`, {
              method: request.method,
              headers,
              body,
            })

            return response
          }

          // Handle wttr.in weather service
          if (targetUrl.includes("wttr.in")) {
            headers["user-agent"] = "curl/7.64.1"
          }

          // Handle localhost requests
          let finalUrl = targetUrl
          if (targetUrl.startsWith("localhost")) {
            finalUrl = `http://${targetUrl}`
          } else if (!targetUrl.startsWith("http")) {
            finalUrl = `https://${targetUrl}`
          }

          const response = await fetch(finalUrl, {
            method: request.method,
            headers,
            body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined
          })

          // Return the response with proper CORS headers
          const responseHeaders = new Headers(response.headers)
          responseHeaders.set('Access-Control-Allow-Origin', '*')
          responseHeaders.set('Access-Control-Allow-Methods', '*')
          responseHeaders.set('Access-Control-Allow-Headers', '*')

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
          })

        } catch (error) {
          console.error('Proxy error:', error)

          return new Response(
            JSON.stringify({
              error: 'Proxy request failed',
              message: error instanceof Error ? error.message : 'Unknown error'
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
});