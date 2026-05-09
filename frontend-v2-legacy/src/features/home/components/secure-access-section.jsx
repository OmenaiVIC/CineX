import featuresData from '@data/features.json';

function SecureAccessSection() {
  if (!featuresData) {
    return null;
  }

  const features = featuresData.secureAccessFeatures;

  return (
    <section className="relative py-24 overflow-hidden bg-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-yellow-400 rounded-full opacity-5 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-400 rounded-full opacity-5 blur-3xl"></div>
      </div>

      <div className="container px-4 mx-auto relative z-10">
        <div className="flex flex-wrap items-center -m-8">
          <div className="w-full md:w-1/2 p-8">
            <div className="relative z-10 md:max-w-md">
              <span className="inline-block mb-4 px-4 py-2 text-sm text-yellow-600 font-bold tracking-tighter border border-yellow-400 rounded-full bg-yellow-50">
                BLOCKCHAIN SECURED
              </span>
              <h2 className="font-bold mb-6 text-5xl md:text-6xl text-gray-900 tracking-tight">
                Transparent. Secure. Decentralized.
              </h2>
              <p className="mb-8 text-gray-700 text-lg">
                We are the only platform offering verified funding with blockchain transparency and compensating industry professionals for their proof-of-work due diligence.
              </p>
              <ul className="space-y-3">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="flex-none w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
                      <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-900 font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="w-full md:w-1/2 p-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-transparent rounded-2xl blur-2xl"></div>
              <div className="relative bg-gradient-to-br from-yellow-50 to-white p-8 rounded-2xl border border-yellow-200 shadow-lg">
                <div className="aspect-video bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-xl flex items-center justify-center">
                  <svg className="w-16 h-16 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-700 mt-4 text-center font-medium">Secure blockchain-verified profiles</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SecureAccessSection;