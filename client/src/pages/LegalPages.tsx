import type { ReactNode } from "react";
import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";

const legalLinks = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-service", label: "Terms of Service" },
  { href: "/refund-policy", label: "Refunds & Cancellations" },
];

function LegalShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta title={`${title} | Papa Life`} description={description} />
      <header className="border-b border-white/10 bg-black/90">
        <div className="container flex min-h-20 items-center justify-between gap-4 py-3">
          <a href="/" aria-label="Papa Life home">
            <SiteLogo size="md" />
          </a>
          <a href="/" className="text-sm font-semibold text-white/70 hover:text-brand-yellow">
            Back to Papa Life
          </a>
        </div>
      </header>
      <main className="container max-w-3xl py-12 md:py-16">
        <h1 className="text-4xl font-extrabold text-white md:text-5xl">{title}</h1>
        <div className="mt-8 space-y-7 text-base leading-relaxed text-white/72 md:text-lg [&_h2]:pt-5 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:text-white [&_li]:pl-1 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2">
          {children}
        </div>
      </main>
      <footer className="border-t border-white/10 bg-black/90 py-8">
        <div className="container flex flex-col gap-4 text-sm text-white/58 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Papa Life. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {legalLinks.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-brand-yellow">
                {link.label}
              </a>
            ))}
            <a href="tel:+15104152098" className="hover:text-brand-yellow">
              Brian Keith Hill · 510.415.2098
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      description="How Papa Life collects, uses, and protects information submitted through PapaLifeCoach.com."
    >
      <p>
        <strong>Effective Date:</strong> August 20, 2026
        <br />
        <strong>Last Updated:</strong> October 13, 2026
      </p>
      <p>
        Papa Life (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;) is a fatherhood coaching service owned and operated by{" "}
        <strong>Brian Keith Hill</strong>, based in San Leandro, California. This page explains what
        information we collect on PapaLifeCoach.com, how we use it, and how you can control it.
      </p>
      <p>
        If you have questions about this policy, contact us at <strong>Brian@bossmobility.net</strong> or{" "}
        <strong>(510) 415-2098</strong>.
      </p>
      <h2>1. Information We Collect</h2>
      <p>
        We collect information you give us directly, such as when you:
      </p>
      <ul>
        <li>Fill out a lead form (name, email, phone number, age range, and answers about your relationship with your adult child)</li>
        <li>Choose courses or self-guided coaching resources</li>
        <li>Register for Tuesday Live sessions</li>
        <li>Purchase an available self-paced course or service after reviewing current terms</li>
        <li>Send a message through our contact page or Papa Life AI Coach, including the content you choose to enter</li>
        <li>Take an assessment or reflection tool, including the answers and scores you choose to submit</li>
        <li>Create or use a member account, including account and access information</li>
      </ul>
      <p>
        We also collect limited technical information automatically, such as browser and device type,
        IP address, pages visited, approximate location derived from IP address, security events, and
        cookie or similar identifiers used to operate, secure, and understand the site. Through HeyCatch
        analytics, we may also process session activity, page views, clicks or taps, route changes, and the
        occurrence of form submissions. HeyCatch is configured for behavioral analytics and does not need
        the contents typed into form fields for this purpose.
      </p>
      <h2>2. Sensitive Information and AI Conversations</h2>
      <p>
        Please do not enter medical records, protected health information, payment-card numbers, Social
        Security numbers, passwords, or other highly sensitive information into forms, assessments, or the
        Papa Life AI Coach. AI responses are generated automatically and may be incomplete or inaccurate.
        The AI Coach is not a confidential therapist, doctor, lawyer, crisis service, or emergency service.
      </p>
      <h2>3. How We Use Your Information</h2>
      <p>We use your information to:</p>
      <ul>
        <li>Respond to your questions and requests</li>
        <li>Send you coaching resources, reminders, and account notifications</li>
        <li>Process authorized course purchases and manage existing account access</li>
        <li>Send text messages and emails you have agreed to receive</li>
        <li>Improve our website, courses, and coaching programs</li>
        <li>Follow the law and protect our business</li>
      </ul>
      <h2>4. Text Messages (SMS)</h2>
      <p>
        If you give us your phone number and check the SMS consent box on a form, you agree to receive
        text messages from Papa Life about course access, educational resources, reminders, and
        account notifications. Message frequency varies. Message and data rates may apply. Reply{" "}
        <strong>STOP</strong> to unsubscribe at any time, or <strong>HELP</strong> for assistance. Your
        phone number and SMS consent are never sold or shared with third parties for their own marketing.
      </p>
      <h2>5. How We Share Information</h2>
      <p>We do not sell your personal information. We only share it with:</p>
      <ul>
        <li>Service providers who help us operate Papa Life, including our CRM (GoHighLevel), scheduling and video-meeting provider (Google Calendar and Google Meet), payment processor (Stripe), website analytics provider (HeyCatch), hosting and security providers, AI, video and voice providers, and email/SMS delivery systems</li>
        <li>Law enforcement or courts, if we are required to by law</li>
        <li>A buyer, if Papa Life is ever sold or merged with another company</li>
      </ul>
      <p>
        These providers process information under their own terms and privacy practices. Payment-card
        details are entered with and processed by Stripe or another checkout provider; Papa Life does not
        store full payment-card numbers on its own servers.
      </p>
      <h2>6. Cookies and Similar Technologies</h2>
      <p>
        We may use cookies or similar technologies that are necessary for sign-in, security, preferences,
        and site operation. We may also use analytics to understand site use. Where applicable law requires
        consent for non-essential cookies, we will request that consent before using them. You can also use
        your browser controls to limit cookies, although some account features may not work correctly.
      </p>
      <h2>7. Data Retention</h2>
      <p>
        We keep personal information only as long as reasonably necessary for the purposes described in
        this policy, including providing services, maintaining accounts and transaction records, resolving
        disputes, meeting legal obligations, and protecting the site. Retention periods vary by record
        type. We delete or de-identify information when it is no longer reasonably needed.
      </p>
      <h2>8. Your Choices and Privacy Rights</h2>
      <p>You can:</p>
      <ul>
        <li>Ask us to see, correct, or delete your personal information</li>
        <li>Unsubscribe from emails using the link at the bottom of any email</li>
        <li>Reply STOP to any text message to stop receiving texts</li>
        <li>Manage previously purchased access under the terms applicable at purchase</li>
      </ul>
      <p>To make any of these requests, email us at Brian@bossmobility.net.</p>
      <h2>9. Children&apos;s Privacy</h2>
      <p>
        Papa Life is built for adult fathers. Our services are not directed at children, and we do not
        knowingly collect information from anyone under 18.
      </p>
      <h2>10. Data Security</h2>
      <p>
        We use reasonable safeguards to protect your information, including secure hosting and encrypted
        payment processing. No system is 100% secure, so we cannot guarantee absolute protection, but we
        take your privacy seriously.
      </p>
      <h2>11. California and Other Privacy Rights</h2>
      <p>
        Depending on where you live and whether a particular law applies to Papa Life, you may have rights
        to request access, correction, deletion, restriction, objection, or a copy of personal information,
        and to withdraw consent. California residents may also have rights concerning the sale or sharing of
        personal information. Papa Life does not sell personal information or share it for cross-context
        behavioral advertising. We may need to verify your identity before completing a request. You may
        contact Brian@bossmobility.net to submit a request, and you will not be discriminated against for
        exercising an applicable privacy right.
      </p>
      <h2>12. International Processing and External Links</h2>
      <p>
        Our providers may process information in the United States or other countries. Privacy protections
        may differ by location. PapaLifeCoach.com may also link to third-party websites; their privacy
        practices are governed by their own notices, not this policy.
      </p>
      <h2>13. Changes to This Policy</h2>
      <p>
        We may update this policy from time to time. We will change the &quot;Last Updated&quot; date at the
        top when we do. We will provide additional notice when required by applicable law.
      </p>
      <h2>14. Contact Us</h2>
      <p>
        <strong>Business Name:</strong> Brian Keith Hill
        <br />
        <strong>Address:</strong> 485 Fortuna Avenue, San Leandro, CA 94577
        <br />
        <strong>Email:</strong> Brian@bossmobility.net
        <br />
        <strong>Phone:</strong> (510) 415-2098
      </p>
    </LegalShell>
  );
}

