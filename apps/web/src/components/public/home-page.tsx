import { Header } from "./header";
import { HeroSection } from "./hero-section";
import { CategoriesSection } from "./categories-section";
import { FeaturedListingsSection } from "./featured-listings-section";
import { BuyersSellersSection } from "./buyers-sellers-section";
import { HowItWorksSection } from "./how-it-works-section";
import { CTABannerSection } from "./cta-banner-section";
import { Footer } from "./footer";

export function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <Header transparent />
      <HeroSection />
      <CategoriesSection />
      <FeaturedListingsSection />
      <BuyersSellersSection />
      <HowItWorksSection />
      <CTABannerSection />
      <Footer />
    </main>
  );
}
