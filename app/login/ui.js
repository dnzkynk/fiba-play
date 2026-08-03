"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function PlayerLoginForm({ labels }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/me");
      router.refresh();
    } else {
      setError(labels.loginFailed);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{labels.email}</Label>
        <Input id="email" type="email" autoComplete="email" required
          value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ad.soyad@fiba.com" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{labels.password}</Label>
        <Input id="password" type="password" required
          value={password} onChange={(e) => setPassword(e.target.value)} placeholder="fiba-······" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? labels.loggingIn : labels.loginBtn}
      </Button>
      <p className="text-xs leading-relaxed text-stone-500">{labels.noPassword}</p>
    </form>
  );
}
