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

export type BuyerPurchase = {
  _id: string
  buyerName: string
  buyerEmail: string
  productName: string
  status: string
  createdAt: string
  paymentIntentId?: string
  refundRequest?: {
    status: string
    reason?: string
    sellerReason?: string
  }
}

export function getColumns(
  onAction: (id: string, action: string) => void,
): ColumnDef<BuyerPurchase>[] {
  return [
    { accessorKey: "buyerName", header: "Name" },
    { accessorKey: "buyerEmail", header: "Email" },
    { accessorKey: "productName", header: "Product" },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) =>
        new Date(row.getValue<string>("createdAt")).toLocaleDateString(),
    },
    { accessorKey: "status", header: "Status" },
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
              {p.refundRequest?.status === 'requested' && (
                <DropdownMenuItem onClick={() => onAction(p._id, 'approve')}>
                  Approve Refund
                </DropdownMenuItem>
              )}
              {p.refundRequest?.status === 'requested' && (
                <DropdownMenuItem onClick={() => onAction(p._id, 'decline')}>
                  Decline Refund
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
