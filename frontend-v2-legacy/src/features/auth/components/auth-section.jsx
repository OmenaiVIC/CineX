import { Link } from 'react-router-dom';
import { Input, Button, Card } from '@components/ui';
import authData from '@data/auth.json';

/**
 * Authentication section for login/register - DUMMY AUTH (non-functional)
 * @param {Object} props - Component props
 * @param {'login'|'register'} [props.type='login'] - Auth type to display
 */
function AuthSection({ type = 'login' }) {
  const data = authData[type];

  return (
    <section className="pt-20 lg:pt-24 pb-24">
      <div className="container px-4 mx-auto">
        <div className="flex flex-wrap items-center -m-8">
          <div className="w-full lg:w-1/2 p-8">
            <Card>
              <div className="mb-8 text-center">
                <h1 className="mb-4 text-4xl text-white font-heading tracking-tighter">
                  {data.title}
                </h1>
                <p className="text-gray-300">{data.subtitle}</p>
              </div>

              {/* Social Login Buttons */}
              <div className="mb-8 grid space-y-3">
                {data.socialProviders.map((provider, index) => (
                  <button
                    key={index}
                    type="button"
                    className="w-full px-6 py-4 text-white bg-gray-900/30 hover:bg-gray-900/10 rounded-full transition duration-300 flex items-center justify-center gap-3 font-medium"
                  >
                    <img
                      className="w-5 h-5"
                      src={provider.icon}
                      alt={provider.name}
                    />
                    <span>
                      {provider.text || `Sign in with ${provider.name}`}
                    </span>
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className="mb-8 flex items-center">
                <div className="flex-1 h-px bg-gray-800"></div>
                <span className="px-4 text-gray-400 text-sm">
                  {data.dividerText || 'or sign in with email'}
                </span>
                <div className="flex-1 h-px bg-gray-800"></div>
              </div>

              {/* Email Form */}
              <form>
                <fieldset className="border-none p-0 m-0">
                  <legend className="sr-only">Sign in with email and password</legend>
                  <div className="mb-6">
                    <Input type="email" placeholder="Email address" required />
                  </div>
                  <div className="mb-6">
                    <Input type="password" placeholder="Password" required />
                  </div>
                  <Button type="submit" className="w-full">
                    {data.buttonText || 'Sign In'}
                  </Button>
                </fieldset>
              </form>

              {/* Footer Links */}
              {type === 'register' && (
                <div className="mt-6 text-center text-sm">
                  <span className="text-gray-400">{data.footerText} </span>
                  <Link
                    to="/login"
                    className="text-green-400 hover:text-green-300"
                  >
                    {data.linkText}
                  </Link>
                </div>
              )}
              {type === 'login' && (
                <div className="mt-6 text-center text-sm">
                  <span className="text-gray-400">Don't have an account? </span>
                  <Link
                    to="/register"
                    className="text-green-400 hover:text-green-300"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </Card>
          </div>

          {/* Trusted By Section */}
          <div className="w-full lg:w-1/2 p-8">
            <div className="text-center">
              <h2 className="mb-8 text-2xl text-white font-medium">
                Trusted by
              </h2>
              <div className="flex flex-wrap justify-center items-center -m-4">
                {data.trustedCompanies?.map((company, index) => (
                  <div key={index} className="w-auto p-4">
                    <img
                      className="h-8 opacity-70 hover:opacity-100 transition duration-300"
                      src={company.logo}
                      alt={company.name}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AuthSection;
