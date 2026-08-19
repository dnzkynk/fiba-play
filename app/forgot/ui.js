"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function ForgotForm({ labels }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle");
  async function submit(e) {
    e.preventDefault();
    setState("busy");
    await fetch("/api/forgot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setState("done");
  }
  if (state === "done") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <p className="font-semibold text-emerald-800">{labels.sent}</p>
        <p className="mt-2 text-sm leading-relaxed text-emerald-700">{labels.sentSub}</p>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fe">{labels.email}</Label>
        <Input id="fe" type="email" required autoFocus value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="name.surname@company.com" />
      </div>
      <Button type="submit" className="w-full" disabled={state === "busy"}>
        {state === "busy" ? labels.sending : labels.submit}
      </Button>
    </form>
  );
}
