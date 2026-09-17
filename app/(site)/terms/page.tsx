import type { Metadata } from "next";
import LegalPage from "@site/marketing/LegalPage";
import { SITE } from "@shared/site";

export const metadata: Metadata = { title: "Terms of service", alternates: { canonical: "/terms" } };

export default function Page() {
  return <LegalPage
    title="Terms of service"
    intro={`These terms govern your use of ${SITE.name} (the “Service”), operated by ${SITE.company}. By creating an account or using the Service you agree to these terms.`}
    sections={[
      { heading: "Your account", body: <><p>You must provide accurate information and be at least 13 years old (or the minimum age required in your country). You are responsible for keeping your password secure and for all activity under your account.</p><p>Tell us immediately if you believe your account has been accessed without permission.</p></> },
      { heading: "Your content", body: <><p>You keep all rights to the books, text, images and other material you create or upload (“Your Content”). You grant us a limited licence to store, process and display Your Content only as needed to operate the Service — for example to save your books, generate exports and show reader links you publish.</p><p>You confirm that you have the rights to everything you upload and that Your Content does not infringe anyone else&apos;s rights.</p></> },
      { heading: "Acceptable use", body: <><p>You agree not to use the Service to create or share content that is illegal, harmful, hateful, sexually exploits minors, harasses others, infringes intellectual property or contains malware. You also agree not to attempt to disrupt, overload, reverse engineer or gain unauthorised access to the Service.</p><p>We may remove content or suspend accounts that break these rules.</p></> },
      { heading: "AI features", body: <p>AI-generated text, images and video are produced automatically and may be inaccurate, incomplete or similar to content generated for others. Review AI output before publishing it. You are responsible for how you use AI output. AI requests are processed by third-party providers as described in our Privacy Policy.</p> },
      { heading: "Plans, limits and payments", body: <p>Free and paid plans include the limits shown on our Pricing page. Paid plans are billed in advance for each billing period. We may change prices with at least 30 days&apos; notice; changes apply from your next billing period. Refunds are handled under our Refund Policy.</p> },
      { heading: "Availability and changes", body: <p>We work to keep the Service available and your data safe, but the Service is provided &quot;as is&quot; without warranties of any kind. We may add, change or remove features. We recommend exporting important books regularly.</p> },
      { heading: "Termination", body: <p>You can delete your account at any time from Account settings, which permanently removes your books and files. We may suspend or terminate accounts that violate these terms or where required by law.</p> },
      { heading: "Limitation of liability", body: <p>To the maximum extent permitted by law, {SITE.company} is not liable for indirect, incidental or consequential damages, or for loss of data, profits or revenue. Our total liability for any claim is limited to the amount you paid us in the 12 months before the claim.</p> },
      { heading: "Governing law", body: <p>These terms are governed by the laws of {SITE.jurisdiction}. Disputes will be handled by the competent courts of {SITE.jurisdiction}.</p> },
      { heading: "Changes to these terms", body: <p>We may update these terms. If changes are significant we will notify you by email or in the app before they take effect. Continuing to use the Service after that means you accept the updated terms.</p> },
    ]}
  />;
}
