import featuresData from '@data/features.json';

function WhyUsSection() {
  if (!featuresData) {
    return null;
  }

  const cards = featuresData.whyUsCards;

  return (
    <section className="pt-20 pb-24 bg-blueGray-950/10">
      <div className="container px-4 mx-auto">
        <div className="text-center">
          <span className="inline-block mb-4 text-sm text-yellow-400 font-medium tracking-tighter">
            We are the next generation of cinema, powered by Stacks.
          </span>
          <h2 className="font-heading mb-6 text-6xl lg:text-7xl text-white tracking-8xl md:max-w-md mx-auto">
            Why Choose CineX
          </h2>

          <p className="mb-20 text-gray-300 md:max-w-md mx-auto">
            <ol>
              <li>• Transparent & Secure: All transactions recorded on blockchain</li>
              <li>• Community-Driven: Filmmakers supporting filmmakers</li>
              <li>• Fair Rotation: Everyone gets equal opportunity</li>
              <li>• Track Everything: See pool status and member contributions in real-time</li>
            </ol>
          </p>
        </div>
        <div className="flex flex-wrap -m-4">
          {cards.map((card) => (
            <div key={card.id} className="w-full md:w-1/2 lg:w-1/3 p-4">
              <div className="relative mb-8 overflow-hidden rounded-5xl">
                <img
                  className="w-full transform hover:scale-125 transition duration-1000"
                  src={card.image}
                  alt=""
                />
                <div className="absolute bottom-0 left-0 w-full bg-gradient-card p-8">
                  <span className="inline-block mb-4 text-sm text-green-400 font-medium tracking-tighter">
                    {card.category}
                  </span>
                  <a className="group inline-block max-w-sm" href="#">
                    <h3 className="mb-4 text-3xl text-white tracking-3xl hover:underline">
                      {card.title}
                    </h3>
                  </a>
                  <a className="group inline-flex items-center" href="#">
                    <span className="mr-3.5 text-white font-medium">
                      Learn more
                    </span>
                    <svg
                      className="transform group-hover:rotate-90 transition duration-300"
                      width="13"
                      height="12"
                      viewBox="0 0 13 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M11.5 0.75L1 11.25"
                        stroke="white"
                        strokeWidth="1.43182"
                        strokeMiterlimit="10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></path>
                      <path
                        d="M11.5 10.3781V0.75H1.87187"
                        stroke="white"
                        strokeWidth="1.43182"
                        strokeMiterlimit="10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></path>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default WhyUsSection;
