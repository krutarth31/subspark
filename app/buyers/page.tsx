"use client";
import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { DataTable } from "@/components/ui/data-table";
import { Spinner } from "@/components/ui/spinner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getColumns, BuyerPurchase } from "./columns";

export default function BuyersPage() {
  const [items, setItems] = useState<BuyerPurchase[] | null>(null);
  const [actionInfo, setActionInfo] = useState<{
    id: string;
    type: "approve" | "decline";
  } | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const prevStatuses = useRef<Record<string, string | undefined>>({});

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/buyers");
      const data = await res.json().catch(() => ({}));
      const buyers = (data.buyers || []) as BuyerPurchase[];
      buyers.forEach((b) => {
        const status = b.refundRequest?.status;
        if (
          prevStatuses.current[b._id] &&
          prevStatuses.current[b._id] !== status &&
          status === "requested"
        ) {
          toast.info(`Refund requested for ${b.productName}`);
        }
        prevStatuses.current[b._id] = status;
      });
      setItems(buyers);
    };
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  async function handleAction(id: string, action: string) {
    if (!items) return;

    if (action === "approve" || action === "decline") {
      setActionInfo({ id, type: action });
    }
  }

  function toggleRow(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function submitAction() {
    if (!actionInfo) return;
    const { id, type } = actionInfo;
    const body: Record<string, string> = { action: type };
    if (type === "decline") body.reason = declineReason;
    setActionInfo(null);
    setDeclineReason("");
    await toast.promise(
      (async () => {
        const res = await fetch(`/api/purchases/${id}/refund`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed");
        setItems((prev) =>
          prev
            ? prev.map((p) =>
                p._id === id
                  ? {
                      ...p,
                      status: type === "approve" ? "refunded" : p.status,
                      refundRequest: {
                        ...(p.refundRequest || {}),
                        status: type === "approve" ? "approved" : "declined",
                        sellerReason:
                          type === "decline"
                            ? declineReason
                            : p.refundRequest?.sellerReason,
                      },
                    }
                  : p,
              )
            : prev,
        );
      })(),
      {
        loading: type === "approve" ? "Refunding..." : "Saving...",
        success: type === "approve" ? "Refunded" : "Declined",
        error: "Failed",
      },
    );
  }

  const help = <p>View your customers and refund purchases if needed.</p>;

  return (
    <DashboardLayout title="Buyers" helpContent={help}>
      <div className="p-6">
        {items === null ? (
          <div className="flex justify-center">
            <Spinner className="size-6" />
          </div>
        ) : items.length === 0 ? (
          <p>No buyers found.</p>
        ) : (
          <DataTable
            columns={getColumns(handleAction, toggleRow, expanded)}
            data={items}
            renderSubRows={(row) => {
              const p = row.original as BuyerPurchase;
              if (!expanded[p._id]) return null;
              return (
                <div className="p-4 text-sm text-muted-foreground grid grid-cols-2 gap-2">
                  {p.paymentIntentId && (
                    <div className="col-span-1">
                      Payment: {p.paymentIntentId}
                    </div>
                  )}
                  {p.refundRequest?.reason && (
                    <div className="col-span-2">
                      Reason: {p.refundRequest.reason}
                    </div>
                  )}
                  {p.refundRequest?.sellerReason && (
                    <div className="col-span-2">
                      Seller: {p.refundRequest.sellerReason}
                    </div>
                  )}
                </div>
              );
            }}
          />
        )}
      </div>
      <Sheet
        open={!!actionInfo}
        onOpenChange={(o) => !o && setActionInfo(null)}
      >
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {actionInfo?.type === "approve"
                ? "Approve Refund"
                : "Decline Refund"}
            </SheetTitle>
          </SheetHeader>
          {actionInfo?.type === "decline" && (
            <div className="p-4 space-y-2">
              <Label htmlFor="decline">Reason</Label>
              <textarea
                id="decline"
                className="min-h-[80px] w-full rounded-md border px-3 py-1"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
              />
            </div>
          )}
          <SheetFooter>
            <Button onClick={submitAction}>Submit</Button>
            <SheetClose asChild>
              <Button variant="outline">Cancel</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
