import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Loading from '@components/common/loading';

const HomePage = lazy(() => import('@routes/home'));
const AboutPage = lazy(() => import('@routes/about'));
const WaitlistPage = lazy(() => import('@routes/waitlist'));
const ActivePoolsPage = lazy(() => import('@routes/active-pools'));
const PoolPage = lazy(() => import('@routes/pool'));
const DashboardPage = lazy(() => import('@routes/dashboard'));
const DashboardPublic = lazy(() => import('@routes/dashboard-public'));
const DashboardFilmmaker = lazy(() => import('@routes/dashboard-filmmaker'));
const DashboardEndorser = lazy(() => import('@routes/dashboard-endorser'));
const FilmmakerCrowdfunding = lazy(() => import('@routes/filmmaker-crowdfunding'));
const CreateCampaign = lazy(() => import('@routes/create-campaign'));
const ContactPage = lazy(() => import('@routes/contact'));
const LoginPage = lazy(() => import('@routes/login'));
const RegisterPage = lazy(() => import('@routes/register'));
const ProfilePage = lazy(() => import('@routes/profile'));
const RatePage = lazy(() => import('@routes/rate'));
const FeedPage = lazy(() => import('@routes/feed'));
const OnboardingPage = lazy(() => import('@routes/onboarding'));
const CreatorDashboardPage = lazy(() => import('@routes/dashboard-creator'));
const BackerDashboardPage = lazy(() => import('@routes/dashboard-backer'));
const AdminPage = lazy(() => import('@routes/admin'));
const EndorsementPage = lazy(() => import('@routes/endorsement'));
const AnalyticsPage = lazy(() => import('@routes/analytics'));
const PortfolioPage = lazy(() => import('@routes/portfolio'));
const VerificationFeePage = lazy(() => import('@routes/verification-fee'));
const VerificationRenewalPage = lazy(() => import('@routes/verification-renewal'));

const SuspenseWrapper = ({ children }) => (
  <Suspense fallback={<Loading fullScreen message="Loading page..." />}>
    {children}
  </Suspense>
);

const createRoute = (path, Component, name, label = null, showInNav = false) => ({
  path,
  name,
  label,
  showInNav,
  element: (
    <SuspenseWrapper>
      <Component />
    </SuspenseWrapper>
  ),
});

const routes = [
  createRoute('/', HomePage, 'home', 'Home', true),
  createRoute('/about', AboutPage, 'about', 'About', true),
  createRoute('/waitlist', WaitlistPage, 'waitlist', 'Waitlist', true),
  createRoute('/active-pools', ActivePoolsPage, 'active-pools', 'Active Pools', true),
  createRoute('/active-pools/:slug', PoolPage, 'pool-single'),
  createRoute('/dashboard', DashboardPage, 'dashboard', 'Dashboard', true),
  createRoute('/dashboard/public', DashboardPublic, 'dashboard-public'),
  createRoute('/dashboard/filmmaker', DashboardFilmmaker, 'dashboard-filmmaker'),
  createRoute('/dashboard/filmmaker/crowdfunding', FilmmakerCrowdfunding, 'filmmaker-crowdfunding'),
  createRoute('/dashboard/filmmaker/create-campaign', CreateCampaign, 'create-campaign'),
  createRoute('/dashboard/endorser', DashboardEndorser, 'dashboard-endorser'),
  createRoute('/onboarding', OnboardingPage, 'onboarding'),
  createRoute('/dashboard/creator', CreatorDashboardPage, 'dashboard-creator'),
  createRoute('/dashboard/backer', BackerDashboardPage, 'dashboard-backer'),
  createRoute('/contact', ContactPage, 'contact', 'Contact', true),
  createRoute('/profile/:address', ProfilePage, 'profile'),
  createRoute('/rate/:address', RatePage, 'rate'),
  createRoute('/feed', FeedPage, 'feed', 'Feed', true),
  createRoute('/login', LoginPage, 'login', 'Login'),
  createRoute('/register', RegisterPage, 'register', 'Register'),
  createRoute('/admin', AdminPage, 'admin', 'Admin', true),
  createRoute('/endorsement', EndorsementPage, 'endorsement', 'Endorsement', true),
  createRoute('/analytics', AnalyticsPage, 'analytics', 'Analytics'),
  createRoute('/portfolio', PortfolioPage, 'portfolio', 'Portfolio'),
  createRoute('/verification-fee', VerificationFeePage, 'verification-fee', 'Verification Fee'),
  createRoute('/verification-renewal', VerificationRenewalPage, 'verification-renewal', 'Verification Renewal'),
];

export const router = createBrowserRouter(routes);

export const getRouteByName = (name) => {
  const route = routes.find(r => r.name === name);
  return route ? route.path : '/';
};

export const generatePath = (name, params = {}) => {
  let path = getRouteByName(name);
  Object.keys(params).forEach(key => {
    path = path.replace(`:${key}`, params[key]);
  });
  return path;
};

export const getNavigationRoutes = () => {
  return routes.filter(route => route.showInNav).map(route => ({
    to: route.path,
    label: route.label,
    name: route.name
  }));
};