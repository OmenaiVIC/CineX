import PageLayout from '@components/layout/page-layout';
import PoolsSection from '@features/active-pools/components/pools-section';

function ActivePoolsPage() {
  return (
    <PageLayout title="Active Pools - CineX">
      <PoolsSection />
    </PageLayout>
  );
}

export default ActivePoolsPage;