export function TermsPage() {
  return (
    <LegalShell
      title="Terms of Service"
      description="Terms for using Papa Life, PapaLifeCoach.com, Papa Life AI Coach, courses, and digital services."
    >
      <p>
        <strong>Effective Date:</strong> August 20, 2026
        <br />
        <strong>Last Updated:</strong> October 13, 2026
      </p>
      <p>
        Welcome to Papa Life, a fatherhood coaching service owned and operated by{" "}
        <strong>Brian Keith Hill</strong> (&quot;Papa Life,&quot; &quot;we,&quot; &quot;us&quot;). By using
        PapaLifeCoach.com, our AI coach (Papa Life AI Coach), our courses, or purchasing currently available services,
        you agree to these terms.
      </p>
      <h2>1. Who We Are</h2>
      <p>
        Papa Life is a coaching and education platform built for fathers of adult children. Our founder,
        Brian Keith Hill, is a Certified Peer Support Specialist. Papa Life is a coaching and educational
        service — it is not therapy, counseling, or a licensed mental health service, and it does not
        replace professional medical, legal, or mental health care.
      </p>
      <h2>2. Using Our Site</h2>
      <p>
        You must be 18 or older to use Papa Life. You agree to give accurate information when you fill out a
        form, choose a course, or request a service. You agree not to misuse the site, our AI coach, or
        our content — including trying to hack, copy, resell, or scrape our material without permission.
      </p>
      <h2>3. Purchases and Existing Member Access</h2>
      <p>
New monthly membership enrollment is closed. Any currently offered course or service will disclose its price and access terms before payment. Existing member rights and obligations continue under their original purchase terms. Contact Papa Life for questions about existing subscriptions.
      </p>
      <h2>4. Text Messages and Communication</h2>
      <p>
        If you provide your phone number and opt in, you agree to receive text messages from Papa Life about
        course access, educational resources, reminders, and account notifications. Message frequency
        varies. Message and data rates may apply. Reply STOP to unsubscribe or HELP for assistance. See our
        Privacy Policy for more on how we handle your information.
      </p>
      <h2>5. Our Content</h2>
      <p>
        All videos, audio, courses, workbooks, and written material on this site belong to Papa Life and
        Brian Keith Hill. You may use them for your own personal growth. You may not copy, resell, or
        redistribute them without our written permission.
      </p>
      <h2>6. The AI Coach (Papa Life AI Coach)</h2>
      <p>
        Our AI coach gives automated, general encouragement and coaching-style responses based on the PAPA
        Framework. Responses may be incomplete or inaccurate. The AI Coach is not a therapist and does not
        provide medical, legal, psychiatric, or emergency advice. Do not enter protected health information,
        payment-card data, passwords, or other highly sensitive information. If you are in immediate danger,
        call 911. In the United States, call or text 988 for suicide or crisis support.
      </p>
      <h2>7. No Guarantee of Results</h2>
      <p>
        Every family situation is different. We cannot promise that using Papa Life will fix or repair any
        specific relationship. The stories and testimonials on our site reflect real experiences, but results
        vary from person to person.
      </p>
      <h2>8. Limitation of Liability</h2>
      <p>
        To the fullest extent allowed by law, Papa Life and Brian Keith Hill are not responsible for
        indirect, incidental, or consequential damages related to your use of the site or coaching services.
        Our total liability to you will never be more than the amount you paid us in the past 12 months.
      </p>
      <h2>9. Changes to These Terms</h2>
      <p>
        We may update these terms from time to time. We will change the &quot;Last Updated&quot; date when we do.
        If you keep using the site after a change, that means you accept the new terms.
      </p>
      <h2>10. Governing Law</h2>
      <p>These terms are governed by the laws of the State of California.</p>
      <h2>11. Contact Us</h2>
      <p>
        <strong>Business Name:</strong> Brian Keith Hill
        <br />
        <strong>Address:</strong> 485 Fortuna Avenue, San Leandro, CA 94577
        <br />
        <strong>Email:</strong> Brian@bossmobility.net
        <br />
        <strong>Phone:</strong> (510) 415-2098
      </p>
    </LegalShell>
  );
}


