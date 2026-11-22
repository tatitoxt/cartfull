import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="November 22, 2026">
      <p>This page explains what Cartfull collects, why, and what you can do about it.</p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account:</strong> your email address, and your name and profile picture if you sign in with Google.
        </li>
        <li>
          <strong>Household answers:</strong> weekly budget, usual spend, household size, diet, cooking time, allergies,
          dislikes and pantry items.
        </li>
        <li>
          <strong>Plans:</strong> the weeks we plan for you, your grocery list state, and the spend totals you enter.
        </li>
        <li>
          <strong>Billing:</strong> your subscription status and Stripe customer ID. Card details go to Stripe and never
          reach our servers.
        </li>
        <li>
          <strong>Usage:</strong> product events such as signing up, generating a plan or starting a trial, and the campaign
          tags (UTM) on the link that first brought you here.
        </li>
      </ul>
      <p>
        Allergy and diet answers are used only to filter recipes. We do not use them for advertising and do not sell them.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>To plan your meals, price your list and show your savings.</li>
        <li>To sign you in and send account emails.</li>
        <li>To take payment and manage your subscription.</li>
        <li>To understand which parts of the product work and fix the ones that don&apos;t.</li>
      </ul>

      <h2>Who processes it for us</h2>
      <ul>
        <li>Supabase: database and sign-in.</li>
        <li>Stripe: payments.</li>
        <li>Vercel: hosting.</li>
        <li>PostHog: product analytics.</li>
        <li>Our email provider: sign-in emails.</li>
        <li>Unsplash: recipe photos are loaded from its image servers, which see your IP address.</li>
      </ul>
      <p>We do not sell or share your personal information for cross-context advertising.</p>

      <h2>Cookies and device storage</h2>
      <p>
        We use cookies to keep you signed in and to remember the campaign that referred you. Your browser also stores your
        onboarding answers before you sign up and a copy of your grocery list so it works offline. Analytics may set its
        own cookie.
      </p>

      <h2>Keeping and deleting</h2>
      <p>
        We keep your data while your account is open. Email{" "}
        <a href="mailto:hello@cartfull.app">hello@cartfull.app</a> to get a copy, correct it, or delete your account and
        its data. We may keep billing records as the law requires.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live, including California and other US states, you may have the right to access, correct,
        delete or move your data and to appeal a decision about a request. We will not treat you differently for using
        these rights.
      </p>

      <h2>Children</h2>
      <p>Cartfull is for adults. We do not knowingly collect data from children under 13.</p>

      <h2>Changes and contact</h2>
      <p>
        If this policy changes in a way that matters we will tell you before it takes effect. Questions go to{" "}
        <a href="mailto:hello@cartfull.app">hello@cartfull.app</a>.
      </p>
    </LegalPage>
  );
}
