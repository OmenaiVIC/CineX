import PageLayout from '@components/layout/page-layout';
import AboutHeroSection from '@features/about/components/about-hero-section';
import StatsSection from '@features/about/components/stats-section';
import CompanyStorySection from '@features/about/components/company-story-section';
// Team and Open positions sections hidden per request

function AboutPage() {
  return (
    <PageLayout title="About CineX">
      <AboutHeroSection />
      <StatsSection />
      <CompanyStorySection />
      {/* TeamSection and OpenPositionsSection intentionally hidden */}
    </PageLayout>
  );
}

export default AboutPage;