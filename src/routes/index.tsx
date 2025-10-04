import { createFileRoute } from '@tanstack/react-router'
import { Header } from '../components/header/Header'
import { Homepage } from '../components/Homepage.client'

export const Route = createFileRoute('/')({
  ssr: false,
  component: Home,
})

function Home() {
  return (
    <div className="flex size-full flex-col bg-bolt-elements-background-depth-1">
      <Header />
      <Homepage />
    </div>
  )
}
