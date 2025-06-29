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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiFetch } from "@/lib/api-client"
import { Spinner } from "@/components/ui/spinner"
import { useRouter } from "next/navigation"

export default function EditAccountPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [bio, setBio] = useState("")
  const [avatar, setAvatar] = useState<File | null>(null)
  const [banner, setBanner] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch("/api/auth/user")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setName(data.user.name || "")
          setBio(data.user.bio || "")
          if (data.user.avatar) setAvatarPreview(data.user.avatar)
          if (data.user.banner) setBannerPreview(data.user.banner)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (avatar) {
      const url = URL.createObjectURL(avatar)
      setAvatarPreview(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [avatar])

  useEffect(() => {
    if (banner) {
      const url = URL.createObjectURL(banner)
      setBannerPreview(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [banner])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      let avatarUrl = avatarPreview || undefined
      let bannerUrl = bannerPreview || undefined
      if (avatar instanceof File) {
        const form = new FormData()
        form.append("file", avatar)
        const upload = await apiFetch("/api/upload-image", { method: "POST", body: form })
        const data = await upload.json().catch(() => ({}))
        if (data.url) avatarUrl = data.url as string
      }
      if (banner instanceof File) {
        const form = new FormData()
        form.append("file", banner)
        const upload = await apiFetch("/api/upload-image", { method: "POST", body: form })
        const data = await upload.json().catch(() => ({}))
        if (data.url) bannerUrl = data.url as string
      }
      const res = await apiFetch("/api/account/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, avatar: avatarUrl, banner: bannerUrl, bio }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Failed to save")
        setLoading(false)
        return
      }
      router.push("/account")
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout title="Edit Account">
      <div className="p-6 max-w-xl mx-auto">
        <Card asChild>
          <form onSubmit={handleSubmit} className="space-y-4">
            <CardHeader className="text-center">
              <CardTitle>Edit Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar">Avatar</Label>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="size-20 rounded-full object-cover" />
                ) : null}
                <Input id="avatar" type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files?.[0] ?? null)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="banner">Banner</Label>
                {bannerPreview ? (
                  <img src={bannerPreview} alt="Preview" className="h-24 w-full rounded-md object-cover" />
                ) : null}
                <Input id="banner" type="file" accept="image/*" onChange={(e) => setBanner(e.target.files?.[0] ?? null)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Input id="bio" value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>
              {error ? <p className="text-destructive text-sm">{error}</p> : null}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Spinner className="mr-2" />}Save
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  )
}
