import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Mail, Phone, MapPin, Send, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError('Please fill out all required fields.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Save contact message to Firestore messages collection
      await addDoc(collection(db, 'messages'), {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        trackingCode: trackingCode.trim().toUpperCase(),
        subject: subject.trim(),
        message: message.trim(),
        createdAt: new Date().toISOString(),
        status: 'new',
      });

      // Create admin alert notification
      await addDoc(collection(db, 'admin_notifications'), {
        title: `New Support Message from ${name}`,
        message: `Subject: ${subject}`,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'system',
        trackingCode: trackingCode.trim().toUpperCase(),
      });

      setSubmitting(false);
      setSubmitted(true);
      setName('');
      setEmail('');
      setPhone('');
      setTrackingCode('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      console.error('Failed to submit contact message:', err);
      setError('Failed to transmit message. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-16 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* Page Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-mono font-bold">
            <MessageSquare className="w-4 h-4" /> 24/7 GLOBAL DISPATCH SUPPORT
          </div>
          <h1 className="text-4xl font-black text-white">Contact Logistics Help Desk</h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Have questions about your shipment, customs documentation, or transit status? Submit your request directly to our central dispatch unit.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Direct Contact Info */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">Global Command Centers</h3>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-sm">North America Hub</h5>
                    <p className="text-slate-400 mt-0.5">100 Cargo Terminal Way, JFK International Airport, Jamaica, NY 11430</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-sm">European Hub</h5>
                    <p className="text-slate-400 mt-0.5">Cargo City South, Building 532, Frankfurt Airport, 60549 Germany</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-sm">Emergency Dispatch Line</h5>
                    <p className="text-slate-400 font-mono">+1 (800) 555-GOTRACK</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-sm">Email Inquiries</h5>
                    <p className="text-sky-400 font-mono">tracking@gotrack-now.com</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Right 2 Columns: Contact Form */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            {submitted ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-white">Inquiry Transmitted Successfully</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  Your ticket has been assigned to an active logistics controller. A response will be dispatched to your email address shortly.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold text-xs rounded-xl font-mono"
                >
                  Submit Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h3 className="text-xl font-bold text-white">Send Message to Dispatch</h3>
                
                {error && (
                  <div className="p-3 bg-rose-950/50 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 mb-1">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="w-full bg-slate-950 text-white text-sm px-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-500"
                      id="contact-name-input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 mb-1">Your Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@company.com"
                      className="w-full bg-slate-950 text-white text-sm px-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-500"
                      id="contact-email-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 mb-1">Phone Number (Optional)</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-slate-950 text-white text-sm px-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-500"
                      id="contact-phone-input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 mb-1">Tracking Code (If Applicable)</label>
                    <input
                      type="text"
                      value={trackingCode}
                      onChange={(e) => setTrackingCode(e.target.value)}
                      placeholder="e.g. GT48291584US"
                      className="w-full bg-slate-950 text-white text-sm px-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-500 font-mono"
                      id="contact-tracking-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 mb-1">Subject / Topic *</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Customs documentation query for air freight"
                    className="w-full bg-slate-950 text-white text-sm px-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-500"
                    id="contact-subject-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 mb-1">Message Details *</label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide details about your inquiry..."
                    className="w-full bg-slate-950 text-white text-sm px-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-500"
                    id="contact-message-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
                  id="contact-submit-btn"
                >
                  {submitting ? (
                    <span>Sending Message...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
