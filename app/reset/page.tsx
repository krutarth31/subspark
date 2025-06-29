"use client";
import { useState, FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { HelpButton } from "@/components/help-button";

export default function ResetPage() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const help = <p>Enter your new password to reset your account.</p>;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setError("");
    setLoading(true);
    const res = await apiFetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Reset failed");
      setLoading(false);
      return;
    }
    setMessage("Password reset. You can now login.");
    setLoading(false);
    setTimeout(() => router.push("/"), 1500);
  }

  if (!token) return <div className="p-6 text-center">Invalid reset token</div>;

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <div className="absolute right-2 top-2">
        <HelpButton content={help} />
      </div>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
          <Spinner className="size-6" />
        </div>
      )}
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-bold">Reset Password</h1>
        </div>
        <div className="grid gap-3">
          <Label htmlFor="password">New Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="confirm">Confirm Password</Label>
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        {message && <p className="text-sm text-green-600">{message}</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Spinner className="mr-2" />}
          Reset Password
        </Button>
      </form>
    </div>
  );
}
