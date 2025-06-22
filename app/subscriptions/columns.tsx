"use client"

import { ColumnDef } from "@tanstack/react-table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CheckIcon } from "lucide-react"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"

export type Role = {
  id: string
  name: string
}

export type SubscriptionProduct = {
  _id: string
  index: number
  name: string
  price: number
  currency: string
  period?: string
  roleId?: string
}

export function getColumns(
  roles: Role[],
  onUpdate: (id: string, index: number, roleId: string) => void,
  savingId: string | null,
  getCoupons: (id: string, index: number) => string[],
): ColumnDef<SubscriptionProduct>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const assigned = !!row.original.roleId
        return (
          <div className="flex items-center gap-1">
            <span>{row.getValue<string>('name')}</span>
            {assigned && <CheckIcon className="size-4 text-green-500" />}
          </div>
        )
      },
    },
    {
      accessorKey: "price",
      header: () => <div className="text-right">Price</div>,
      cell: ({ row }) => {
        const price = parseFloat(row.getValue("price"))
        const currency = row.original.currency
        const per = row.original.period ? ` / ${row.original.period}` : ""
        return (
          <div className="text-right font-medium">
            {price.toFixed(2)} {currency}
            {per}
          </div>
        )
      },
    },
    {
      accessorKey: "roleId",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      sortingFn: (a, b) => {
        const getName = (id?: string) =>
          roles.find((r) => r.id === id)?.name || ""
        return getName(a.original.roleId).localeCompare(getName(b.original.roleId))
      },
      cell: ({ row }) => {
        const prod = row.original
        return (
          <Select
            value={prod.roleId || "none"}
            onValueChange={(v) =>
              onUpdate(prod._id, prod.index, v === "none" ? "" : v)
            }
            disabled={savingId === `${prod._id}-${prod.index}`}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      },
    },
    {
      id: "coupons",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Coupons" />
      ),
      cell: ({ row }) => {
        const prod = row.original
        const list = getCoupons(prod._id, prod.index)
        return list.length ? list.join(", ") : "-"
      },
    },
  ]
}
