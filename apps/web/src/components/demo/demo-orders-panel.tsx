"use client";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/backend-client";
interface DemoOrder {id:number; title:string; quantity:number; totalAmount:number;currencyCode:string;deliveryAddress:string;buyer:string;seller:string;status:string}
const steps=[['submitted','Buyer order submitted'],['accepted','Seller accepted'],['funded','Demo payment funded'],['dispatched','Seller dispatched'],['delivered','Buyer received'],['settled','Seller paid (simulated)']] as const;
const actions:Record<string,{status:string;label:string}>={submitted:{status:'accepted',label:'Simulate seller acceptance'},accepted:{status:'funded',label:'Simulate buyer payment'},funded:{status:'dispatched',label:'Simulate seller dispatch'},dispatched:{status:'delivered',label:'Confirm demo delivery'},delivered:{status:'settled',label:'Simulate seller settlement'}};
export function DemoOrdersPanel(){
 const [orders,setOrders]=useState<DemoOrder[]>([]),[error,setError]=useState(''),[enabled,setEnabled]=useState(false),[busy,setBusy]=useState<number|null>(null);
 const refresh=useCallback(async()=>{try{const data=await apiFetch<{orders:DemoOrder[]}>('/api/demo-orders');setOrders(data.orders);setEnabled(true);setError('');}catch(e){if(e && typeof e==='object' && 'status' in e && e.status===404)return;setError(e instanceof Error?e.message:'Demo orders unavailable.');}},[]);
 useEffect(()=>{void refresh();},[refresh]);
 async function advance(id:number,status:string){setBusy(id);try{await apiFetch(`/api/demo-orders/${id}`,{method:'PATCH',body:JSON.stringify({status})});await refresh();}catch(e){setError(e instanceof Error?e.message:'Update failed.');}finally{setBusy(null);}}
 if(!enabled&&!error)return null;
 return <section aria-label="Saved demo orders" className="m-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
 <div className="flex justify-between"><h2 className="text-lg font-bold">Saved demo orders</h2><button onClick={()=>void refresh()} className="underline">Refresh demo orders</button></div>
 <p className="my-2 text-sm">DEMO ONLY — stored separately from real orders. Payment, SDS review, shipping and settlement are simulated. Either participant can demonstrate both roles.</p>
 {error&&<p role="alert">{error}</p>}{orders.length===0&&<p>No demo orders yet. Create one from any listing.</p>}
 {orders.map(o=><article key={o.id} className="mt-3 rounded-xl border bg-white p-4"><h3 className="font-bold">DEMO-{o.id} · {o.title}</h3><p className="text-sm">Buyer: {o.buyer} · Seller: {o.seller}</p><p className="text-sm">Quantity {o.quantity} · {o.currencyCode} {Number(o.totalAmount).toFixed(2)} simulated total · {o.deliveryAddress}</p>
 <ol className="my-3 flex flex-wrap gap-3 text-sm">{steps.map(([code,label],index)=><li key={code} className={index<=steps.findIndex(s=>s[0]===o.status)?'font-bold text-green-800':'text-neutral-500'}>{label}</li>)}</ol>
 <p className="font-semibold">Status: {o.status}{o.status==='cancelled'?' — simulated refund; no real funds moved.':''}</p>
 <div className="mt-3 flex flex-wrap gap-2">{actions[o.status]&&<button disabled={busy!==null} onClick={()=>void advance(o.id,actions[o.status]!.status)} className="rounded-full bg-neutral-900 px-4 py-2 text-white disabled:opacity-40">{actions[o.status]!.label}</button>}{!['settled','cancelled'].includes(o.status)&&<button disabled={busy!==null} onClick={()=>void advance(o.id,'cancelled')} className="rounded-full border px-4 py-2">Cancel demo / simulate refund</button>}</div>
 </article>)}
 </section>;
}
