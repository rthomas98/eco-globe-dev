"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Share2, Heart } from "lucide-react";
import { Button, Input, Select } from "@eco-globe/ui";
import { ListingMap } from "../public/listing-map";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;
const TOTAL = 7;

function StepLayout({ step, children, onBack, onNext, onSave, nextLabel }: {
  step: Step; children: React.ReactNode; onBack: () => void; onNext: () => void; onSave?: () => void; nextLabel?: string;
}) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #F0F0F0" }}>
        <h2 className="text-base font-bold text-neutral-900">Add Listing</h2>
        <button onClick={() => router.push("/seller/listings")} className="flex size-9 items-center justify-center rounded-full hover:bg-neutral-100"><X className="size-5 text-neutral-500" /></button>
      </header>
      <div className="flex flex-1 justify-center overflow-y-auto px-6 py-8"><div className="w-full max-w-[600px]">{children}</div></div>
      <div className="relative">
        <div className="h-1 w-full bg-neutral-100"><div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${(step / TOTAL) * 100}%` }} /></div>
        <div className="flex items-center justify-between px-6 py-4">
          <Button variant="secondary" size="md" onClick={onBack}>Back</Button>
          <Button variant="primary" size="md" onClick={onNext} className="min-w-[160px]">{nextLabel ?? "Next"}</Button>
          {onSave ? <Button variant="secondary" size="md" onClick={onSave}>Save as Draft</Button> : <div />}
        </div>
      </div>
    </div>
  );
}

function FileUpload({ images, onChange }: { images: string[]; onChange: (imgs: string[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) => { if (e.target?.result) onChange([...images, e.target.result as string]); };
      reader.readAsDataURL(f);
    });
  };

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-neutral-900">Listing image</p>
      {images.length === 0 ? (
        <div onClick={() => ref.current?.click()} className="flex cursor-pointer flex-col items-center gap-3 rounded-xl bg-neutral-50 py-10" style={{ border: "2px dashed #D0D0D0" }}>
          <p className="text-sm text-neutral-700"><span className="font-semibold">Drop file here</span> or</p>
          <span className="rounded-full px-4 py-1.5 text-sm font-medium text-neutral-700" style={{ border: "1px solid #D0D0D0" }}>Browse</span>
          <p className="text-xs text-neutral-400">Accepts .gif, .jpg, .png and .mov</p>
        </div>
      ) : (
        <div className="flex gap-3 flex-wrap">
          {images.map((img, i) => (
            <div key={i} className="relative size-24 overflow-hidden rounded-lg">
              <img src={img} alt="" className="size-full object-cover" />
              <button onClick={() => onChange(images.filter((_, idx) => idx !== i))} className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/50 text-white"><X className="size-3" /></button>
            </div>
          ))}
          <div onClick={() => ref.current?.click()} className="flex size-24 cursor-pointer items-center justify-center rounded-lg" style={{ border: "2px dashed #D0D0D0" }}>
            <span className="rounded-full px-3 py-1 text-xs font-medium text-neutral-700" style={{ border: "1px solid #D0D0D0" }}>Add</span>
          </div>
        </div>
      )}
      <input ref={ref} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
    </div>
  );
}

export function AddListingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState({
    name: "", category: "", images: [] as string[],
    material: "", listingType: "", grade: "", color: "", shelfLife: "", storage: "", pkg: "", weight: "", usage: "", origin: "",
    price: "", moq: "", qty: "", unit: "lb",
    description: "",
    claims: [] as string[], certFiles: [] as File[], sustainNotes: "",
    sameAsCompany: false, originLocation: "",
  });
  const up = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));
  const toggleClaim = (c: string) => up("claims", form.claims.includes(c) ? form.claims.filter((x) => x !== c) : [...form.claims, c]);

  const handleSaveDraft = () => router.push("/seller/listings");

  const cats = [{ value: "", label: "-- Choose --" }, { value: "polymer", label: "Polymer" }, { value: "refinery", label: "Refinery" }, { value: "waste", label: "Waste" }, { value: "plactic", label: "Plactic" }];
  const types = [{ value: "", label: "-- Choose --" }, { value: "dried", label: "Dried" }, { value: "wet", label: "Wet" }, { value: "processed", label: "Processed" }];
  const grades = [{ value: "", label: "-- Choose --" }, { value: "export", label: "Export Standard" }, { value: "premium", label: "Premium" }, { value: "standard", label: "Standard" }];
  const claims = ["Recycled Content", "Bio-based Material", "Waste-derived Feedstock", "Low-carbon Process", "Certified Sustainable", "Others"];

  return (
    <>
      {step === 1 && (
        <StepLayout step={1} onBack={() => router.push("/seller/listings")} onNext={() => setStep(2)} onSave={handleSaveDraft}>
          <h1 className="mb-8 text-3xl font-bold text-neutral-900">Listing information</h1>
          <div className="flex flex-col gap-6">
            <Input label="Listing name" id="name" value={form.name} onChange={(e) => up("name", e.target.value)} />
            <Select label="Listing category" id="cat" options={cats} value={form.category} onChange={(e) => up("category", e.target.value)} />
            <FileUpload images={form.images} onChange={(imgs) => up("images", imgs)} />
          </div>
        </StepLayout>
      )}

      {step === 2 && (
        <StepLayout step={2} onBack={() => setStep(1)} onNext={() => setStep(3)} onSave={handleSaveDraft}>
          <h1 className="mb-8 text-3xl font-bold text-neutral-900">Specifications</h1>
          <div className="flex flex-col gap-5">
            <Input label="Material composition" id="mat" value={form.material} onChange={(e) => up("material", e.target.value)} />
            <Select label="Listing type" id="lt" options={types} value={form.listingType} onChange={(e) => up("listingType", e.target.value)} />
            <Select label="Grade / purity" id="gr" options={grades} value={form.grade} onChange={(e) => up("grade", e.target.value)} />
            <Input label="Color" id="color" value={form.color} onChange={(e) => up("color", e.target.value)} />
            <Input label="Shelf Life" id="sl" value={form.shelfLife} onChange={(e) => up("shelfLife", e.target.value)} />
            <Input label="Storage & handling" id="sh" value={form.storage} onChange={(e) => up("storage", e.target.value)} />
            <Input label="Package" id="pkg" value={form.pkg} onChange={(e) => up("pkg", e.target.value)} />
            <Input label="Weight" id="wt" value={form.weight} onChange={(e) => up("weight", e.target.value)} />
            <Input label="Usage" id="usg" value={form.usage} onChange={(e) => up("usage", e.target.value)} />
            <Input label="Place of Origin" id="poo" value={form.origin} onChange={(e) => up("origin", e.target.value)} />
          </div>
        </StepLayout>
      )}

      {step === 3 && (
        <StepLayout step={3} onBack={() => setStep(2)} onNext={() => setStep(4)} onSave={handleSaveDraft}>
          <h1 className="mb-8 text-3xl font-bold text-neutral-900">Pricing & Supply</h1>
          <div className="flex flex-col gap-6">
            <Input label="Unit price" id="price" value={form.price} onChange={(e) => up("price", e.target.value)} />
            <Input label="MOQ" id="moq" value={form.moq} onChange={(e) => up("moq", e.target.value)} />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-900">Quantity available</label>
              <div className="flex">
                <input type="text" value={form.qty} onChange={(e) => up("qty", e.target.value)} className="flex-1 rounded-l-lg px-4 py-3 text-sm outline-none placeholder:text-neutral-400" style={{ border: "1px solid #E0E0E0", borderRight: "none" }} />
                <select value={form.unit} onChange={(e) => up("unit", e.target.value)} className="rounded-r-lg bg-neutral-50 px-3 py-3 text-sm outline-none" style={{ border: "1px solid #E0E0E0" }}>
                  <option value="lb">lb</option><option value="ton">ton</option><option value="kg">kg</option>
                </select>
              </div>
            </div>
          </div>
        </StepLayout>
      )}

      {step === 4 && (
        <StepLayout step={4} onBack={() => setStep(3)} onNext={() => setStep(5)} onSave={handleSaveDraft}>
          <h1 className="mb-8 text-3xl font-bold text-neutral-900">Description</h1>
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-900">Description text</label>
              <textarea rows={6} value={form.description} onChange={(e) => up("description", e.target.value)} className="w-full rounded-lg px-4 py-3 text-sm outline-none placeholder:text-neutral-400 resize-none" style={{ border: "1px solid #E0E0E0" }} />
            </div>
            <AddBlockButton />
          </div>
        </StepLayout>
      )}

      {step === 5 && (
        <StepLayout step={5} onBack={() => setStep(4)} onNext={() => setStep(6)} onSave={handleSaveDraft}>
          <h1 className="mb-8 text-3xl font-bold text-neutral-900">Sustainability & Certifications</h1>
          <div className="flex flex-col gap-6">
            <div>
              <p className="mb-3 text-sm font-medium text-neutral-900">Sustainability Claims</p>
              <div className="grid grid-cols-2 gap-3">
                {claims.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm text-neutral-700">
                    <input type="checkbox" checked={form.claims.includes(c)} onChange={() => toggleClaim(c)} className="size-4 rounded accent-neutral-900" /> {c}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-neutral-900">Certification Upload</p>
              <div className="flex cursor-pointer flex-col items-center gap-3 rounded-xl bg-neutral-50 py-10" style={{ border: "2px dashed #D0D0D0" }}>
                <p className="text-sm text-neutral-700"><span className="font-semibold">Drop file here</span> or</p>
                <span className="rounded-full px-4 py-1.5 text-sm font-medium text-neutral-700" style={{ border: "1px solid #D0D0D0" }}>Browse</span>
                <p className="text-xs text-neutral-400">Accepts .gif, .jpg, and .png</p>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-900">Sustainability Notes (Optional)</label>
              <textarea rows={4} value={form.sustainNotes} onChange={(e) => up("sustainNotes", e.target.value)} className="w-full rounded-lg px-4 py-3 text-sm outline-none placeholder:text-neutral-400 resize-none" style={{ border: "1px solid #E0E0E0" }} />
            </div>
          </div>
        </StepLayout>
      )}

      {step === 6 && (
        <StepLayout step={6} onBack={() => setStep(5)} onNext={() => setStep(7)} onSave={handleSaveDraft}>
          <h1 className="mb-8 text-3xl font-bold text-neutral-900">Origin</h1>
          <div className="flex flex-col gap-5">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" checked={form.sameAsCompany} onChange={(e) => up("sameAsCompany", e.target.checked)} className="size-4 rounded accent-neutral-900" /> Same as company location
            </label>
            <Input label="Origin location" id="ol" value={form.originLocation} onChange={(e) => up("originLocation", e.target.value)} />
            <div className="h-[300px] overflow-hidden rounded-xl"><ListingMap /></div>
          </div>
        </StepLayout>
      )}

      {step === 7 && (
        <div className="flex min-h-screen flex-col bg-white">
          <header className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #F0F0F0" }}>
            <h2 className="text-base font-bold text-neutral-900">Add Listing</h2>
            <button onClick={() => router.push("/seller/listings")} className="flex size-9 items-center justify-center rounded-full hover:bg-neutral-100"><X className="size-5 text-neutral-500" /></button>
          </header>
          <div className="flex flex-1 overflow-y-auto">
            {/* Preview */}
            <div className="flex-1 px-6 py-8">
              <div className="max-w-[900px] mx-auto">
                <h1 className="mb-1 text-2xl font-bold text-neutral-900">{form.name || "Wood Sawdust Industrial Grade A"}</h1>
                <p className="mb-6 text-sm text-neutral-500">Denham Springs, LA · 2.4 mi · <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs">MOQ: {form.moq || "3"} tons</span> <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs">300 kg CO₂e</span></p>
                <div className="flex gap-6">
                  <div className="flex-1">
                    <div className="relative mb-4 h-[380px] overflow-hidden rounded-xl bg-neutral-200">
                      <img src={form.images[0] || "/products/wood-chips.png"} alt="" className="size-full object-cover" />
                      <button className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/80"><Share2 className="size-4" /></button>
                      <button className="absolute right-4 top-16 flex size-10 items-center justify-center rounded-full bg-white/80"><Heart className="size-4" /></button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto">
                      {(form.images.length > 0 ? form.images : ["/products/wood-chips.png", "/products/wood-shavings.png", "/products/rutile-sand.png", "/products/coal-tar.png", "/products/molecular-sieve.png", "/products/zeolite-powder.png"]).map((img, i) => (
                        <div key={i} className={`size-16 shrink-0 overflow-hidden rounded-lg ${i === 0 ? "ring-2 ring-neutral-900" : ""}`}><img src={img} alt="" className="size-full object-cover" /></div>
                      ))}
                    </div>
                  </div>
                  <div className="w-[300px] shrink-0">
                    <div className="rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
                      <p className="text-3xl font-bold text-neutral-900">${form.price || "200"}</p>
                      <p className="mb-4 text-sm text-neutral-500">Minimum order quantity: {form.moq || "2"} tons</p>
                      <div className="mb-4 flex items-center justify-between"><span className="text-sm text-neutral-700">Quantity</span><div className="flex items-center gap-0 rounded-lg" style={{ border: "1px solid #E0E0E0" }}><button className="px-3 py-1.5 text-neutral-500">—</button><span className="px-3 py-1.5 text-sm font-medium">3</span><button className="px-3 py-1.5 text-neutral-500">+</button></div></div>
                      <div className="mb-2 flex justify-between text-sm"><span className="text-neutral-500">Item subtotal</span><span>$600.00</span></div>
                      <div className="mb-3 flex justify-between text-sm"><span className="text-neutral-500">Shipping total</span><span>$50</span></div>
                      <div className="mb-4 flex justify-between text-sm font-bold" style={{ borderTop: "1px solid #F0F0F0", paddingTop: "12px" }}><span>Subtotal</span><span>$650.00</span></div>
                      <Button variant="primary" size="lg" className="w-full">Buy Now</Button>
                    </div>
                    <div className="mt-4 rounded-xl bg-neutral-50 p-4">
                      <div className="mb-3 flex items-start gap-3"><span className="text-lg">🛡️</span><div><p className="text-sm font-semibold text-neutral-900">Secure payments</p><p className="text-xs text-neutral-500">Every payment you make is secured</p></div></div>
                      <div className="flex items-start gap-3"><span className="text-lg">💲</span><div><p className="text-sm font-semibold text-neutral-900">Money-back protection</p><p className="text-xs text-neutral-500">Guarantee if your order has issues</p></div></div>
                    </div>
                  </div>
                </div>

                <h2 className="mb-3 mt-8 text-lg font-bold text-neutral-900">Specifications</h2>
                <div className="flex flex-col">
                  {[["Storage Type", form.storage || "In dry place"], ["Specification", form.grade || "Export Standard"], ["Shelf Life", form.shelfLife || "12 months"], ["Composition", form.material || "Rice Husk"], ["Address", form.origin || "Baton Rouge, United State"], ["Manufacturer", "Baton Rouge"]].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-3" style={{ borderBottom: "1px solid #F0F0F0" }}><span className="text-sm text-neutral-700">{k}</span><span className="text-sm text-neutral-900">{v}</span></div>
                  ))}
                </div>

                <h2 className="mb-3 mt-8 text-lg font-bold text-neutral-900">Overview</h2>
                <p className="text-sm leading-relaxed text-neutral-700">{form.description || "For a limited time only pick up a Caracal Car816 A2 piston rifle with 500 rounds of Federal soft point ammo! Just add the firearm to cart and the ammo case will automatically be applied to cart with discount!"}</p>
                <button className="mt-2 text-sm font-bold text-neutral-900 underline">Read More</button>

                <h2 className="mb-3 mt-8 text-lg font-bold text-neutral-900">Seller</h2>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-600">A</div>
                  <div><p className="text-sm font-semibold text-neutral-900">Acme Corp <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">VERIFIED</span> ✅</p><p className="text-xs text-neutral-500">Denham Springs, LA · Manufacture</p></div>
                </div>
                <div className="h-[250px] overflow-hidden rounded-xl"><ListingMap /></div>

                <h2 className="mb-3 mt-8 text-lg font-bold text-neutral-900">Carbon Analytics Tool</h2>
                <div className="rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
                  <div className="flex flex-col gap-4">
                    <Input label="Your Address" id="addr" />
                    <Select label="Transport Type" id="tt" options={[{ value: "", label: "-- Choose --" }, { value: "truck", label: "Truck" }, { value: "rail", label: "Rail" }, { value: "ship", label: "Ship" }]} />
                    <Button variant="primary" size="md">Calculate</Button>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-neutral-50 px-5 py-3">
                  <span className="text-sm text-neutral-500">Was this tool helpful, give us your feedback here</span>
                  <div className="flex gap-2"><button className="text-neutral-400">👍</button><button className="text-neutral-400">👎</button></div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="h-1 w-full bg-neutral-100"><div className="h-full bg-green-500" style={{ width: "100%" }} /></div>
            <div className="flex items-center justify-between px-6 py-4">
              <Button variant="secondary" size="md" onClick={() => setStep(6)}>Back</Button>
              <Button variant="primary" size="md" onClick={() => router.push("/seller/listings")} className="min-w-[160px]">Add Listing</Button>
              <div />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AddBlockButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-sm font-semibold text-neutral-900"><Plus className="size-4" /> Add Block</button>
      {open && (
        <div className="absolute left-0 top-8 z-10 w-[140px] rounded-lg bg-white py-1" style={{ border: "1px solid #F0F0F0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
          {["Text", "Video", "Photo"].map((t) => (
            <button key={t} onClick={() => setOpen(false)} className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50">{t}</button>
          ))}
        </div>
      )}
    </div>
  );
}
