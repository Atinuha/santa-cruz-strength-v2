import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { GYM_CONFIG } from '../config';

export default function Privacy() {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const updated = 'April 2026';

  return (
    <div className="min-h-screen" style={{ background: 'var(--clr-bg)' }}>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-32 pb-20">
        <span className="green-accent-line" />
        <p className="text-[var(--clr-green)] text-xs font-bold uppercase tracking-widest mb-3">Legal</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-wide mb-2" style={{ color: 'var(--clr-charcoal)' }}>
          PRIVACY POLICY
        </h1>
        <p className="text-[var(--clr-text-muted)] text-sm mb-10">Last updated: {updated}</p>

        <div className="prose-legal space-y-8" style={{ color: 'var(--clr-text)' }}>

          <section>
            <h2 className="font-bold text-lg mb-3" style={{ color: 'var(--clr-charcoal)' }}>1. Who We Are</h2>
            <p className="text-sm leading-relaxed">
              Santa Cruz Strength ("we", "us", "our") operates the gym located at {GYM_CONFIG.address.full}
              and the website at santacruzstrength.com. This Privacy Policy explains how we collect,
              use, and protect your personal information when you visit our website or interact with us.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3" style={{ color: 'var(--clr-charcoal)' }}>2. Information We Collect</h2>
            <p className="text-sm leading-relaxed mb-3">We collect information you provide directly, including:</p>
            <ul className="text-sm leading-relaxed space-y-1 ml-4 list-disc list-outside">
              <li>Name, email address, and phone number (via contact and lead forms)</li>
              <li>Training goals, membership interests, and preferred contact method</li>
              <li>Communications you send us by email, phone, or text</li>
            </ul>
            <p className="text-sm leading-relaxed mt-3">We also automatically collect:</p>
            <ul className="text-sm leading-relaxed space-y-1 ml-4 list-disc list-outside mt-1">
              <li>Usage data (pages visited, time on site) via Google Analytics</li>
              <li>Cookies and similar tracking technologies</li>
              <li>Device and browser information</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3" style={{ color: 'var(--clr-charcoal)' }}>3. How We Use Your Information</h2>
            <ul className="text-sm leading-relaxed space-y-1.5 ml-4 list-disc list-outside">
              <li>To respond to your inquiries and schedule gym tours</li>
              <li>To send membership information and follow up on your interest</li>
              <li>To send transactional emails and SMS messages related to your inquiry</li>
              <li>To send promotional and marketing communications (you may opt out at any time)</li>
              <li>To improve our website and understand how visitors use it</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3" style={{ color: 'var(--clr-charcoal)' }}>4. SMS / Text Message Communications</h2>
            <p className="text-sm leading-relaxed mb-3">
              <strong>Opt-in:</strong> By submitting a form on santacruzstrength.com and providing your phone number,
              you expressly consent to receive recurring automated promotional and informational text messages
              (SMS/MMS) from Santa Cruz Strength at the phone number provided. You may also opt in by texting
              the keyword <strong>START</strong> to (408) 583-6671. Additionally, staff may collect phone numbers
              and verbal consent during walk-in visits at our gym and enter them into our system.
            </p>
            <p className="text-sm leading-relaxed mb-3">
              <strong>Consent is not a condition of purchase.</strong> Message frequency varies (up to 10 messages per month).
              Message and data rates may apply.
            </p>
            <p className="text-sm leading-relaxed mb-3">
              <strong>To opt out:</strong> Reply <strong>STOP</strong> to any text message we send you. You will receive a
              one-time confirmation and no further messages will be sent.
            </p>
            <p className="text-sm leading-relaxed mb-3">
              <strong>For help:</strong> Reply <strong>HELP</strong> or contact us at {GYM_CONFIG.email} or {GYM_CONFIG.phone}.
            </p>
            <p className="text-sm leading-relaxed">
              Your mobile phone number will not be sold, rented, or shared with third parties or affiliates
              for promotional or marketing purposes. Information collected through SMS opt-in will not be
              shared with any third parties.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3" style={{ color: 'var(--clr-charcoal)' }}>5. Sharing Your Information</h2>
            <p className="text-sm leading-relaxed mb-3">
              We do not sell your personal information. We may share it with:
            </p>
            <ul className="text-sm leading-relaxed space-y-1.5 ml-4 list-disc list-outside">
              <li><strong>Service providers</strong>: including Resend (email delivery), MailerSend (SMS delivery), and Google Analytics (website analytics) who process data on our behalf</li>
              <li><strong>ABC Fitness</strong>: our membership management platform, when you initiate a membership signup</li>
              <li><strong>Law enforcement or regulators</strong>: when required by applicable law</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3" style={{ color: 'var(--clr-charcoal)' }}>6. Cookies & Analytics</h2>
            <p className="text-sm leading-relaxed">
              We use Google Analytics to understand how visitors interact with our website. Google Analytics
              sets cookies on your device to collect information about your browsing activity on our site.
              This data is aggregated and anonymized where possible. You can opt out of Google Analytics by
              installing the{' '}
              <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-[var(--clr-green)] transition-colors duration-200">
                Google Analytics Opt-out Browser Add-on
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3" style={{ color: 'var(--clr-charcoal)' }}>7. Data Retention</h2>
            <p className="text-sm leading-relaxed">
              We retain your personal information for as long as necessary to provide our services and comply
              with legal obligations, or until you request deletion. Lead inquiries are retained for up to
              24 months. You may request deletion at any time by emailing us at {GYM_CONFIG.email}.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3" style={{ color: 'var(--clr-charcoal)' }}>8. Your California Privacy Rights (CCPA)</h2>
            <p className="text-sm leading-relaxed mb-3">
              If you are a California resident, you have the right to:
            </p>
            <ul className="text-sm leading-relaxed space-y-1.5 ml-4 list-disc list-outside">
              <li>Know what personal information we collect about you</li>
              <li>Request deletion of your personal information</li>
              <li>Opt out of the sale of your personal information (we do not sell your data)</li>
              <li>Non-discrimination for exercising your privacy rights</li>
            </ul>
            <p className="text-sm leading-relaxed mt-3">
              To exercise any of these rights, contact us at <a href={`mailto:${GYM_CONFIG.email}`}
                className="underline underline-offset-2 hover:text-[var(--clr-green)] transition-colors duration-200">
                {GYM_CONFIG.email}
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3" style={{ color: 'var(--clr-charcoal)' }}>9. Security</h2>
            <p className="text-sm leading-relaxed">
              We implement reasonable technical and organizational measures to protect your personal
              information from unauthorized access, loss, or misuse. However, no internet transmission
              is completely secure and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3" style={{ color: 'var(--clr-charcoal)' }}>10. Children's Privacy</h2>
            <p className="text-sm leading-relaxed">
              Our services are not directed to individuals under the age of 13. We do not knowingly
              collect personal information from children under 13. If you believe we have inadvertently
              collected such information, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3" style={{ color: 'var(--clr-charcoal)' }}>11. Changes to This Policy</h2>
            <p className="text-sm leading-relaxed">
              We may update this Privacy Policy from time to time. Changes will be posted on this page
              with an updated revision date. We encourage you to review this page periodically.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3" style={{ color: 'var(--clr-charcoal)' }}>12. Contact Us</h2>
            <p className="text-sm leading-relaxed">
              If you have questions about this Privacy Policy or your personal data, contact us at:
            </p>
            <div className="mt-3 bg-white rounded-[var(--radius-lg)] px-5 py-4 text-sm space-y-1"
              style={{ border: '1px solid var(--clr-border)', boxShadow: 'var(--shadow-sm)' }}>
              <p className="font-bold" style={{ color: 'var(--clr-charcoal)' }}>Santa Cruz Strength</p>
              <p style={{ color: 'var(--clr-text-muted)' }}>{GYM_CONFIG.address.full}</p>
              <p><a href={`mailto:${GYM_CONFIG.email}`} className="text-[var(--clr-green)] font-semibold">{GYM_CONFIG.email}</a></p>
              <p><a href={GYM_CONFIG.phoneHref} className="text-[var(--clr-green)] font-semibold">{GYM_CONFIG.phone}</a></p>
            </div>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t flex flex-wrap gap-4" style={{ borderColor: 'var(--clr-border)' }}>
          <Link to="/terms" className="text-[var(--clr-green)] text-sm font-bold hover:underline">Terms &amp; Conditions →</Link>
          <Link to="/" className="text-[var(--clr-text-muted)] text-sm font-semibold hover:text-[var(--clr-green)] transition-colors duration-200">← Back to Home</Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
