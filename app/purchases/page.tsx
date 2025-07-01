"use client";
import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Spinner } from "@/components/ui/spinner";
import { DataTable } from "@/components/ui/data-table";
import { Popover, PopoverContent } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/use-notifications";
import { getColumns, Purchase } from "./columns";
import { formatDateUTC } from "@/lib/utils";

export default function PurchasesPage() {
  const [items, setItems] = useState<Purchase[] | null>(null);
  const [refundId, setRefundId] = useState<string | null>(null);
  const [reasonType, setReasonType] = useState("");
  const [reasonText, setReasonText] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const prevStatuses = useRef<Record<string, string | undefined>>({});
  const { addNotification } = useNotifications();

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/purchases");
      const data = await res.json().catch(() => ({}));
      const purchases = (data.purchases || []) as Purchase[];
      purchases.forEach((p) => {
        const status = p.refundRequest?.status;
        if (
          prevStatuses.current[p._id] &&
          prevStatuses.current[p._id] !== status &&
          (status === "approved" || status === "declined")
        ) {
          addNotification(`Refund ${status} for ${p.productName}`);
        }
        prevStatuses.current[p._id] = status;
      });
      setItems(purchases);
    };
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  async function handleAction(id: string, action: string) {
    if (!items) return;
    switch (action) {
      case "receipt": {
        // Open a blank tab immediately so popup blockers allow navigation
        const newTab = window.open("", "_blank");
        const res = await fetch(`/api/purchases/${id}/receipt`);
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.url) {
          if (newTab) newTab.location.href = data.url as string;
          else window.location.href = data.url as string;
        } else {
          if (newTab) newTab.close();
          toast.error(data.error || "Failed");
        }
        break;
      }
      case "payment": {
        const res = await fetch(`/api/purchases/${id}/payment-method`, {
          method: "POST",
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.url) {
          window.location.href = data.url as string;
        } else {
          toast.error(data.error || "Failed");
        }
        break;
      }
      case "refund": {
        setRefundId(id);
        break;
      }
    }
  }

  function toggleRow(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function submitRefund() {
    if (!refundId) return;
    const reason = reasonType === "other" ? reasonText : reasonType;
    setRefundId(null);
    setReasonType("");
    setReasonText("");
    await toast.promise(
      (async () => {
        const res = await fetch(`/api/purchases/${refundId}/refund`, {
          method: "POST",
          body: JSON.stringify({ reason }),
        });
        if (!res.ok) throw new Error("Failed");
        setItems((prev) =>
          prev
            ? prev.map((p) =>
                p._id === refundId
                  ? {
                      ...p,
                      refundRequest: { status: "requested", reason },
                      status: "refund_requested",
                    }
                  : p,
              )
            : prev,
        );
        prevStatuses.current[refundId] = "requested";
      })(),
      {
        loading: "Requesting refund...",
        success: "Refund requested",
        error: "Failed to refund",
      },
    );
  }


  const help = <p>All products you have purchased will appear here.</p>;

  return (
    <DashboardLayout title="Purchases" helpContent={help}>
      <div className="p-6">
        {items === null ? (
          <div className="flex justify-center">
            <Spinner className="size-6" />
          </div>
        ) : items.length === 0 ? (
          <p>No purchases found.</p>
        ) : (
          <DataTable
            columns={getColumns(handleAction, toggleRow, expanded)}
            data={items}
            renderSubRows={(row) => {
              const p = row.original as Purchase;
              if (!expanded[p._id]) return null;
              return (
                <div className="p-4 text-sm text-muted-foreground grid grid-cols-2 gap-2">
                  {p.paymentIntentId && (
                    <div className="col-span-1">Receipt: {p.paymentIntentId}</div>
                  )}
                  {p.subscriptionId && (
                    <div className="col-span-1">Sub: {p.subscriptionId}</div>
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
      <Popover open={!!refundId} onOpenChange={(o) => !o && setRefundId(null)}>
        <PopoverContent className="sm:max-w-md w-80 fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="space-y-2 mb-4">
            <h3 className="text-base font-semibold">Request Refund</h3>
            <p className="text-sm text-muted-foreground">
              Select a reason for your refund.
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={reasonType} onValueChange={setReasonType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_described">
                    Not as described
                  </SelectItem>
                  <SelectItem value="accidental">
                    Accidental purchase
                  </SelectItem>
                  <SelectItem value="quality">Poor quality</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {reasonType === "other" && (
              <div className="space-y-2">
                <Label htmlFor="reason">Details</Label>
                <textarea
                  id="reason"
                  className="min-h-[80px] w-full rounded-md border px-3 py-1"
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="mt-4 flex gap-2 justify-end">
            <Button onClick={submitRefund} disabled={!reasonType}>
              Submit
            </Button>
            <Button variant="outline" onClick={() => setRefundId(null)}>
              Cancel
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </DashboardLayout>
  );
}