/** Customer-facing refund and cancellation terms shared with AI Boss Mobility. */
export function RefundPolicyPage() {
  return (
    <LegalShell title="Refund and Cancellation Policy" description="Papa Life one-time digital-product purchases and refunds; separate AI Boss Mobility custom-service payment terms.">
      <p><strong>AI Boss Mobility Consulting &amp; Papa Life</strong></p>
      <p><strong>Effective Date: October 15, 2026</strong></p>
            <p>{"We aim to provide reliable products, professional services, and fair treatment to every customer. This policy explains how refunds and cancellations are handled for digital products, consulting and AI services, service issues, and circumstances in which a refund or cancellation right is required by applicable law."}</p>
      <div className="rounded-xl border-2 border-[#f2c230] bg-[#17231c] p-5 text-white">
        <strong>At a glance:</strong> Papa Life digital lessons are one-time, full-price purchases with no estimate, signature, or deposit requirement and a 7-calendar-day refund request window. Separately, AI Boss Mobility custom consulting requires a signed estimate, a 50% deposit and final 50% before delivery. The full terms are below.
      </div>
      <h2>Digital Products</h2>
      <p>{"Customers who purchase Papa Life audio lessons, digital courses, manuscripts, or digital bundles may request a full refund within 7 calendar days after the purchase date, subject to any non-waivable rights provided by applicable law."}</p>
      <p>{"If a digital product is not delivered, cannot be accessed, or is materially different from its description, please contact us promptly. We will make reasonable efforts to correct the issue or, where appropriate, provide a refund or other remedy required by the circumstances and applicable law."}</p>
      <p>{"After the seven-day period, digital-product purchases are generally nonrefundable. A refund or other remedy may nevertheless be available if the product is defective, was not delivered as described, or applicable law requires one."}</p>
      <p>{"Approved refunds will generally be issued to the original payment method, unless applicable law or the payment provider requires or permits another method."}</p>
      <h2>AI Boss Mobility — Custom Consulting and AI Services</h2>
      <p>{"AI Boss Mobility customized consulting and AI services require a written estimate and agreement signed by the customer before payment is requested. The agreement will identify the services, scope, fees, deadlines, and any other applicable terms."}</p>
      <p>{"Unless the signed agreement states otherwise, payment terms are: 50% deposit after signing the agreement and before work begins; remaining 50% upon completion, before final delivery."}</p>
      <p>{"Cancellation before work begins: A customer may request cancellation before work begins. Any refund of a deposit will be determined under the signed agreement and may be reduced by specifically authorized, disclosed, and nonrefundable third-party expenses already incurred."}</p>
      <p>{"Cancellation after work begins: The customer is responsible for work performed and authorized expenses incurred through the effective cancellation date, as provided in the signed agreement. Any unearned portion of an advance payment will be refunded, subject to applicable law and the agreement."}</p>
      <p>{"Completed projects: After the agreed services have been completed in accordance with the signed scope, a refund is generally not available solely because the customer changes their mind. We will review any reported failure to provide services required by the signed agreement and provide any correction, refund, or other remedy required by the agreement or applicable law."}</p>
      <ul>
        <li>50% deposit after signing the agreement and before work begins.</li>
        <li>Remaining 50% upon completion, before final delivery.</li>
      </ul>
      <h2>Defective or Nonconforming Services</h2>
      <p>{"If consulting or AI services are materially defective, incomplete, or do not conform to the signed agreement, please notify us promptly and describe the issue in reasonable detail. We will make reasonable efforts to investigate and, where appropriate, correct or complete the affected work."}</p>
      <p>{"If the issue cannot reasonably be corrected, we may provide an appropriate partial or full refund for the affected services, consistent with the signed agreement and applicable law. Nothing in this process limits any rights or remedies that cannot lawfully be waived."}</p>
      <h2>Refunds Required by Law</h2>
      <p>{"Nothing in this policy excludes, limits, or waives any refund right, cancellation right, warranty, or other remedy that applicable law requires us to provide. If applicable law gives you a right to cancel or receive a refund, we will honor that right in accordance with the applicable legal requirements."}</p>
      <h2>How to Request a Refund or Cancellation</h2>
      <p>Please follow these steps:</p>
      <ol className="ml-6 list-decimal space-y-2">
        <li>{"Send your request to the appropriate email address below using the email address associated with your purchase."}</li>
        <li>{"Include your order number, the date of purchase or agreement, and a brief description of the requested refund or cancellation. For consulting or AI services, identify the signed agreement and services involved."}</li>
        <li>{"Submit the request at least 30 days before the requested cancellation date, unless the signed agreement or applicable law provides a different period."}</li>
        <li>{"Cancellation becomes effective when we receive and acknowledge the request, or on the later effective date stated in the request, signed agreement, or applicable law. Work and authorized expenses incurred before that effective date remain subject to the applicable agreement and this policy."}</li>
        <li>{"We will acknowledge receipt within two business days and send written confirmation of the decision and effective cancellation date by email. Approved refunds will generally be initiated promptly, but the time required for funds to appear in your account depends on the payment provider and financial institution."}</li>
      </ol>
            <p>{"The 30-day advance request applies to future-dated service cancellations when applicable. It does not delay or restrict the 7-day digital-product refund period, cancellation before work begins, or any rights required by law."}</p>
      <p><strong>Papa Life:</strong> <a className="underline text-brand-yellow" href="mailto:brian@papalifecoach.com">brian@papalifecoach.com</a></p>
      <p><strong>AI Boss Mobility Consulting:</strong> <a className="underline text-brand-yellow" href="mailto:brian@bossmobility.net">brian@bossmobility.net</a></p>
      <p>This policy does not limit any rights or remedies provided by applicable law.</p>
    </LegalShell>
  );
}
