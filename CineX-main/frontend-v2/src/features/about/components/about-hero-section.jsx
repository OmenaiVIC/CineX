function AboutHeroSection() {
  return (
    <section className="py-20 overflow-hidden">
      <div className="container px-4 mx-auto">
        <div className="md:max-w-xl text-center mx-auto mb-20">
          <span className="inline-block mb-4 text-sm text-yellow-400 font-medium tracking-tighter">About CineX</span>
          <h2 className="font-heading text-7xl text-white tracking-tighter-xl">Decentralized Film Financing</h2>
        </div>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap lg:items-center -m-8 lg:-m-12">
            <div className="w-full md:w-1/2 p-8 lg:p-12">
              <div className="max-w-max mx-auto">
                <img className="rounded-3xl" src="/images/about.png" alt="CineX Platform" />
              </div>
            </div>
            <div className="w-full md:w-1/2 p-8 lg:p-12">
              <span className="inline-block mb-4 text-sm text-yellow-400 font-medium tracking-tighter">Empowering Filmmakers</span>
              <h2 className="mb-6 text-6xl md:text-7xl text-white tracking-tighter">Invest Together. Create Together.</h2>
              <p className="mb-10 text-white text-opacity-60 md:max-w-xs">CineX is a decentralized crowdfunding platform powered by Stacks blockchain, connecting indie filmmakers with global investors through innovative financing mechanisms.</p>
              <a className="inline-block px-8 py-4 text-white hover:text-black font-medium tracking-tighter hover:bg-yellow-400 border-2 border-white focus:border-yellow-400 focus:border-opacity-40 hover:border-yellow-400 focus:ring-4 focus:ring-yellow-400 focus:ring-opacity-40 rounded-full transition duration-300" href="#">Learn more</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AboutHeroSection;