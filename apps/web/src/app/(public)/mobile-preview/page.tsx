import { MobileAccessPreviewCenter } from "@/components/phase-three/phase-three-centers";
import { Footer } from "@/components/public/footer";
import { Header } from "@/components/public/header";

export default function Page() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <div className="pt-20">
        <MobileAccessPreviewCenter role="public" />
      </div>
      <Footer />
    </main>
  );
}
