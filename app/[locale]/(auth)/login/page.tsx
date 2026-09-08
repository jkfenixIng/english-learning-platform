"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMsg("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message);
    else router.push("/dashboard");
    setLoading(false);
  };

  return (
    <form onSubmit={submit} className="w-full max-w-sm rounded-xl border bg-white p-6 shadow dark:bg-gray-900">
      <h1 className="mb-4 text-xl font-bold">Welcome back</h1>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required className="mb-3 w-full rounded border px-3 py-2" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" required className="mb-3 w-full rounded border px-3 py-2" />
      {msg ? <p className="mb-3 text-sm text-red-600">{msg}</p> : null}
      <button disabled={loading} className="w-full rounded bg-primary py-2 text-white disabled:opacity-50">{loading ? "..." : "Log in"}</button>
      <p className="mt-3 text-center text-sm"><Link href="/register" className="text-indigo-600">No account? Sign up</Link></p>
    </form>
  );
}
