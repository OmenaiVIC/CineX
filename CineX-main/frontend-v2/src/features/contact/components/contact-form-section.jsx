import React, { useState, useCallback } from 'react';
import { Input, Select, Button, Card } from '@components/ui';
import contactData from '@data/contact.json';

/**
 * Contact form section with form fields - DUMMY FORM (non-functional)
 */
function ContactFormSection() {
  const { contact, form } = contactData;
  const [formData, setFormData] = useState({});

  const handleInputChange = useCallback((e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // TODO: wire to real contact endpoint
    alert('Thanks — your message has been recorded (demo).');
  }, [formData]);

  return (
    <section className="pt-20 lg:pt-24 pb-24">
      <div className="container px-4 mx-auto">
        <div className="flex flex-wrap items-center -m-8">
          <div className="w-full lg:w-1/2 p-8">
            <div className="md:max-w-md">
              <span className="inline-block mb-4 text-sm text-green-400 font-medium tracking-tighter">
                {contact.subtitle}
              </span>
              <h1 className="font-heading mb-6 text-6xl md:text-7xl text-white tracking-tighter">
                {contact.title}
              </h1>
              <p className="text-white text-opacity-60">
                {contact.description}
              </p>
            </div>
          </div>
          <div className="w-full lg:w-1/2 p-8">
            <Card>
              <form onSubmit={handleSubmit}>
                <div className="flex flex-wrap -m-3 mb-4">
                  {form.fields.map((field, index) => (
                    <div key={index} className="w-full sm:w-1/2 p-3">
                      <Input
                        type={field.type}
                        name={field.name}
                        placeholder={field.placeholder}
                        required={field.required}
                        onChange={handleInputChange}
                      />
                    </div>
                  ))}
                </div>

                <div className="mb-4">
                  <Select
                    name="topic"
                    onChange={handleInputChange}
                    placeholder="Select Topic"
                    options={form.locationOptions}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm text-gray-300 mb-2">Message</label>
                  <textarea
                    name="message"
                    rows={6}
                    onChange={handleInputChange}
                    placeholder="Tell us about your question or project"
                    className="w-full px-4 py-3 bg-gray-900/30 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none"
                  />
                </div>

                <Button type="submit" className="w-full">
                  {form.submitText}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ContactFormSection;