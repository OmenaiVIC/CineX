function HeroSection() {
  return (
    <section className="relative h-screen min-h-screen flex items-center justify-center overflow-hidden bg-body">
      {/* Grid overlay - matches body::before */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0, 229, 255, 0.06) 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0, 229, 255, 0.15) 0%, transparent 70%)' }}
      />

      {/* Content Overlay */}
      <div className="relative z-10 container px-4 mx-auto w-full">
        <div className="flex flex-col items-center justify-center h-screen text-center">
          <div className="max-w-3xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-green-500/20 bg-green-500/5 text-green-400 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Cypherpunk Finance for Creative IP
            </div>

            {/* Main Heading */}
            <h1 className="font-heading mb-6 text-5xl md:text-7xl lg:text-8xl text-white tracking-tighter leading-tight">
              Fund Your Vision on{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">
                Stacks
              </span>
            </h1>

            {/* Subheading */}
            <p className="mb-12 text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Milestone-based escrow, on-chain reputation, and decentralized campaign funding — built for African filmmakers and global backers.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col md:flex-row justify-center gap-4 items-center">
              <a
                href="/active-pools"
                className="inline-block px-8 py-4 bg-green-500 hover:bg-green-400 text-black font-bold rounded-full transition duration-200 shadow-lg hover:shadow-green-500/25"
              >
                Explore Campaigns
              </a>
              <a
                href="/register"
                className="inline-block px-8 py-4 border border-gray-700 hover:border-green-500/50 text-gray-200 hover:text-white font-medium rounded-full transition duration-200"
              >
                Get Started
              </a>
            </div>

            {/* Stats Row */}
            <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
              <div className="glass-card p-4 text-center">
                <p className="text-3xl md:text-4xl text-green-400 font-bold">$0M+</p>
                <p className="text-xs text-gray-500 mt-1">Funded</p>
              </div>
              <div className="glass-card p-4 text-center">
                <p className="text-3xl md:text-4xl text-cyan-400 font-bold">1+</p>
                <p className="text-xs text-gray-500 mt-1">Projects</p>
              </div>
              <div className="glass-card p-4 text-center">
                <p className="text-3xl md:text-4xl text-amber-400 font-bold">5+</p>
                <p className="text-xs text-gray-500 mt-1">Community</p>
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <svg className="w-6 h-6 text-green-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
