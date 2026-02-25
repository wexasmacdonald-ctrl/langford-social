export const metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24, lineHeight: 1.6 }}>
      <h1>Privacy Policy - Langford Social Automation</h1>
      <p>
        <strong>Effective date:</strong> February 23, 2026
      </p>

      <p>
        Langford Social Automation is a private internal tool used only to schedule and publish restaurant posts to
        connected Instagram and Facebook business accounts.
      </p>

      <h2>Data accessed and stored</h2>
      <ul>
        <li>Instagram Business Account ID</li>
        <li>Facebook Page ID</li>
        <li>Meta access tokens</li>
        <li>Post captions and image URLs</li>
        <li>Publish run logs (date, status, platform post IDs, error messages)</li>
      </ul>

      <h2>Purpose of use</h2>
      <ul>
        <li>Publish scheduled posts to connected business accounts</li>
        <li>Monitor and troubleshoot publish success/failure</li>
      </ul>

      <h2>Data sharing</h2>
      <ul>
        <li>No personal data is sold.</li>
        <li>No personal data is rented.</li>
        <li>
          Data is shared only with Meta platforms required for publishing, plus optional webhook services configured
          by the operator for alerts.
        </li>
      </ul>

      <h2>Retention</h2>
      <ul>
        <li>Publish logs are retained for operational history and troubleshooting.</li>
        <li>Access tokens are stored in secure operational storage (database and/or deployment environment).</li>
        <li>Data can be removed by the operator at any time.</li>
      </ul>

      <h2>Security</h2>
      <ul>
        <li>Admin actions are protected by secret-authenticated endpoints.</li>
        <li>Tokens and secrets are not intentionally exposed in public interfaces.</li>
      </ul>

      <h2>User rights and deletion</h2>
      <p>
        If any data deletion request is received, operational data tied to this app can be deleted by the operator.
        Requests can be submitted through the restaurant&apos;s official Facebook page direct message.
      </p>

      <h2>Contact</h2>
      <p>Langford Social Automation Operator</p>
      <p>Phone: +1 819-576-7856</p>
    </main>
  );
}
