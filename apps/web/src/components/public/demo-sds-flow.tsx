"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/backend-client";

export function DemoSdsFlow({ listingId }: { listingId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [role, setRole] = useState<"seller" | "buyer">("buyer");
  const [quantity,setQuantity]=useState("1");
  const [address,setAddress]=useState("Demo receiving site — no shipment");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  useEffect(() => { setEnabled(["localhost", "127.0.0.1", "eco-globe-dev-web.vercel.app"].includes(window.location.hostname)); }, []);
  if (!enabled) return null;
  async function create() {
    if(busy)return;setBusy(true);setMessage("");
    try { const result=await apiFetch<{order:{id:number}}>("/api/demo-orders",{method:"POST",body:JSON.stringify({listingId:Number(listingId),quantity:Number(quantity),deliveryAddress:address})}); setMessage(`Demo order DEMO-${result.order.id} saved. Open My Orders to run the full workflow.`); }
    catch(e){setMessage(e instanceof Error?e.message:"Could not create demo order.");}finally{setBusy(false);}
  }
  return <section aria-label="Demo buy and sell" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-neutral-900">
    <h2 className="font-bold">Full Buy / Sell demo</h2>
    <p className="mt-2">Saved demo orders appear in Buyer, Seller and Admin. SDS, stock, payment and shipping steps are simulated. No real money or shipment; live verification is unchanged.</p>
    <div className="my-3 flex flex-col gap-2">{(["seller","buyer"] as const).map(view=><button key={view} type="button" aria-pressed={role===view} onClick={()=>setRole(view)} className={`rounded-full border px-3 py-2 capitalize ${role===view?"bg-neutral-900 text-white":"bg-white"}`}>{view} demo</button>)}</div>
    <a href="/demo/sds-demo-only.txt" download className="font-semibold underline">Demo document — not a valid SDS</a>
    {role==='seller'?<div className="mt-3"><p>Open Sales to accept a saved demo order, simulate dispatch and complete settlement. No SDS upload is required for demo orders.</p><Link href="/seller/sales" className="mt-2 block font-semibold underline">Open Seller Sales</Link></div>:<form onSubmit={e=>{e.preventDefault();void create();}} className="mt-3 space-y-3">
      <label className="block">Demo quantity<input type="number" min="0.001" max="1000000" step="any" required value={quantity} onChange={e=>setQuantity(e.target.value)} className="mt-1 w-full rounded border bg-white p-2" /></label>
      <label className="block">Demo delivery address<input required maxLength={1000} value={address} onChange={e=>setAddress(e.target.value)} className="mt-1 w-full rounded border bg-white p-2" /></label>
      <button disabled={busy} className="w-full rounded-full bg-neutral-900 px-3 py-2 font-semibold text-white disabled:opacity-40">{busy?"Saving…":"Create saved demo order"}</button>
      <Link href="/buyer/orders" className="block font-semibold underline">Open My Orders</Link>
    </form>}
    <p role="status" className="mt-3">{message}</p>
  </section>;
}
