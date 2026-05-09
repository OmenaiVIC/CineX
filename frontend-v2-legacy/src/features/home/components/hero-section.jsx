function HeroSection() {
  return (
    <section className="relative h-screen min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 w-screen h-full overflow-hidden">
        {/* Embedded Video - SpiderMan Trailer */}
        <iframe
          className="w-screen h-full"
          style={{ objectFit: 'cover' }}
          src="https://www.youtube.com/embed/t06RUxPbp_c?autoplay=1&mute=1&loop=1&playlist=t06RUxPbp_c&controls=0&modestbranding=1"
          title="Spider-Man Official Trailer"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
        
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/50"></div>
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 container px-4 mx-auto w-full">
        <div className="flex flex-col items-center justify-center h-screen text-center">
          {/* Hero Content */}
          <div className="max-w-3xl mx-auto">
            {/* Main Heading */}
            <h1 className="font-heading mb-6 text-5xl md:text-7xl lg:text-8xl text-white tracking-tighter drop-shadow-lg">
              Empowering Film & Creative Media.
            </h1>

            {/* Subheading */}
            <p className="mb-12 text-xl md:text-2xl text-gray-100 drop-shadow-lg max-w-2xl mx-auto">
              Join thousands of filmmakers, creatives and investors on CineX. Fund Your Vision. Collaborate, and Own the Future in Film & Creative Media
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col md:flex-row justify-center gap-4 items-center">
              {/* Explore Pools Button */}
              <a
                href="/active-pools"
                className="inline-block px-8 py-4 tracking-tighter bg-yellow-400 hover:bg-yellow-500 text-black font-bold focus:ring-4 focus:ring-yellow-500 focus:ring-opacity-40 rounded-full transition duration-300 shadow-lg hover:shadow-xl"
              >
                Explore Active Pools
              </a>
            </div>

            {/* Stats Row */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-xl mx-auto">
              <div className="text-center backdrop-blur-sm bg-black/20 p-4 rounded-xl">
                <p className="text-3xl md:text-4xl text-yellow-400 font-bold">$0M+</p>
                <p className="text-sm text-gray-300 mt-2">Funded</p>
              </div>
              <div className="text-center backdrop-blur-sm bg-black/20 p-4 rounded-xl">
                <p className="text-3xl md:text-4xl text-yellow-400 font-bold">1+</p>
                <p className="text-sm text-gray-300 mt-2">Projects</p>
              </div>
              <div className="text-center backdrop-blur-sm bg-black/20 p-4 rounded-xl">
                <p className="text-3xl md:text-4xl text-yellow-400 font-bold">5+</p>
                <p className="text-sm text-gray-300 mt-2">Community</p>
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
