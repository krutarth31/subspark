"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type Product = {
  _id: string
  name: string
  price: number
  currency: string
  billing: 'free' | 'one' | 'recurring'
  description?: string
  planDescription?: string
  availableUnits?: number
  unlimited?: boolean
  expireDays?: number
  period?: string
  type: "discord" | "file" | "key"
  status: "draft" | "published"
  createdAt: string
  updatedAt?: string
  sales?: number
  deliveryFile?: string
  serverId?: string
  roleId?: string
  licenseKeys?: string
  subProducts?: {
    name?: string
    billing: 'free' | 'one' | 'recurring'
    price?: number
    currency: string
    period?: string
    service?: string
    roleId?: string
  }[]
}

export function getColumns(
  onArchive: (id: string) => void,
  archivingId?: string | null,
  onToggle?: (id: string) => void,
  expanded?: Record<string, boolean>,
): ColumnDef<Product>[] {
  return [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const prod = row.original
      const hasSub = Array.isArray(prod.subProducts) && prod.subProducts.length > 1
      const isOpen = expanded?.[prod._id]
      return (
        <div className="flex items-center gap-1">
          {hasSub && (
            <Button
              variant="ghost"
              size="icon"
              className="size-5"
              onClick={() => onToggle?.(prod._id)}
            >
              {isOpen ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
              <span className="sr-only">Toggle</span>
            </Button>
          )}
          <span>{row.getValue<string>('name')}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "price",
    header: () => <div className="text-center">Price</div>,
    cell: ({ row }) => {
      const price = parseFloat(row.getValue("price"))
      const currency = row.original.currency
      const per = row.original.billing === 'recurring' ? ` / ${row.original.period}` : ''
      return (
        <div className="text-center font-medium">
          {price.toFixed(2)} {currency}
          {per}
        </div>
      )
    },
  },
  {
    accessorKey: "billing",
    header: "Billing",
  },
  {
    accessorKey: "sales",
    header: () => <div className="text-center">Sales</div>,
    cell: ({ row }) => {
      const count = row.getValue<number>("sales") || 0
      return <div className="text-center">{count}</div>
    },
  },
  {
    accessorKey: "type",
    header: "Type",
  },
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => {
      const val = row.getValue<string>("createdAt")
      return new Date(val).toLocaleDateString()
    },
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => {
      const val = row.getValue<string>("updatedAt")
      return val ? new Date(val).toLocaleDateString() : "-"
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const product = row.original
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <a href={`/products/${product._id}`}>View</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={`/products/${product._id}/edit`}>Edit</a>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                navigator.clipboard.writeText(
                  `${window.location.origin}/buy/${product._id}`
                )
              }
            >
              Copy Link
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onArchive(product._id)}
              disabled={archivingId === product._id}
            >
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
  ]
}
