import PageLayout from '@components/layout/page-layout';
import WaitlistForm from '@features/waitlist/components/waitlist-form';
import CineXFAQ from '@features/waitlist/components/cinex-faq';

function WaitlistPage() {
  return (
    <PageLayout title="Waitlist - CineX">
      <WaitlistForm />
      <CineXFAQ />
    </PageLayout>
  );
}

export default WaitlistPage;