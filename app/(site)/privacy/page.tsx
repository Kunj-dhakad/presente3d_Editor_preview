import type { Metadata } from "next";
import LegalPage from "@site/marketing/LegalPage";
import { SITE } from "@shared/site";

export const metadata: Metadata = { title: "Privacy policy", alternates: { canonical: "/privacy" } };

export default function Page() {
  return <LegalPage
    title="Privacy policy"
    intro={`This policy explains what personal data ${SITE.company} collects when you use ${SITE.name}, how we use it and the choices you have.`}
    sections={[
      { heading: "Data we collect", body: <ul>
        <li><strong>Account data:</strong> your name, email address and a securely hashed password.</li>
        <li><strong>Your content:</strong> books, text, images, videos and files you create or upload, plus responses readers submit to your published books.</li>
        <li><strong>Usage data:</strong> session information (IP address, browser), usage counts used to apply plan limits, and basic logs needed to keep the Service secure.</li>
        <li><strong>Messages:</strong> anything you send us through the contact form or by email.</li>
      </ul> },
      { heading: "How we use it", body: <p>We use your data to provide and secure the Service, save and export your books, apply plan limits, send account emails (such as verification and password reset), respond to support requests and improve the product. We do not sell your personal data and we do not use your books to train AI models.</p> },
      { heading: "Service providers", body: <><p>We share data only with providers that help us run the Service, under agreements that protect it:</p><ul>
        <li>Amazon Web Services — encrypted file storage.</li>
        <li>OpenAI — processing prompts and text you send to AI features.</li>
        <li>Image, stock media and text-to-speech providers — only when you use those features.</li>
        <li>Email delivery providers — sending account emails.</li>
      </ul></> },
      { heading: "Cookies and local storage", body: <p>We use a strictly necessary session cookie to keep you logged in. Your browser&apos;s local storage keeps preferences such as theme and unsaved editor drafts. We do not use advertising cookies.</p> },
      { heading: "Published books", body: <p>Books are private by default. When you publish a reader link, anyone with the link can view that book. You can revoke the link at any time.</p> },
      { heading: "Retention", body: <p>We keep your data while your account is active. Books moved to trash can be restored until you delete your account. When you delete your account, your books, files and usage records are permanently removed from our systems.</p> },
      { heading: "Your rights", body: <p>You can access and update your profile in Account settings, export your books at any time and delete your account yourself. To request a copy of your data or raise a privacy concern, contact us using the details below.</p> },
      { heading: "Security", body: <p>Passwords are hashed, connections are encrypted with HTTPS, files are stored with server-side encryption and access to your books is limited to your account.</p> },
      { heading: "Children", body: <p>The Service is not intended for children under 13, and we do not knowingly collect their data.</p> },
      { heading: "Changes", body: <p>We will post updates to this policy here and notify you of significant changes.</p> },
    ]}
  />;
}
