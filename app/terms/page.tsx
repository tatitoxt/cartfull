import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { PRICING, TRIAL_DAYS } from "@/lib/billing/plans";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="November 22, 2026">
      <p>
        These terms cover your use of Cartfull. By creating an account you agree to them. If you don&apos;t agree, please
        don&apos;t use the service.
      </p>

      <h2>What Cartfull does</h2>
      <p>
        Cartfull builds a weekly meal plan and grocery list around the budget and preferences you give us, and tracks what
        you report spending.
      </p>

      <h2>Built with software, including AI</h2>
      <p>
        Meal plans, recipe text, ingredient details and nutrition figures are generated algorithmically, in part with AI
        assistance. They can be wrong: always check the label on what you buy and use your judgment when cooking for
        people with allergies or medical conditions.
      </p>

      <h2>Prices are estimates</h2>
      <p>
        Grocery prices shown in Cartfull are estimates based on typical US shelf prices. They are not quotes or offers from
        any store, and they are not updated live. What you pay will differ by store, region, brand and week. Savings figures
        are calculated from these estimates and from the amounts you enter, and are not a guarantee.
      </p>

      <h2>Not medical or nutrition advice</h2>
      <p>
        Cartfull is a planning tool. It is not written or reviewed by a dietitian or doctor and does not give medical,
        dietary or nutrition advice. Diet labels such as vegetarian, keto and high-protein describe the recipes in general
        terms only.
      </p>
      <p>
        Allergen filters are based on the usual form of each ingredient. Products vary and may contain or be processed
        alongside allergens. If you or someone you cook for has an allergy or a medical condition, always read the label
        on what you buy and talk to a professional.
      </p>

      <h2>Your account</h2>
      <p>
        You need to be 18 or older. Keep access to your email secure, since it is how you sign in. You are responsible for
        activity on your account.
      </p>

      <h2>Free week, trial and subscription</h2>
      <ul>
        <li>Your first planned week is free and needs no card.</li>
        <li>
          To keep planning, you start a subscription with a {TRIAL_DAYS}-day free trial. One trial per household.
        </li>
        <li>
          After the trial you are charged {PRICING.monthly.label} a month or {PRICING.annual.label} a year, depending on the
          plan you chose, plus any tax, until you cancel. The subscription renews automatically.
        </li>
        <li>
          You can cancel at any time from Account &rarr; Manage billing. If you cancel during the trial you are not charged.
          If you cancel later you keep access until the end of the period you paid for.
        </li>
        <li>Payments are handled by Polar, our merchant of record. We do not store your card number.</li>
        <li>
          Introductory or promotional prices may be offered from time to time; the price that applies to you is the one
          shown at checkout, and renewals after a promotion are at the regular plan price.
        </li>
        <li>If we change the price we will tell you by email before your next renewal.</li>
      </ul>

      <h2>Shared lists</h2>
      <p>
        You can share a grocery list with a live link. Anyone who has the link can view the list and check items off,
        without an account. Share links only with people you trust, and remove a link when the shop is done.
      </p>

      <h2>Fair use</h2>
      <p>
        Don&apos;t misuse the service: no scraping, reselling, breaking in, or interfering with other people&apos;s use. We
        may suspend accounts that do.
      </p>

      <h2>Content</h2>
      <p>
        Recipes, text and design belong to Cartfull. Recipe photos come from Unsplash and are credited to their
        photographers. You may use the plans and lists for your own household.
      </p>

      <h2>Warranty and liability</h2>
      <p>
        Cartfull is provided as is, without warranties of any kind. To the extent the law allows, we are not liable for
        indirect or consequential losses, and our total liability is limited to the amount you paid us in the twelve months
        before the claim.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. If a change is significant we will let you know by email or in the app before it takes
        effect.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Email <a href="mailto:hello@cartfull.app">hello@cartfull.app</a>.
      </p>
    </LegalPage>
  );
}
