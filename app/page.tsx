import { TopBar } from '@/components/layout/top-bar'
import { HomeClient } from './home-client'

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        title="Home"
        subtitle="Your usage in a nutshell."
      />
      <HomeClient />
    </div>
  )
}
