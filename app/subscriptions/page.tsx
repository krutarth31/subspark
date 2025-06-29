"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { DataTable } from "@/components/ui/data-table";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getColumns, SubscriptionProduct, Role } from "./columns";
import { getCouponColumns, Coupon } from "./coupon-columns";

export default function SubscriptionsPage() {
  const [products, setProducts] = useState<SubscriptionProduct[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [guildName, setGuildName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [couponPercent, setCouponPercent] = useState("10");
  const [creating, setCreating] = useState(false);
  const [productOptions, setProductOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [subOptions, setSubOptions] = useState<
    Record<string, { value: string; label: string }[]>
  >({});
  const [couponProductId, setCouponProductId] = useState<string>("");
  const [couponSubIndex, setCouponSubIndex] = useState<string>("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const help = (
    <p>Assign Discord roles to each subscription product on this page.</p>
  );

  useEffect(() => {
    async function load() {
      try {
        const [rolesRes, productsRes, statusRes, couponsRes] =
          await Promise.all([
            apiFetch("/api/discord/roles"),
            apiFetch("/api/products"),
            apiFetch("/api/discord/status"),
            apiFetch("/api/coupons"),
          ]);
        const rolesData = await rolesRes.json().catch(() => ({}));
        const productsData = await productsRes.json().catch(() => ({}));
        const statusData = await statusRes.json().catch(() => ({}));
        const couponsData = await couponsRes.json().catch(() => ({}));
        setRoles(rolesData.roles || []);
        setGuildId(statusData.guildId || null);
        setGuildName(statusData.guildName || null);
        setCoupons(
          Array.isArray(couponsData.coupons) ? couponsData.coupons : [],
        );
        const list: SubscriptionProduct[] = [];
        const prodOpts: { value: string; label: string }[] = [];
        const subOpts: Record<string, { value: string; label: string }[]> = {};
        if (Array.isArray(productsData.products)) {
          for (const p of productsData.products) {
            prodOpts.push({ value: p._id, label: p.name });
            if (p.type !== "discord") continue;
            const subs: {
              name?: string;
              billing: string;
              price?: number;
              currency: string;
              period?: string;
              roleId?: string;
            }[] =
              Array.isArray(p.subProducts) && p.subProducts.length > 0
                ? p.subProducts
                : [
                    {
                      billing: p.billing,
                      price: p.price,
                      currency: p.currency,
                      period: p.period,
                      roleId: p.roleId,
                      name: p.name,
                    },
                  ];
            subs.forEach((s, idx) => {
              if (s.billing === "recurring" || s.billing === "one") {
                list.push({
                  _id: p._id,
                  index: idx,
                  product: p.name,
                  sub:
                    Array.isArray(p.subProducts) && p.subProducts.length > 0
                      ? s.name || s.billing
                      : undefined,
                  price: s.price ?? p.price,
                  currency: s.currency || p.currency,
                  period: s.billing === "recurring" ? s.period : undefined,
                  roleId: s.roleId,
                });
              }
              subOpts[p._id] = subOpts[p._id] || [];
              subOpts[p._id].push({
                value: String(idx),
                label: s.name || s.billing,
              });
            });
          }
        }
        setProducts(list);
        setProductOptions(prodOpts);
        setSubOptions(subOpts);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function updateRole(id: string, index: number, roleId: string) {
    if (!guildId) return;
    setSavingId(`${id}-${index}`);
    await toast.promise(
      (async () => {
        const res = await apiFetch(`/api/products/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roleId, serverId: guildId, subIndex: index }),
        });
        if (!res.ok) throw new Error("Request failed");
        setProducts((prev) =>
          prev.map((p) =>
            p._id === id && p.index === index
              ? { ...p, roleId: roleId || undefined }
              : p,
          ),
        );
      })(),
      {
        loading: "Saving...",
        success: "Role updated",
        error: "Failed to update",
      },
    );
    setSavingId(null);
  }

  async function createCoupon() {
    if (creating) return;
    setCreating(true);
    let productId: string | undefined;
    let subIndex: number | undefined;
    if (couponProductId) {
      productId = couponProductId;
    }
    if (couponSubIndex) {
      subIndex = Number(couponSubIndex);
    }
    const res = await apiFetch("/api/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: couponCode,
        percentOff: Number(couponPercent),
        productId,
        subIndex,
      }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      setCoupons((prev) => [
        ...prev,
        {
          _id: data.id,
          code: couponCode,
          percentOff: Number(couponPercent),
          active: true,
          productId,
          subIndex,
        },
      ]);
      setCouponCode("");
      setCouponPercent("10");
      setCouponProductId("");
      setCouponSubIndex("");
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to create");
    }
    setCreating(false);
  }

  async function toggleCoupon(id: string, active: boolean) {
    if (updatingId) return;
    setUpdatingId(id);
    const res = await apiFetch("/api/coupons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active }),
    });
    if (res.ok) {
      setCoupons((prev) =>
        prev.map((c) => (c._id === id ? { ...c, active } : c)),
      );
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to update");
    }
    setUpdatingId(null);
  }

  async function deleteCoupon(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    const res = await apiFetch("/api/coupons", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setCoupons((prev) => prev.filter((c) => c._id !== id));
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to delete");
    }
    setDeletingId(null);
  }

  async function assignCoupon(
    couponId: string,
    checked: boolean,
    productId: string,
    subIndex: number,
  ) {
    const body: any = { id: couponId }
    if (checked) {
      body.productId = productId
      body.subIndex = subIndex
    } else {
      body.productId = ""
      body.subIndex = null
    }
    const res = await apiFetch("/api/coupons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setCoupons((prev) =>
        prev.map((c) =>
          c._id === couponId
            ? {
                ...c,
                productId: checked ? productId : undefined,
                subIndex: checked ? subIndex : undefined,
              }
            : c,
        ),
      )
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || "Failed to update")
    }
  }

  const columns = getColumns(roles, updateRole, savingId, coupons, assignCoupon)
  const couponColumns = getCouponColumns(
    toggleCoupon,
    updatingId,
    deleteCoupon,
    deletingId,
  );

  return (
    <DashboardLayout title="Subscriptions" helpContent={help}>
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center p-6">
            <Spinner className="size-6" />
          </div>
        ) : products.length === 0 ? (
          <p>No products found.</p>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">
              Discord Guild: {guildName || guildId || "Not connected"}
            </div>
            <DataTable columns={columns} data={products} />
            <div className="mt-8 space-y-4">
              <h2 className="text-lg font-semibold">Coupons</h2>
              <div className="max-w-sm space-y-2">
                <Label htmlFor="coupon-code">Code</Label>
                <Input
                  id="coupon-code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                />
                <Label htmlFor="coupon-product" className="mt-2">
                  Product
                </Label>
                <Select
                  value={couponProductId || "all"}
                  onValueChange={(v) => {
                    setCouponProductId(v === "all" ? "" : v);
                    setCouponSubIndex("");
                  }}
                >
                  <SelectTrigger id="coupon-product" className="w-full">
                    <SelectValue placeholder="All products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All products</SelectItem>
                    {productOptions.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {couponProductId && subOptions[couponProductId] && (
                  <>
                    <Label htmlFor="coupon-sub" className="mt-2">
                      Sub-product
                    </Label>
                    <Select
                      value={couponSubIndex || "all"}
                      onValueChange={(v) =>
                        setCouponSubIndex(v === "all" ? "" : v)
                      }
                    >
                      <SelectTrigger id="coupon-sub" className="w-full">
                        <SelectValue placeholder="All sub-products" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All sub-products</SelectItem>
                        {subOptions[couponProductId].map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      If you only select a product, the coupon applies to all
                      its sub-products.
                    </p>
                  </>
                )}
                <Label htmlFor="coupon-percent" className="mt-2">
                  Percent Off
                </Label>
                <Input
                  id="coupon-percent"
                  value={couponPercent}
                  onChange={(e) =>
                    setCouponPercent(e.target.value.replace(/[^0-9]/g, ""))
                  }
                />
                <Button
                  className="mt-2"
                  onClick={createCoupon}
                  disabled={creating}
                >
                  {creating && <Spinner className="mr-2" />}Create Coupon
                </Button>
              </div>
              <DataTable columns={couponColumns} data={coupons} />
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
