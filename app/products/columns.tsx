"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
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
  billing: 'free' | 'one' | 'recurring'
  description?: string
  planDescription?: string
  availableUnits?: number
  unlimited?: boolean
  expireDays?: number
  type: "discord" | "file" | "key"
  status: "draft" | "published"
  createdAt: string
  updatedAt?: string
  sales?: number
}

export function getColumns(onArchive: (id: string) => void): ColumnDef<Product>[] {
  return [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "price",
    header: () => <div className="text-right">Price</div>,
    cell: ({ row }) => {
      const price = parseFloat(row.getValue("price"))
      return <div className="text-right font-medium">${price.toFixed(2)}</div>
    },
  },
  {
    accessorKey: "billing",
    header: "Billing",
  },
  {
    accessorKey: "sales",
    header: () => <div className="text-right">Sales</div>,
    cell: ({ row }) => {
      const count = row.getValue<number>("sales") || 0
      return <div className="text-right">{count}</div>
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
            <DropdownMenuItem onClick={() => onArchive(product._id)}>
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
  ]
}
