import { Navbar } from '@/components/landing/navbar';
import { Hero } from '@/components/landing/hero';
import { WhyNexoPyme } from '@/components/landing/why-nexopyme';
import { HowItWorks } from '@/components/landing/how-it-works';
import { ModulesSection } from '@/components/landing/modules';
import { AIDemo } from '@/components/landing/ai-demo';
import { IntelligenceCenter } from '@/components/landing/intelligence-center';
import { Community } from '@/components/landing/community';
import { Plans } from '@/components/landing/plans';
import { Testimonials } from '@/components/landing/testimonials';
import { FAQ } from '@/components/landing/faq';
import { CTASection } from '@/components/landing/cta-section';
import { Footer } from '@/components/landing/footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      <Navbar />
      <Hero />
      <WhyNexoPyme />
      <HowItWorks />
      <ModulesSection />
      <AIDemo />
      <IntelligenceCenter />
      <Community />
      <Plans />
      <Testimonials />
      <FAQ />
      <CTASection />
      <Footer />
    </main>
  );
}
