const PricingCard = ({ plan, isMonthly }) => {
  const price = isMonthly ? plan.monthlyPrice : plan.annualPrice;
  const period = isMonthly ? 'month' : 'year';

  return (
    <div className="w-full md:w-1/2 lg:w-1/3 p-4">
      <div className="relative px-8 pt-12 pb-12 h-full bg-gradient-radial-dark border-2 border-gray-900/30 overflow-hidden rounded-5xl">
        <p className="mb-2 text-lg text-white font-light">{plan.name}</p>
        <p className="mb-6 text-gray-300">{plan.description}</p>

        <p className="mb-4 text-white font-medium text-5xl">
          <span>${price}</span>
          <span className="text-base font-medium text-gray-300"> / {period}</span>
        </p>

        <p className="mb-6 text-xs text-gray-300 font-light uppercase">What's included</p>

        <ul className="mb-10">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-center mb-4">
              <div className="flex items-center justify-center w-5 h-5 mr-4 border border-yellow-400 rounded-full">
                <img src="/images/check.svg" alt="" />
              </div>
              <p className="text-white">{feature}</p>
            </li>
          ))}
        </ul>

        <a
          className="inline-block w-full px-8 py-4 text-center text-black bg-yellow-400 hover:bg-yellow-500 focus:ring-4 focus:ring-yellow-500/40 font-medium rounded-full transition duration-300"
          href="#"
        >
          {plan.ctaText}
        </a>

        <img className="absolute bottom-0 right-0" src="/images/pricing-shadow.svg" alt="" />
      </div>
    </div>
  );
};

export default PricingCard;