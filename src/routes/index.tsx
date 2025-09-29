import { createFileRoute } from '@tanstack/react-router'
import { WebContainerTerminal } from '../components/WebContainerTerminal'

export const Route = createFileRoute('/')({
  ssr: false,
  component: Home,
})

function Home() {
  return <WebContainerTerminal />
}
