import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function SectionCards({ role }: { role: "buyer" | "seller" }) {
  const metrics =
    role === "seller"
      ? [
          {
            description: "Total Sales",
            value: "23,450",
            trend: "+12.5%",
            up: true,
            footer: "Sales rising",
            sub: "Compared to last quarter",
          },
          {
            description: "Total Buyers",
            value: "8,974",
            trend: "-5%",
            up: false,
            footer: "Buyer count down",
            sub: "Compared to previous month",
          },
          {
            description: "New Orders",
            value: "1,234",
            trend: "+8%",
            up: true,
            footer: "Orders increasing",
            sub: "Month over month",
          },
          {
            description: "Revenue",
            value: "$1,250.00",
            trend: "+4.5%",
            up: true,
            footer: "Steady growth",
            sub: "Meets projections",
          },
        ]
      : [
          {
            description: "Total Orders",
            value: "1,234",
            trend: "+8%",
            up: true,
            footer: "Orders placed",
            sub: "Month over month",
          },
          {
            description: "Favorite Sellers",
            value: "85",
            trend: "+2%",
            up: true,
            footer: "Favorites growing",
            sub: "Over last month",
          },
          {
            description: "Reward Points",
            value: "23,450",
            trend: "+5%",
            up: true,
            footer: "Points earned",
            sub: "Lifetime",
          },
          {
            description: "Spent This Month",
            value: "$1,250.00",
            trend: "-1%",
            up: false,
            footer: "Slightly down",
            sub: "Vs last month",
          },
        ]

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {metrics.map((m, i) => (
        <Card key={i} className="@container/card">
          <CardHeader>
            <CardDescription>{m.description}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {m.value}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                {m.up ? <IconTrendingUp /> : <IconTrendingDown />}
                {m.trend}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              {m.footer}{" "}
              {m.up ? (
                <IconTrendingUp className="size-4" />
              ) : (
                <IconTrendingDown className="size-4" />
              )}
            </div>
            <div className="text-muted-foreground">{m.sub}</div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
