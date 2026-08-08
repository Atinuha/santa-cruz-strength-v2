import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { GYM_CONFIG } from '../config';

export default function Terms() {
  useEffect(() => { window.scrollTo(0, 0); document.title = 'Terms & Conditions | Santa Cruz Strength'; }, []);
  const updated = 'April 2026';

  return (
    <div className="min-h-screen" style={{ background: 'var(--clr-bg)' }}>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-32 pb-20">
        <span className="green-accent-line" />
        <p className="text-[var(--clr-green)] text-xs font-bold uppercase tracking-widest mb-3">Legal</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-wide mb-2" style={{ color: 'var(--clr-charcoal)' }}>
          TERMS &amp; CONDITIONS
        </h1>
        <p className="text-[var(--clr-text-muted)] text-sm mb-10">Last updated: {updated}</p>

        <div className="space-y-8" style={{ color: 'var(--clr-text)' }}>

          <section>
            <h2 className="font-bold text-lg mb-3" style={{ color: 'var(--clr-charcoal)' }}>1. Acceptance of Terms</h2>
            <p className="text-sm leading-relaxed">
              By accessing or using the Santa Cruz Strength website (santacruzstrength.com) or visiting
              our facility at {GYM_CONFIG.address.full}, you agree to be bound by these Terms &amp; Conditions.
              If you do not agree, please do not use our services or website.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3" style={{ color: 'var(--clr-charcoal)' }}>2. Membership &amp; Services</h2>
            <ul className="text-sm leading-relaxed space-y-2 ml-4 list-disc list-outside">
              <li>Membership at Santa Cruz Strength is subject to a separate Membership Agreement signed at the time of enrollment.</li>
              <li>Santa Cruz Strength reserves the right to modify membership rates, class schedules, and facility hours with reasonable notice.</li>
              <li>Membership is non-transferable. Sharing of access credentials or keycards is strictly prohibited.</li>
              <li>Santa Cruz Strength reserves the right to suspend or terminate membership for conduct that violates facility rules, creates an unsafe environment, or is disrespectful to staff or other members.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3" style={{ color: 'var(--clr-charcoal)' }}>3. Assumption of Risk &amp; Liability Waiver</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-lg)] px-5 py-4 mb-4">
              <p className="text-sm font-bold text-amber-800 mb-1">Important: Please Read Carefully</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Physical exercise involves inherent risks of injury, illness, or death. By using our facilities
                or participating in any program, you acknowledge and assume all such risks.
              </p>
            </div>
            <ul className="text-sm leading-relaxed space-y-2 ml-4 list-disc list-outside">
              <li>You acknowledge that strength training, weightlifting, and physical exercise carry inherent risks including but not limited to: muscle strain, joint injury, cardiovascular events, and equipment-related injuries.</li>
              <li>You assume full responsibility for your participation and agree that Santa Cruz Strength, its owners, employees, coaches, and agents are not liable for any injury, loss, or damage arising from your use of the facility or participation in any program.</li>
              <li>You represent that you are in adequate physical condition to participate in strength training activities and have no medical condition that would prevent safe participation.</li>
              <li>If you have any medical concerns, you should consult a physician before beginning any exercise program.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3" style={{ color: 'var(--clr-charcoal)' }}>4. Code of Conduct</h2>
            <p className="text-sm leading-relaxed mb-3">All members and guests are expected to:</p>
            <ul className="text-sm leading-relaxed space-y-1.5 ml-4 list-disc list-outside">
              <li>Treat all staff, members, and guests with respect</li>
              <li>Re-rack weights and return equipment to its designated location after use</li>
              <li>Wipe down equipment after use</li>
              <li>Wear appropriate athletic footwear at all times on the gym floor</li>
              <li>Refrain from using chalk outside designated areas without staff approval</li>
              <li>Not engage in harassment, discrimination, or intimidating behavior of any kind</li>
              <li>Follow all posted facility rules and staff instructions</li>
            </ul>
            <p className="text-sm leading-relaxed mt-3">
              Violation of the code of conduct may result in immediate removal from the facility and
              termination of membership without refund.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3" style={{ color: 'var(--clr-charcoal)' }}>5. Photography &amp; Video</h2>
            <p className="text-sm leading-relaxed">
              Santa Cruz Strength may photograph or record video in the facility for promotional purposes,
              including but not limited to social media, website, and marketing materials. By using our
              facility, you consent to being photographed or recorded. If you do not wish to appear in
              any promotional materials, please notify a staff member in writing.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3" style={{ color: 'var(--clr-charcoal)' }}>6. Personal Training</h2>
            <ul className="text-sm leading-relaxed space-y-1.5 ml-4 list-disc list-outside">
              <li>Personal training sessions must be cancelled at least 24 hours in advance to avoid being charged for the session.</li>
              <li>Late cancellations (less than 24 hours) or no-shows will be charged the full session rate.</li>
              <li>Personal training packages expire as specified at time of purchase and are non-refundable.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3" style={{ color: 'var(--clr-charcoal)' }}>7. Website Use</h2>
            <ul className="text-sm leading-relaxed space-y-1.5 ml-4 list-disc list-outside">
              <li>The content on this website is provided for informational purposes only and does not constitute medical, fitness, or professional advice.</li>
              <li>You may not use this website in any way that could damage, disable, or impair the site or interfere with other users.</li>
              <li>All content on this website, including text, images, and branding, is the property of Santa Cruz Strength and may not be reproduced without written permission.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3" style={{ color: 'var(--clr-charcoal)' }}>8. SMS / Text Message Program Terms</h2>
            <div className="bg-[var(--clr-bg)] border rounded-[var(--radius-lg)] px-5 py-4 mb-4 space-y-3" style={{ borderColor: 'var(--clr-border)' }}>
              <p className="text-sm font-bold" style={{ color: 'var(--clr-charcoal)' }}>Program Name: Santa Cruz Strength Messaging</p>
              <p className="text-sm leading-relaxed">
                By providing your phone number and submitting a form on santacruzstrength.com, or by texting
                the keyword <strong>START</strong> to (408) 583-6671, you expressly consent to receive recurring
                automated promotional and informational text messages (SMS/MMS) from Santa Cruz Strength.
                These messages may include tour scheduling, membership information, follow-up messages,
                promotional offers, and general gym updates.
              </p>
              <p className="text-sm leading-relaxed">
                <strong>Consent is not a condition of purchase.</strong> You do not need to agree to receive
                text messages in order to purchase a membership or use our services.
              </p>
              <p className="text-sm leading-relaxed">
                <strong>Message frequency varies.</strong> You may receive up to 10 messages per month
                depending on your inquiry and membership status.
              </p>
              <p className="text-sm leading-relaxed">
                <strong>Message and data rates may apply.</strong> Standard carrier rates for text messaging
                apply. Check with your mobile carrier for details on your plan.
              </p>
              <p className="text-sm leading-relaxed">
                <strong>To opt out:</strong> Text <strong>STOP</strong> to any message from Santa Cruz Strength.
                You will receive a single confirmation message and no further texts will be sent.
              </p>
              <p className="text-sm leading-relaxed">
                <strong>For help:</strong> Text <strong>HELP</strong> to any message from Santa Cruz Strength,
                or contact us at management@santacruzstrength.com or (408) 337-6709.
              </p>
              <p className="text-sm leading-relaxed">
                Supported carriers include but are not limited to: AT&amp;T, T-Mobile, Verizon, Sprint, and
                other major US carriers. T-Mobile is not liable for delayed or undelivered messages.
              </p>
              <p className="text-sm leading-relaxed">
                Your mobile phone number will not be shared with third parties for marketing purposes.
                View our <Link to="/privacy" className="underline underline-offset-2 hover:text-[var(--clr-green)] transition-colors duration-200">Privacy Policy</Link> for
                full details on how we handle your information.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3" style={{ color: 'var(--clr-charcoal)' }}>9. Age Requirements</h2>
            <p className="text-sm leading-relaxed">
              Members must be 18 years of age or older. Individuals between 14 to 17 years of age may use
              the facility only with a signed parental waiver and must be accompanied by a parent or
              guardian during all visits unless otherwise arranged with management.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3" style={{ color: 'var(--clr-charcoal)' }}>10. Limitation of Liability</h2>
            <p className="text-sm leading-relaxed">
              To the maximum extent permitted by applicable law, Santa Cruz Strength shall not be liable
              for any indirect, incidental, special, consequential, or punitive damages, including but not
              limited to loss of profits, data, or goodwill, arising out of or in connection with your use
              of our facility, website, or services.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3" style={{ color: 'var(--clr-charcoal)' }}>11. Governing Law</h2>
            <p className="text-sm leading-relaxed">
              These Terms &amp; Conditions are governed by and construed in accordance with the laws of the
              State of California, without regard to its conflict of law principles. Any disputes shall be
              resolved in the courts of Santa Cruz County, California.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3" style={{ color: 'var(--clr-charcoal)' }}>12. Changes to Terms</h2>
            <p className="text-sm leading-relaxed">
              We reserve the right to modify these Terms &amp; Conditions at any time. Changes will be
              posted on this page with an updated revision date. Continued use of our services following
              any changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3" style={{ color: 'var(--clr-charcoal)' }}>13. Contact</h2>
            <div className="bg-white rounded-[var(--radius-lg)] px-5 py-4 text-sm space-y-1"
              style={{ border: '1px solid var(--clr-border)', boxShadow: 'var(--shadow-sm)' }}>
              <p className="font-bold" style={{ color: 'var(--clr-charcoal)' }}>Santa Cruz Strength</p>
              <p style={{ color: 'var(--clr-text-muted)' }}>{GYM_CONFIG.address.full}</p>
              <p><a href={`mailto:${GYM_CONFIG.email}`} className="text-[var(--clr-green)] font-semibold">{GYM_CONFIG.email}</a></p>
              <p><a href={GYM_CONFIG.phoneHref} className="text-[var(--clr-green)] font-semibold">{GYM_CONFIG.phone}</a></p>
            </div>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t flex flex-wrap gap-4" style={{ borderColor: 'var(--clr-border)' }}>
          <Link to="/privacy" className="text-[var(--clr-green)] text-sm font-bold hover:underline">Privacy Policy →</Link>
          <Link to="/" className="text-[var(--clr-text-muted)] text-sm font-semibold hover:text-[var(--clr-green)] transition-colors duration-200">← Back to Home</Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
