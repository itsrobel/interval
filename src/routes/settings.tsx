import { createFileRoute } from '@tanstack/react-router'
import { SettingsContent } from '../components/SettingsContent.client'

export const Route = createFileRoute('/settings')({
  ssr: false,
  component: Settings,
})

function Settings() {
  return <SettingsContent />
}
