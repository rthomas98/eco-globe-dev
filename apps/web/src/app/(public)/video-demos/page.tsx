import { Footer } from "@/components/public/footer";
import { Header } from "@/components/public/header";
import { VideoDemoCenter } from "@/components/video-demo/video-demo-center";

export default function Page() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <div className="pt-20">
        <VideoDemoCenter role="public" />
      </div>
      <Footer />
    </main>
  );
}
