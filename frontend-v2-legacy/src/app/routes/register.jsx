import PageLayout from '@components/layout/page-layout';
import AuthSection from '@features/auth/components/auth-section';

function RegisterPage() {
  return (
    <PageLayout title="Register - CineX">
      <AuthSection type="register" />
    </PageLayout>
  );
}

export default RegisterPage;