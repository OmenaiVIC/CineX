import PageLayout from '@components/layout/page-layout';
import AuthSection from '@features/auth/components/auth-section';

function LoginPage() {
  return (
    <PageLayout title="Login - CineX">
      <AuthSection type="login" />
    </PageLayout>
  );
}

export default LoginPage;