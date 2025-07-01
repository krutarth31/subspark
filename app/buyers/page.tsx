"use client";
import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { DataTable } from "@/components/ui/data-table";
import { Spinner } from "@/components/ui/spinner";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/use-notifications";
import { getColumns, BuyerPurchase } from "./columns";
import { formatDateUTC } from "@/lib/utils";

export default function BuyersPage() {
  const [items, setItems] = useState<BuyerPurchase[] | null>(null);
  const [actionInfo, setActionInfo] = useState<{
    id: string;
    type: "approve" | "decline";
  } | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const prevStatuses = useRef<Record<string, string | undefined>>({});
  const { addNotification } = useNotifications();

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
          addNotification(`Refund requested for ${b.productName}`);
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
    } else if (action === "refund") {
      setActionInfo({ id, type: "refund" });
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
                      status:
                        type === "approve" || type === "refund"
                          ? "refunded"
                          : p.status,
                      refundRequest:
                        type === "decline"
                          ? {
                              ...(p.refundRequest || {}),
                              status: "declined",
                              sellerReason: declineReason,
                            }
                          : {
                              ...(p.refundRequest || {}),
                              status: "approved",
                            },
                    }
                  : p,
              )
            : prev,
        );
      })(),
      {
        loading: type === "decline" ? "Saving..." : "Refunding...",
        success: type === "decline" ? "Declined" : "Refunded",
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
                  {p.subProduct && (
                    <div className="col-span-1">Option: {p.subProduct}</div>
                  )}
                  {p.nextDueDate && (
                    <div className="col-span-1">
                      Next Due: {formatDateUTC(p.nextDueDate)}
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
      <Popover open={!!actionInfo} onOpenChange={(o) => !o && setActionInfo(null)}>
        <PopoverContent className="sm:max-w-md w-80 fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="space-y-2 mb-4">
            <h3 className="text-base font-semibold">
              {actionInfo?.type === "approve"
                ? "Approve Refund"
                : actionInfo?.type === "refund"
                ? "Refund Purchase"
                : "Decline Refund"}
            </h3>
          </div>
          {actionInfo?.type === "decline" && (
            <div className="space-y-2 mb-4">
              <Label htmlFor="decline">Reason</Label>
              <textarea
                id="decline"
                className="min-h-[80px] w-full rounded-md border px-3 py-1"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
              />
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button onClick={submitAction}>Submit</Button>
            <Button variant="outline" onClick={() => setActionInfo(null)}>
              Cancel
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </DashboardLayout>
  );
}
