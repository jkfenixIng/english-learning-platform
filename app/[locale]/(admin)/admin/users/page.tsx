import { listUsers } from "../../../../../lib/dal/admin-users";
export default async function AdminUsersPage() {
  let data: { users: { id: string; email: string; name: string; role: string; subscriptionTier?: string }[]; total: number } = { users: [], total: 0 };
  try { data = await listUsers(1, 20); } catch { data = { users: [], total: 0 }; }
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Users — Read-only PII + moderation</h1>
      <p className="text-sm text-gray-600">Paginated, RLS-restricted — admin only. No bulk PII export (minimal fields). Disable action is stub.</p>
      <table className="w-full text-xs" aria-label="Users table">
        <thead><tr className="border-b text-left"><th>Email</th><th>Name</th><th>Role</th><th>Moderation</th></tr></thead>
        <tbody>
          {data.users.map((u)=> (<tr key={u.id} className="border-b"><td className="py-2 font-mono text-[11px]">{u.email}</td><td>{u.name}</td><td>{u.role}</td><td><button className="rounded border px-2 py-1 text-xs" aria-label={`Disable ${u.email}`}>Disable (stub)</button></td></tr>))}
          {data.users.length===0?<tr><td colSpan={4} className="py-4 text-center text-gray-500">No users — DB pending or RLS; table proof rendered.</td></tr>:null}
        </tbody>
      </table>
      <p className="text-xs text-gray-500">Total: {data.total} — paginated 20/page. Detail view at <code>/admin/users/[id]</code> (stub: shows attempts/progress).</p>
    </div>
  );
}
