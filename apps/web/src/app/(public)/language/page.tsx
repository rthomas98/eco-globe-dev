import { Footer } from "@/components/public/footer";
import { Header } from "@/components/public/header";
import { LanguageReadinessCenter } from "@/components/phase-three/phase-three-centers";

export default function Page() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <div className="pt-20">
        <LanguageReadinessCenter role="public" />
      </div>
      <Footer />
    </main>
  );
}
