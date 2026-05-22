import PageLayout from '@components/layout/page-layout';
import HeroSection from '@features/home/components/hero-section';
import WhyUsSection from '@features/home/components/why-us-section';
import FeaturesSection from '@features/home/components/features-section';
import SecureAccessSection from '@features/home/components/secure-access-section';
function HomePage() {
  return (
    <PageLayout title="CineX — Cypherpunk Finance for Creative IP">
      <HeroSection />
      <FeaturesSection />
      <SecureAccessSection />
    </PageLayout>
  );
}

export default HomePage;
