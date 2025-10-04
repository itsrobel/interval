import { createFileRoute } from '@tanstack/react-router'
import { Header } from '../components/header/Header'
import { ExistingChat } from '../components/ExistingChat.client'

export const Route = createFileRoute('/chat/$id')({
  ssr: false,
  component: ChatRoute,
})

function ChatRoute() {
  const { id } = Route.useParams()

  return (
    <div className="flex size-full flex-col bg-bolt-elements-background-depth-1">
      <Header />
      <ExistingChat chatId={id} />
    </div>
  )
}
