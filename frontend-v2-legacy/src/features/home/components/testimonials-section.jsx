import React, { useState } from 'react';
import testimonialsData from '@data/testimonials.json';

function TestimonialsSection() {
  const [showContent, setShowContent] = useState(false);

  if (!testimonialsData) {
    return null;
  }

  const initialTestimonials = testimonialsData.initialTestimonials;
  const hiddenTestimonials = testimonialsData.hiddenTestimonials;

  const HeartIcon = () => (
    <svg
      className="mr-2.5"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M8.41398 13.8731C8.18732 13.9531 7.81398 13.9531 7.58732 13.8731C5.65398 13.2131 1.33398 10.4597 1.33398 5.79307C1.33398 3.73307 2.99398 2.06641 5.04065 2.06641C6.25398 2.06641 7.32732 2.65307 8.00065 3.55974C8.67398 2.65307 9.75398 2.06641 10.9607 2.06641C13.0073 2.06641 14.6673 3.73307 14.6673 5.79307C14.6673 10.4597 10.3473 13.2131 8.41398 13.8731Z"
        stroke="#9F9FA0"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const CommentIcon = () => (
    <svg
      className="mr-2.5"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.247 8.07345C12.8137 10.7001 10.8604 12.7201 8.24702 13.2135C6.81369 13.4868 5.45368 13.2735 4.28035 12.7201C4.08701 12.6268 3.77367 12.5868 3.56701 12.6335C3.12701 12.7401 2.38703 12.9201 1.76037 13.0668C1.16037 13.2135 0.78704 12.8401 0.933706 12.2401L1.36702 10.4401C1.42035 10.2335 1.37368 9.91345 1.28035 9.72012C0.747012 8.60012 0.533693 7.30012 0.753693 5.93345C1.18036 3.30678 3.30037 1.18012 5.92703 0.746784C10.2604 0.0467841 13.9537 3.74012 13.247 8.07345Z"
        stroke="#9F9FA0"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const TestimonialCard = ({ testimonial }) => (
    <div className="px-6 py-8 border border-yellow-400/20 bg-gradient-to-br from-gray-800/50 to-gray-900/50 hover:border-yellow-400/50 rounded-2xl backdrop-blur-sm hover:shadow-lg transition-all duration-300 group">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex-none">
          <img
            className="w-12 h-12 rounded-full object-cover border-2 border-yellow-400/30 group-hover:border-yellow-400 transition-colors"
            src={testimonial.avatar}
            alt=""
          />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">{testimonial.name}</h2>
          <p className="text-sm text-yellow-400">{testimonial.username}</p>
        </div>
      </div>
      <p className="mb-3 text-gray-100 leading-relaxed">{testimonial.content}</p>
      {testimonial.extraContent &&
        testimonial.extraContent.map((content, index) => (
          <p key={index} className="mb-3 text-gray-100 leading-relaxed">
            {content}
          </p>
        ))}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 pt-4 border-t border-gray-700/50">
        <p>{testimonial.time}</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <HeartIcon />
            <p>{testimonial.likes}</p>
          </div>
          <div className="flex items-center gap-1">
            <CommentIcon />
            <p>{testimonial.comments}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <section className="relative py-24 overflow-hidden bg-gradient-to-b from-gray-900 via-black to-gray-900">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-400 rounded-full opacity-5 blur-3xl"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-yellow-400 rounded-full opacity-5 blur-3xl"></div>
      </div>

      <div className="container px-4 mx-auto relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block mb-4 px-4 py-2 text-sm text-yellow-400 font-bold tracking-tighter border border-yellow-400/50 rounded-full bg-yellow-400/5">
            COMMUNITY STORIES
          </span>
          <h2 className="font-bold mb-6 text-5xl lg:text-6xl text-white tracking-tight max-w-3xl mx-auto">
            What Our Creators & Investors Say
          </h2>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Real Stories from Our Verified Filmmakers, Backers, and Endorsers.
          </p>
        </div>
        <div className="flex flex-wrap -m-3">
          {['column1', 'column2', 'column3', 'column4'].map((columnKey) => (
            <div key={columnKey} className="w-full md:w-1/2 lg:w-1/4 p-3">
              <div className="flex flex-wrap -m-3">
                {initialTestimonials[columnKey]?.map((testimonial) => (
                  <div key={testimonial.id} className="w-full p-3">
                    <TestimonialCard testimonial={testimonial} />
                  </div>
                ))}
                {showContent &&
                  hiddenTestimonials[columnKey]?.map((testimonial) => (
                    <div key={testimonial.id} className="w-full p-3">
                      <TestimonialCard testimonial={testimonial} />
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
        <div
          className="flex items-center justify-center mt-16"
          style={{ display: showContent ? 'none' : 'flex' }}
        >
          <button
            className="px-8 py-4 font-bold tracking-tighter bg-yellow-400 hover:bg-yellow-500 text-black focus:ring-4 focus:ring-yellow-500/40 rounded-full transition duration-300 shadow-lg hover:shadow-xl"
            onClick={() => setShowContent(true)}
          >
            Show more testimonials
          </button>
        </div>
      </div>
    </section>
  );
}

export default TestimonialsSection;
