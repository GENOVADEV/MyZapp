import Hero from "@/components/sections/hero";
import Features from "@/components/sections/features";
import Billing from "@/components/sections/billing";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function Home() {
  return (
    // Le conteneur principal avec w-full et overflow-x-hidden pour bloquer le décalage mobile
    <div className="min-h-screen w-full overflow-x-hidden flex flex-col bg-background-app text-text-main selection:bg-primary selection:text-white">
      {/* --- EN-TÊTE (Navbar) --- */}
      <Header />

      {/* --- SECTION HÉROS (Optimisée pour la conversion Google Ads) --- */}
      <main>
        {/* Section Principale (Hero) avec la démo du bot */}
        <Hero />
        <Features />
        <Billing />
      </main>
      
      {/* --- PIED DE PAGE --- */}
      <Footer />

    </div>
  );
}