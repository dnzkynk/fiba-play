"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function ApplyForm({ labels }) {
  const [f, setF] = useState({ fullName: "", email: "", phone: "", country: "", company: "" });
  const [state, setState] = useState("idle"); // idle | busy | done
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    setState("busy");
    const res = await fetch("/api/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(f),
    });
    if (res.ok) return setState("done");
    setState("idle");
    setError(res.status === 409 ? labels.dupe : labels.err);
  }

  if (state === "done") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <p className="text-lg font-semibold text-emerald-800">{labels.done}</p>
        <p className="mt-2 text-sm text-emerald-700">{labels.doneSub}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bn">{labels.fullName}</Label>
        <Input id="bn" value={f.fullName} onChange={set("fullName")} required maxLength={100} autoFocus />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="be">{labels.email}</Label>
          <Input id="be" type="email" value={f.email} onChange={set("email")} required placeholder="ad.soyad@fiba.com" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bp">{labels.phone}</Label>
          <Input id="bp" type="tel" value={f.phone} onChange={set("phone")} required placeholder="+90 5xx xxx xx xx" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bc">{labels.country}</Label>
          <Input id="bc" value={f.country} onChange={set("country")} required maxLength={60} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bs">{labels.company}</Label>
          <Input id="bs" value={f.company} onChange={set("company")} required maxLength={80} />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" size="lg" disabled={state === "busy"}>
        {state === "busy" ? labels.sending : labels.submit}
      </Button>
    </form>
  );
}
