import type { ReactNode } from "react";
import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";

const legalLinks = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-service", label: "Terms of Service" },
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
      <PageMeta title={`${title} | Boss Mobile Life Coach`} description={description} />
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
          <p>&copy; {new Date().getFullYear()} Boss Mobile Life Coach. All rights reserved.</p>
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
      description="How Papa Life collects, uses, and protects information submitted through bossmobilelifecoach.com."
    >
      <p>
        <strong>Effective Date:</strong> July 3, 2026
        <br />
        <strong>Last Updated:</strong> July 3, 2026
      </p>
      <p>
        Papa Life (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;) is a fatherhood coaching service owned and operated by{" "}
        <strong>Brian Keith Hill</strong>, based in San Leandro, California. This page explains what
        information we collect on bossmobilelifecoach.com, how we use it, and how you can control it.
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
        <li>Book a coaching call through Calendly</li>
        <li>Register for Tuesday Live sessions</li>
        <li>Join Papa Life membership ($4.99/month) through our checkout</li>
        <li>Send a message through our contact page or AI chat assistant</li>
        <li>Take the Father-Adult Child Relationship Assessment or Father&apos;s Day Reflection tool</li>
      </ul>
      <p>
        We also collect some information automatically, like your browser type, device, and how you use
        the site, through standard web analytics.
      </p>
      <h2>2. How We Use Your Information</h2>
      <p>We use your information to:</p>
      <ul>
        <li>Respond to your questions and requests</li>
        <li>Send you coaching resources, reminders, and account notifications</li>
        <li>Process membership payments and manage your account</li>
        <li>Send text messages and emails you have agreed to receive</li>
        <li>Improve our website, courses, and coaching programs</li>
        <li>Follow the law and protect our business</li>
      </ul>
      <h2>3. Text Messages (SMS)</h2>
      <p>
        If you give us your phone number and check the SMS consent box on a form, you agree to receive
        text messages from Papa Life about coaching appointments, educational resources, reminders, and
        account notifications. Message frequency varies. Message and data rates may apply. Reply{" "}
        <strong>STOP</strong> to unsubscribe at any time, or <strong>HELP</strong> for assistance. Your
        phone number and SMS consent are never sold or shared with third parties for their own marketing.
      </p>
      <h2>4. How We Share Information</h2>
      <p>We do not sell your personal information. We only share it with:</p>
      <ul>
        <li>Service providers who help us run the business, like our CRM (GoHighLevel), payment processor (Stripe), video and voice tools (HeyGen, ElevenLabs), and email/SMS delivery systems</li>
        <li>Law enforcement or courts, if we are required to by law</li>
        <li>A buyer, if Papa Life is ever sold or merged with another company</li>
      </ul>
      <p>Each of these providers is only given the information they need to do their job.</p>
      <h2>5. Your Choices</h2>
      <p>You can:</p>
      <ul>
        <li>Ask us to see, correct, or delete your personal information</li>
        <li>Unsubscribe from emails using the link at the bottom of any email</li>
        <li>Reply STOP to any text message to stop receiving texts</li>
        <li>Cancel your Papa Life membership at any time in two clicks</li>
      </ul>
      <p>To make any of these requests, email us at Brian@bossmobility.net.</p>
      <h2>6. Children&apos;s Privacy</h2>
      <p>
        Papa Life is built for adult fathers. Our services are not directed at children, and we do not
        knowingly collect information from anyone under 18.
      </p>
      <h2>7. Data Security</h2>
      <p>
        We use reasonable safeguards to protect your information, including secure hosting and encrypted
        payment processing. No system is 100% secure, so we cannot guarantee absolute protection, but we
        take your privacy seriously.
      </p>
      <h2>8. California Privacy Rights</h2>
      <p>
        If you live in California, you have rights under the California Consumer Privacy Act (CCPA),
        including the right to know what personal information we collect, the right to ask us to delete it,
        and the right to opt out of the sale of personal information. We do not sell personal information.
      </p>
      <h2>9. Changes to This Policy</h2>
      <p>
        We may update this policy from time to time. We will change the &quot;Last Updated&quot; date at the
        top when we do. Continuing to use the site after a change means you accept the update.
      </p>
      <h2>10. Contact Us</h2>
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
      description="Terms for using Papa Life, bossmobilelifecoach.com, ORACLE, courses, and membership."
    >
      <p>
        <strong>Effective Date:</strong> July 3, 2026
        <br />
        <strong>Last Updated:</strong> July 3, 2026
      </p>
      <p>
        Welcome to Papa Life, a fatherhood coaching service owned and operated by{" "}
        <strong>Brian Keith Hill</strong> (&quot;Papa Life,&quot; &quot;we,&quot; &quot;us&quot;). By using
        bossmobilelifecoach.com, our AI coach (ORACLE), our courses, or joining our $4.99/month membership,
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
        form, book a session, or sign up for membership. You agree not to misuse the site, our AI coach, or
        our content — including trying to hack, copy, resell, or scrape our material without permission.
      </p>
      <h2>3. Membership and Payment</h2>
      <p>
        Papa Life membership costs $4.99 per month after any free trial period. Your card will be billed
        automatically each month until you cancel. You can cancel anytime in two clicks with no phone call
        required. We do not offer refunds for partial months already paid, unless required by law.
      </p>
      <h2>4. Text Messages and Communication</h2>
      <p>
        If you provide your phone number and opt in, you agree to receive text messages from Papa Life about
        coaching appointments, educational resources, reminders, and account notifications. Message frequency
        varies. Message and data rates may apply. Reply STOP to unsubscribe or HELP for assistance. See our
        Privacy Policy for more on how we handle your information.
      </p>
      <h2>5. Our Content</h2>
      <p>
        All videos, audio, courses, workbooks, and written material on this site belong to Papa Life and
        Brian Keith Hill. You may use them for your own personal growth. You may not copy, resell, or
        redistribute them without our written permission.
      </p>
      <h2>6. The AI Coach (ORACLE)</h2>
      <p>
        Our AI coach gives general encouragement and coaching-style responses based on the PAPA Framework. It
        is not a therapist and does not give medical, legal, or psychiatric advice. If you are in crisis or
        need emergency help, contact a licensed professional or call 911.
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
