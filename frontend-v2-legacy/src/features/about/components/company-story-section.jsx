function CompanyStorySection() {
  return (
    <section className="py-20 overflow-hidden">
      <div className="container px-4 mx-auto">
        <div className="flex flex-wrap items-center -m-8">
          <div className="w-full md:w-1/2 p-8">
            <div className="md:max-w-md">
              <span className="inline-block mb-4 text-sm text-yellow-400 font-medium tracking-tighter">Our Mission</span>
              <h2 className="font-heading mb-8 text-6xl md:text-7xl text-white tracking-tighter-xl">Revolutionizing Film Finance</h2>
              <p className="mb-8 text-lg text-gray-300">CineX is reimagining film funding through decentralized technology. We empower independent filmmakers with access to global capital and enable investors to discover extraordinary creative projects before they reach mainstream audiences. Our blockchain-based platform ensures transparency, security, and fair compensation for all participants.</p>
              <a className="inline-block text-white hover:text-opacity-80 font-medium underline transition duration-500" href="#">Read more</a>
            </div>
          </div>
          <div className="w-full md:w-1/2 p-8">
            <div className="mx-auto max-w-lg md:mr-0">
              <div className="flex flex-wrap -m-4">
                <div className="w-1/2 p-4">
                  <div className="flex flex-wrap">
                    <div className="mb-8 w-full">
                      <img className="w-full" src="/images/img2.png" alt="Film Production" />
                    </div>
                    <div className="w-full">
                      <img className="w-full" src="/images/img4.png" alt="Film Scene" />
                    </div>
                  </div>
                </div>
                <div className="w-1/2 p-4">
                  <div className="flex flex-wrap mt-24">
                    <div className="mb-8 w-full">
                      <img className="w-full" src="/images/img3.png" alt="Behind the scenes" />
                    </div>
                    <div className="w-full">
                      <img className="w-full" src="/images/img.png" alt="Camera work" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CompanyStorySection;