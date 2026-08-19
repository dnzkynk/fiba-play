"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function ResetForm({ token, labels }) {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (p1.length < 6) return setError(labels.short);
    if (p1 !== p2) return setError(labels.mismatch);
    setState("busy");
    const res = await fetch("/api/reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password: p1 }),
    });
    if (res.ok) return setState("done");
    setState("idle");
    setError(res.status === 400 ? labels.invalid : labels.generic);
  }

  if (state === "done") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <p className="font-semibold text-emerald-800">{labels.done}</p>
        <a href="/login" className="mt-4 inline-block font-medium text-fiba-700 hover:underline">
          {labels.goLogin}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="np">{labels.newPass}</Label>
        <Input id="np" type="password" required minLength={6} value={p1}
          onChange={(e) => setP1(e.target.value)} autoComplete="new-password" placeholder="••••••••" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="np2">{labels.repeat}</Label>
        <Input id="np2" type="password" required minLength={6} value={p2}
          onChange={(e) => setP2(e.target.value)} autoComplete="new-password" placeholder="••••••••" />
      </div>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Button type="submit" className="w-full" disabled={state === "busy"}>
        {state === "busy" ? labels.saving : labels.submit}
      </Button>
    </form>
  );
}
