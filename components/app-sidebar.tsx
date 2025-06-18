"use client"

import * as React from "react"
import {
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFolder,
  IconInnerShadowTop,
  IconReport,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const defaultNav = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: IconDashboard,
  },
  {
    title: "Create your subspark",
    url: "/onboarding",
    icon: IconInnerShadowTop,
  },
]

const sellerNav = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: IconDashboard,
  },
  {
    title: "Products",
    url: "/products",
    icon: IconDatabase,
  },
  {
    title: "Buyers",
    url: "/buyers",
    icon: IconUsers,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: IconChartBar,
  },
  {
    title: "Payouts",
    url: "/payouts",
    icon: IconReport,
  },
  {
    title: "Documents",
    url: "/documents",
    icon: IconFileDescription,
  },
  {
    title: "Integrations",
    url: "/integrations",
    icon: IconFileAi,
  },
  {
    title: "Subscription",
    url: "/subscription",
    icon: IconFolder,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: IconSettings,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [user, setUser] = React.useState({
    name: "User",
    email: "user@example.com",
    avatar: "/avatars/shadcn.jpg",
  })
  const [isSeller, setIsSeller] = React.useState(false)

  React.useEffect(() => {
    fetch('/api/auth/user')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser((prev) => ({ ...prev, ...data.user }))
        }
      })
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    const id = window.localStorage.getItem('stripe_account_id')
    if (!id) return
    fetch(`/api/seller/status?accountId=${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.active) setIsSeller(true)
      })
      .catch(() => {})
  }, [])

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Acme Inc.</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={isSeller ? sellerNav : defaultNav} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
