export const metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24, lineHeight: 1.6 }}>
      <h1>Terms of Service - Langford Social Automation</h1>
      <p>
        <strong>Effective date:</strong> February 23, 2026
      </p>

      <p>
        Langford Social Automation is a private internal-use software tool for managing scheduled social publishing
        for restaurant operations.
      </p>

      <h2>Terms</h2>
      <ol>
        <li>Authorized use only by the restaurant owner/operator and approved staff.</li>
        <li>The operator is responsible for reviewing and approving content and scheduling logic.</li>
        <li>
          Service availability is not guaranteed and may be interrupted for maintenance, platform changes, or
          third-party API issues.
        </li>
        <li>The tool may be modified, suspended, or discontinued at any time.</li>
        <li>
          To the maximum extent permitted by law, the operator is not liable for indirect, incidental, or
          consequential damages from use of this tool.
        </li>
      </ol>

      <h2>Contact</h2>
      <p>Langford Social Automation Operator</p>
      <p>Phone: +1 819-576-7856</p>
    </main>
  );
}
