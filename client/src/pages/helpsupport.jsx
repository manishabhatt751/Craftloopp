import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

function HelpSupport() {
  const navigate = useNavigate()

  const [openFaq, setOpenFaq] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    subject: '',
    message: '',
  })

  const [submitted, setSubmitted] = useState(false)

  const faqs = [
    {
      question: 'How do I create a project or service?',
      answer:
        'Open the Create section from the sidebar, select Project / Service, fill in the required details and publish your work.',
    },
    {
      question: 'How do I create a course?',
      answer:
        'Open Create, choose Course / Tutorial and add your course information. After creating the course, you can add and manage lessons from Course Details.',
    },
    {
      question: 'How can I edit my creator profile?',
      answer:
        'Open your profile from the top-right profile menu and select Edit Profile. Update your information and save the changes.',
    },
    {
      question: 'Where can I see my projects?',
      answer:
        'Open Your Project from the profile menu or use the Your Projects section on your profile.',
    },
    {
      question: 'Can I contact another creator?',
      answer:
        'Yes. The Messages section allows you to communicate in real-time with other creators and viewers on CraftLoop.',
    },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.subject.trim() || !form.message.trim()) {
      alert('Please fill in both fields.')
      return
    }

    try {
      setSubmitting(true)
      const res = await api.createSupportTicket({
        subject: form.subject.trim(),
        message: form.message.trim(),
      })

      if (res && res.success) {
        setSubmitted(true)
        setForm({
          subject: '',
          message: '',
        })
      } else {
        alert(res?.message || 'Failed to submit ticket. Please try again.')
      }
    } catch (err) {
      alert(err?.message || 'Failed to submit ticket. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#faf9ff] p-6">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-600">
            CraftLoop Support
          </p>

          <h1 className="mt-1 text-3xl font-bold text-gray-900">
            Help & Support
          </h1>

          <p className="mt-1 text-gray-500">
            Find answers or send us a support request.
          </p>
        </div>

        <button
          onClick={() => navigate('/profile')}
          className="rounded-xl border border-gray-200 bg-white px-5 py-3 font-semibold text-gray-600 hover:bg-gray-50"
        >
          ← Back to Profile
        </button>
      </div>

      <div className="mx-auto max-w-5xl space-y-6">
        {/* Support Options */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-xl">
              📚
            </div>

            <h2 className="mt-4 font-bold">Help Center</h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Find guides and information about CraftLoop features.
            </p>

            <button
              onClick={() =>
                window.scrollTo({
                  top: 500,
                  behavior: 'smooth',
                })
              }
              className="mt-4 font-semibold text-purple-600 hover:text-purple-700"
            >
              View FAQs →
            </button>
          </div>

          <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-xl">
              💬
            </div>

            <h2 className="mt-4 font-bold">Contact Support</h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Send us a message if you need help with something.
            </p>

            <button
              onClick={() =>
                document
                  .getElementById('support-form')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
              className="mt-4 font-semibold text-purple-600 hover:text-purple-700"
            >
              Contact us →
            </button>
          </div>

          <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-xl">
              🛡️
            </div>

            <h2 className="mt-4 font-bold">Safety & Community</h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Keep your interactions respectful, helpful and professional.
            </p>

            <button
              onClick={() => alert('Community guidelines are available in the Community section.')}
              className="mt-4 font-semibold text-purple-600 hover:text-purple-700"
            >
              Learn more →
            </button>
          </div>
        </div>

        {/* FAQs */}
        <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            Frequently Asked Questions
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Quick answers to common questions.
          </p>

          <div className="mt-5 divide-y divide-gray-100">
            {faqs.map((faq, index) => (
              <div key={faq.question}>
                <button
                  onClick={() =>
                    setOpenFaq(openFaq === index ? null : index)
                  }
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="font-semibold text-gray-800">
                    {faq.question}
                  </span>

                  <span className="shrink-0 text-xl text-purple-600">
                    {openFaq === index ? '−' : '+'}
                  </span>
                </button>

                {openFaq === index && (
                  <div className="pb-5 pr-8 text-sm leading-6 text-gray-500">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <div
          id="support-form"
          className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm"
        >
          <h2 className="text-xl font-bold text-gray-900">
            Send a Support Request
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Tell us what you need help with.
          </p>

          {submitted && (
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
              Your support request has been submitted successfully. Our team will review your inquiry shortly.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Subject
              </label>

              <input
                type="text"
                value={form.subject}
                onChange={(e) =>
                  setForm({
                    ...form,
                    subject: e.target.value,
                  })
                }
                placeholder="What do you need help with?"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition focus:border-purple-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Message
              </label>

              <textarea
                rows="6"
                maxLength="1000"
                value={form.message}
                onChange={(e) =>
                  setForm({
                    ...form,
                    message: e.target.value,
                  })
                }
                placeholder="Describe your issue..."
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition focus:border-purple-400 focus:bg-white"
              />

              <p className="mt-1 text-right text-xs text-gray-400">
                {form.message.length}/1000
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white shadow-lg shadow-purple-200 hover:bg-purple-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default HelpSupport