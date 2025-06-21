"use client"

import { ColumnDef } from "@tanstack/react-table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type Role = {
  id: string
  name: string
}

export type SubscriptionProduct = {
  _id: string
  name: string
  price: number
  currency: string
  period?: string
  roleId?: string
}

export function getColumns(
  roles: Role[],
  onUpdate: (id: string, roleId: string) => void,
  savingId: string | null,
): ColumnDef<SubscriptionProduct>[] {
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
      id: "role",
      header: "Role",
      cell: ({ row }) => {
        const prod = row.original
        return (
          <Select
            value={prod.roleId || "none"}
            onValueChange={(v) => onUpdate(prod._id, v === "none" ? "" : v)}
            disabled={savingId === prod._id}
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
  ]
}
