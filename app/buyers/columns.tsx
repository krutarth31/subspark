"use client";

import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ChevronDown, ChevronRight } from "lucide-react";
import {
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconClock,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export type BuyerPurchase = {
  _id: string;
  buyerName: string;
  buyerEmail: string;
  productName: string;
  price?: number;
  currency?: string;
  status: string;
  createdAt: string;
  invoiceId?: string;
  paymentIntentId?: string;
  refundRequest?: {
    status: string;
    reason?: string;
    sellerReason?: string;
  };
};

export function getColumns(
  onAction: (id: string, action: string) => void,
  onToggle?: (id: string) => void,
  expanded?: Record<string, boolean>,
): ColumnDef<BuyerPurchase>[] {
  return [
    {
      id: "expand",
      header: "",
      cell: ({ row }) => {
        const p = row.original;
        const show =
          p.paymentIntentId ||
          p.refundRequest?.reason ||
          p.refundRequest?.sellerReason;
        if (!show) return null;
        const isOpen = !!expanded?.[p._id];
        return (
          <Button
            variant="ghost"
            size="icon"
            className="size-5"
            onClick={() => onToggle?.(p._id)}
          >
            {isOpen ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
            <span className="sr-only">Toggle</span>
          </Button>
        );
      },
    },
    { accessorKey: "buyerName", header: "Name" },
    { accessorKey: "buyerEmail", header: "Email" },
    { accessorKey: "productName", header: "Product" },
    {
      accessorKey: "price",
      header: () => <div className="text-right">Price</div>,
      cell: ({ row }) => {
        const price = row.original.price;
        const currency = row.original.currency;
        return price != null ? (
          <div className="text-right">
            {price.toFixed(2)} {currency}
          </div>
        ) : (
          "-"
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Date/Time",
      cell: ({ row }) =>
        new Date(row.getValue<string>("createdAt")).toLocaleString(),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const p = row.original;
        let label = row.getValue<string>("status");
        let icon: React.ReactNode = null;
        if (p.refundRequest?.status === "requested") {
          label = "Refund requested";
          icon = <IconClock className="text-yellow-500" />;
        } else if (p.refundRequest?.status === "declined") {
          label = "Refund declined";
          icon = <IconCircleXFilled className="text-red-500" />;
        } else if (p.refundRequest?.status === "approved") {
          label = "Refunded";
          icon = <IconCircleCheckFilled className="text-green-500" />;
        }
        return (
          <Badge variant="outline" className="px-1.5 text-muted-foreground">
            {icon}
            {label}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const p = row.original;
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
                <DropdownMenuItem onClick={() => onAction(p._id, "invoice")}>
                  Download Invoice
                </DropdownMenuItem>
              )}
              {p.paymentIntentId && p.status === "paid" && (
                <DropdownMenuItem onClick={() => onAction(p._id, "refund")}>
                  Refund Purchase
                </DropdownMenuItem>
              )}
              {p.refundRequest?.status === "requested" && (
                <DropdownMenuItem onClick={() => onAction(p._id, "approve")}>
                  Approve Refund
                </DropdownMenuItem>
              )}
              {p.refundRequest?.status === "requested" && (
                <DropdownMenuItem onClick={() => onAction(p._id, "decline")}>
                  Decline Refund
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
