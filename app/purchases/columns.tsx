"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type Purchase = {
  _id: string
  productId: string
  productName: string
  status: string
  createdAt: string
  invoiceId?: string
  subscriptionId?: string
  paymentIntentId?: string
  customerId?: string
  sellerId: string
  refundRequest?: {
    status: string
    reason?: string
    sellerReason?: string
  }
}

export function getColumns(onAction: (id: string, action: string) => void): ColumnDef<Purchase>[] {
  return [
    {
      accessorKey: "productName",
      header: "Product",
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => new Date(row.getValue<string>("createdAt")).toLocaleDateString(),
    },
    {
      accessorKey: "status",
      header: "Status",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const p = row.original
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
              {p.invoiceId && (
                <DropdownMenuItem onClick={() => onAction(p._id, "invoice")}>Download Invoice</DropdownMenuItem>
              )}
              {p.subscriptionId && p.status !== "canceled" && (
                <DropdownMenuItem onClick={() => onAction(p._id, "cancel")}>Cancel Subscription</DropdownMenuItem>
              )}
              {p.customerId && (
                <DropdownMenuItem onClick={() => onAction(p._id, "payment")}>Change Payment Method</DropdownMenuItem>
              )}
              {p.paymentIntentId && !p.refundRequest && (
                <DropdownMenuItem onClick={() => onAction(p._id, "refund")}>Request Refund</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
