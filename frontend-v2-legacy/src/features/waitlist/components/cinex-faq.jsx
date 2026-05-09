import { useState } from 'react';

function CineXFAQ() {
  const [openFAQ, setOpenFAQ] = useState(null);

  const faqs = [
    {
      id: 1,
      question: 'What is CineX?',
      answer: 'CineX is a decentralized crowdfunding platform powered by the Stacks blockchain that connects indie filmmakers with global investors. We enable filmmakers to raise funds transparently and investors to discover extraordinary film projects with tokenized ownership and rewards.'
    },
    {
      id: 2,
      question: 'How do I invest in film projects on CineX?',
      answer: 'Once you join the waitlist and we launch, you can connect your Stacks wallet, browse active film projects, and invest directly or join collaborative funding pools. Each investment gives you tokenized ownership in the project and access to exclusive rewards and NFTs.'
    },
    {
      id: 3,
      question: 'What happens when CineX goes live?',
      answer: 'When we launch, waitlist members will receive exclusive early-bird benefits including priority access to featured projects, lower platform fees, and founding member NFTs. Investors will be able to fund projects immediately, and filmmakers can submit their proposals for verification and launch campaigns.'
    }
  ];

  const toggleFAQ = (id) => {
    setOpenFAQ(openFAQ === id ? null : id);
  };

  return (
    <section className="py-24 bg-black/40">
      <div className="container px-4 mx-auto">
        {/* Header */}
        <div className="mb-20 text-center max-w-2xl mx-auto">
          <span className="inline-block mb-4 text-sm text-yellow-400 font-medium tracking-tighter">
            Common Questions
          </span>
          <h2 className="font-heading text-7xl lg:text-8xl text-white tracking-tighter">
            FAQ
          </h2>
          <p className="text-gray-300 mt-6">
            Everything you need to know about CineX
          </p>
        </div>

        {/* FAQ Items */}
        <div className="max-w-3xl mx-auto">
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className="border border-gray-800 rounded-lg overflow-hidden transition duration-300 hover:border-yellow-400/30"
              >
                <button
                  onClick={() => toggleFAQ(faq.id)}
                  className="w-full px-8 py-6 flex items-center justify-between bg-gradient-radial-dark hover:bg-gray-900/50 transition"
                >
                  <h3 className="text-lg text-white font-medium text-left">
                    {faq.question}
                  </h3>
                  <svg
                    className={`w-5 h-5 text-yellow-400 flex-shrink-0 ml-4 transition-transform duration-300 ${
                      openFAQ === faq.id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </button>

                {/* Answer */}
                {openFAQ === faq.id && (
                  <div className="px-8 py-6 bg-gray-900/30 border-t border-gray-800">
                    <p className="text-gray-300 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Additional Help */}
        <div className="text-center mt-16">
          <p className="text-gray-300 mb-4">
            Still have questions?
          </p>
          <a
            href="mailto:support@cinex.com"
            className="inline-block px-8 py-4 text-white border-2 border-white hover:bg-yellow-400 hover:text-black hover:border-yellow-400 rounded-full transition duration-300 font-medium"
          >
            Contact Support
          </a>
        </div>
      </div>
    </section>
  );
}

export default CineXFAQ;
