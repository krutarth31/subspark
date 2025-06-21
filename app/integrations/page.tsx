"use client"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/dashboard-layout"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { IconBrandDiscord } from "@tabler/icons-react"

interface DiscordStatus {
  connected: boolean
  guildId?: string
  guildName?: string
}

export default function IntegrationPage() {
  const [status, setStatus] = useState<DiscordStatus | null>(null)
  const [loading, setLoading] = useState<
    'connect' | 'disconnect' | null
  >(null)

  useEffect(() => {
    fetch("/api/discord/status")
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch(() => {})
  }, [])

  async function connectDiscord() {
    if (loading) return
    setLoading('connect')
    const res = await fetch("/api/discord/connect", { method: "POST" })
    if (res.ok) {
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
        return
      }
    }
    setLoading(null)
  }

  async function disconnectDiscord() {
    if (loading) return
    setLoading('disconnect')
    await fetch("/api/discord/disconnect", { method: "POST" })
    setStatus({ connected: false })
    setLoading(null)
  }

  return (
    <DashboardLayout title="Integrations">
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <IconBrandDiscord className="size-6" /> Discord Integration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              Connect your Discord server to automate customer access and
              notifications.
            </p>
            {status?.connected && (
              <div className="space-y-1 text-sm">
                <p>
                  ✅ Connected to: {status.guildName} (Server ID: {status.guildId})
                </p>
                <p>
                  Bot is active in <code>#verify-access</code>,{' '}
                  <code>#alerts</code>.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="gap-2">
            {!status?.connected ? (
              <>
                <Button onClick={connectDiscord} disabled={!!loading}>
                  {loading === 'connect' && <Spinner className="mr-2" />}
                  Connect Discord
                </Button>
                <Button variant="outline" disabled>
                  Configure
                </Button>
              </>
            ) : (
              <>
                <Button onClick={connectDiscord} variant="outline" disabled={!!loading}>
                  {loading === 'connect' && <Spinner className="mr-2" />}Reconnect
                </Button>
                <Button
                  onClick={disconnectDiscord}
                  variant="destructive"
                  disabled={!!loading}
                >
                  {loading === 'disconnect' && <Spinner className="mr-2" />}Disconnect
                </Button>
              </>
            )}
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  )
}
