import { TopBar } from '@/components/layout/top-bar'
import { OverviewClient } from './overview-client'

export default function OverviewPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        title="Overview"
        subtitle="Real-time monitoring · refreshes every 5s"
      />
      <OverviewClient />
    </div>
  )
}
