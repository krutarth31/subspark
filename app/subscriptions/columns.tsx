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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import type { Coupon } from "./coupon-columns"

export type Role = {
  id: string
  name: string
}

export type SubscriptionProduct = {
  _id: string
  index: number
  product: string
  sub?: string
  price: number
  currency: string
  period?: string
  roleId?: string
}

export function getColumns(
  roles: Role[],
  onUpdate: (id: string, index: number, roleId: string) => void,
  savingId: string | null,
  coupons: Coupon[],
  onAssignCoupon: (
    couponId: string,
    checked: boolean,
    productId: string,
    subIndex: number,
  ) => void,
): ColumnDef<SubscriptionProduct>[] {
  return [
    {
      accessorKey: "product",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Product" />
      ),
      cell: ({ row }) => row.getValue<string>('product'),
    },
    {
      accessorKey: "sub",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sub-product" />
      ),
      cell: ({ row }) => {
        const assigned = !!row.original.roleId
        const sub = row.getValue<string>('sub')
        return (
          <div className="flex items-center gap-1">
            <span>{sub || '-'}</span>
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
        const selected = coupons
          .filter((c) => {
            if (c.productId !== prod._id) return false
            return typeof c.subIndex === 'number'
              ? c.subIndex === prod.index
              : true
          })
          .map((c) => c._id)
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-40 truncate">
                {selected.length
                  ? coupons
                      .filter((c) => selected.includes(c._id))
                      .map((c) => c.code)
                      .join(', ')
                  : 'Select coupons'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {coupons.map((c) => {
                const checked = selected.includes(c._id)
                return (
                  <DropdownMenuCheckboxItem
                    key={c._id}
                    checked={checked}
                    onCheckedChange={(v) =>
                      onAssignCoupon(c._id, v, prod._id, prod.index)
                    }
                  >
                    <span className="font-mono">{c.code}</span>
                  </DropdownMenuCheckboxItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
