"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "../../../lib/supabase/client";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMsg("");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) setMsg(error.message);
    else { setMsg("Check your email to confirm, then log in."); }
    setLoading(false);
  };

  return (
    <form onSubmit={submit} className="w-full max-w-sm rounded-xl border bg-white p-6 shadow dark:bg-gray-900">
      <h1 className="mb-4 text-xl font-bold">Create account</h1>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required className="mb-3 w-full rounded border px-3 py-2" />
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required className="mb-3 w-full rounded border px-3 py-2" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6)" type="password" required minLength={6} className="mb-3 w-full rounded border px-3 py-2" />
      {msg ? <p className="mb-3 text-sm text-amber-600">{msg}</p> : null}
      <button disabled={loading} className="w-full rounded bg-indigo-600 py-2 text-white disabled:opacity-50">{loading ? "..." : "Sign up"}</button>
      <p className="mt-3 text-center text-sm"><Link href="/login" className="text-indigo-600">Already have an account? Log in</Link></p>
    </form>
  );
}
