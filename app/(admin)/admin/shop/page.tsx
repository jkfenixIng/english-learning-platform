import { prisma } from "../../../../lib/db";
export default async function AdminShopPage() {
  let items: { title: string; priceXp: number; isPremium: boolean }[] = [];
  try { items = await prisma.shopItem.findMany({ take: 20 }); } catch { items = []; }
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Shop Items — CRUD</h1>
      <p className="text-sm text-gray-600">Premium item <code>Premium Badge Frame — Diamond</code> shows paywall modal for free users (see shop page).</p>
      <table className="w-full text-sm" aria-label="Shop table"><thead><tr className="border-b text-left"><th>Title</th><th>XP</th><th>Premium</th></tr></thead><tbody>{items.map(i=>(<tr key={i.title} className="border-b"><td className="py-2">{i.title}</td><td>{i.priceXp}</td><td>{i.isPremium?"Yes":"No"}</td></tr>))}{items.length===0?<tr><td colSpan={3} className="py-4 text-center text-gray-500">No items — DB pending; UI proof.</td></tr>:null}</tbody></table>
      <form className="rounded border p-4 dark:border-gray-700" aria-label="Create shop item form"><h2 className="font-semibold">Create Shop Item (stub)</h2><input name="title" placeholder="Premium Badge Frame" className="mt-2 w-full rounded border px-2 py-1" /><button type="submit" className="mt-2 rounded bg-indigo-600 px-4 py-2 text-sm text-white">Create</button></form>
    </div>
  );
}
