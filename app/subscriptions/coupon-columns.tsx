"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

export type Coupon = {
  _id: string
  code: string
  percentOff: number
  active: boolean
  productId?: string
  subIndex?: number
}

export function getCouponColumns(
  getName: (c: Coupon) => string,
  onToggle: (id: string, active: boolean) => void,
  updatingId: string | null,
  onDelete: (id: string) => void,
  deletingId: string | null,
): ColumnDef<Coupon>[] {
  return [
    {
      id: "target",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Target" />
      ),
      cell: ({ row }) => getName(row.original),
    },
    {
      accessorKey: "code",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Code" />
      ),
      cell: ({ row }) => (
        <span className="font-mono">{row.getValue<string>("code")}</span>
      ),
    },
    {
      accessorKey: "percentOff",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Percent Off" />
      ),
      cell: ({ row }) => <span>{row.getValue<number>("percentOff")}%</span>,
    },
    {
      id: "active",
      header: "Active",
      cell: ({ row }) => (
        <Switch
          checked={row.original.active}
          onCheckedChange={(v) => onToggle(row.original._id, v)}
          disabled={updatingId === row.original._id}
        />
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => onDelete(row.original._id)}
              disabled={deletingId === row.original._id}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
