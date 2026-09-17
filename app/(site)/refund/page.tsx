import type { Metadata } from "next";
import LegalPage from "@site/marketing/LegalPage";
import { SITE } from "@shared/site";

export const metadata: Metadata = { title: "Refund and cancellation policy", alternates: { canonical: "/refund" } };

export default function Page() {
  return <LegalPage
    title="Refund and cancellation policy"
    intro={`We want you to be happy with ${SITE.name}. This policy explains how cancellations and refunds work for paid plans.`}
    sections={[
      { heading: "Free plan first", body: <p>The Free plan lets you try the editor, AI features and exports before paying, so you can decide whether a paid plan is right for you.</p> },
      { heading: "Cancelling", body: <p>You can cancel a paid plan at any time by contacting us from Plan &amp; billing or the contact page. Your plan stays active until the end of the current billing period and then moves to Free. Your books are never deleted when you downgrade.</p> },
      { heading: "Refunds", body: <p>If you are not satisfied, request a refund within 7 days of your first payment for a plan and we will refund it in full. Renewal payments are not refundable, except where required by law or where the Service was unavailable for an extended period because of a fault on our side.</p> },
      { heading: "How refunds are paid", body: <p>Approved refunds are returned to the original payment method within 5–10 business days, depending on your bank or payment provider.</p> },
      { heading: "Plan limits after downgrade", body: <p>If you have more books or storage than the Free plan allows, you keep access to everything you created, but you will not be able to create new books or upload new files until you are within the limits.</p> },
    ]}
  />;
}
