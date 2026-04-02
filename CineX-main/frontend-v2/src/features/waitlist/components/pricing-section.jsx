import { useState } from 'react';
import pricingData from '@data/pricing.json';
import PricingCard from './pricing-card';
import PricingToggle from './pricing-toggle';

function PricingSection() {
  const [isMonthly, setIsMonthly] = useState(true);

  const togglePricing = () => setIsMonthly(!isMonthly);

  if (!pricingData) {
    return null;
  }

  const { plans } = pricingData;

  return (
    <section className="pt-20 lg:pt-24 pb-24">
      <div className="container px-4 mx-auto">
        <div className="mb-20 md:max-w-2xl text-center mx-auto">
          <span className="inline-block mb-4 text-sm text-yellow-400 font-medium tracking-tighter">Waitlist Options</span>
          <h2 className="font-heading mb-8 text-7xl lg:text-8xl text-white tracking-7xl lg:tracking-8xl">Join Our Filmmaker Community</h2>
          <p className="mb-12 text-gray-300 max-w-sm mx-auto">Get early access to decentralized crowdfunding and exclusive film financing opportunities powered by Stacks blockchain.</p>

          <PricingToggle isMonthly={isMonthly} onToggle={togglePricing} />
        </div>

        <div className="flex flex-wrap -m-4">
          {plans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} isMonthly={isMonthly} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default PricingSection;