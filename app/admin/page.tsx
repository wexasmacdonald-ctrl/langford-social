"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublishRunRow, ScheduledPostPayload, ScheduledPublishResult } from "@/lib/types";

type PreviewResponse = {
  ok: boolean;
  payload: ScheduledPostPayload;
  existingRun: PublishRunRow | null;
};

type RunsResponse = {
  runs: PublishRunRow[];
};

type ClearRunResponse = {
  ok: boolean;
  run_date: string;
  deleted: boolean;
};

type ErrorResponse = {
  error?: {
    message?: string;
  };
};

type HealthResponse = {
  ok: boolean;
  dry_run?: boolean;
  alert_webhook_configured?: boolean;
};

function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatRunDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export default function AdminPage() {
  const [simulationDate, setSimulationDate] = useState(getTodayDateKey());
  const [secret, setSecret] = useState("");
  const [forceRun, setForceRun] = useState(false);
  const [preview, setPreview] = useState<ScheduledPostPayload | null>(null);
  const [existingRun, setExistingRun] = useState<PublishRunRow | null>(null);
  const [runs, setRuns] = useState<PublishRunRow[]>([]);
  const [lastResult, setLastResult] = useState<ScheduledPublishResult | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isDryRun, setIsDryRun] = useState<boolean | null>(null);
  const [hasAlertWebhook, setHasAlertWebhook] = useState<boolean | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [isPublishingDate, setIsPublishingDate] = useState(false);
  const [isPublishingToday, setIsPublishingToday] = useState(false);
  const [isClearingRun, setIsClearingRun] = useState(false);

  const previewHeader = useMemo(() => {
    if (!preview) return "No preview loaded";
    return `${preview.weekday_key.toUpperCase()} - ${preview.run_date}`;
  }, [preview]);

  function buildHeaders(): HeadersInit {
    if (secret.trim()) {
      return { Authorization: `Bearer ${secret.trim()}` };
    }
    return {};
  }

  async function loadPublishRuns() {
    setIsLoadingRuns(true);
    try {
      const response = await fetch("/api/publish-runs?limit=30", {
        headers: buildHeaders(),
        cache: "no-store",
      });
      const data = (await response.json()) as RunsResponse & ErrorResponse;
      if (!response.ok) {
        throw new Error(data.error?.message ?? "Failed to load publish history");
      }
      setRuns(data.runs);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load publish history";
      setStatusMessage(message);
    } finally {
      setIsLoadingRuns(false);
    }
  }

  async function loadRuntimeStatus() {
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      const data = (await response.json()) as HealthResponse & ErrorResponse;
      if (!response.ok) {
        throw new Error(data.error?.message ?? "Failed to load runtime status");
      }
      setIsDryRun(Boolean(data.dry_run));
      setHasAlertWebhook(Boolean(data.alert_webhook_configured));
    } catch {
      setIsDryRun(null);
      setHasAlertWebhook(null);
    }
  }

  async function loadPreview(dateKey: string) {
    setIsLoadingPreview(true);
    try {
      const response = await fetch(`/api/schedule/preview?date=${encodeURIComponent(dateKey)}`, {
        method: "GET",
        headers: buildHeaders(),
        cache: "no-store",
      });
      const data = (await response.json()) as PreviewResponse & ErrorResponse;
      if (!response.ok) {
        throw new Error(data.error?.message ?? "Failed to load preview");
      }
      setPreview(data.payload);
      setExistingRun(data.existingRun);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load preview";
      setStatusMessage(message);
    } finally {
      setIsLoadingPreview(false);
    }
  }

  async function runPublishForDate() {
    setIsPublishingDate(true);
    setStatusMessage("");
    try {
      const params = new URLSearchParams({ date: simulationDate });
      if (forceRun) {
        params.set("force", "true");
      }

      const response = await fetch(`/api/publish-now?${params.toString()}`, {
        method: "POST",
        headers: buildHeaders(),
      });
      const data = (await response.json()) as ScheduledPublishResult & ErrorResponse;
      if (!response.ok) {
        throw new Error(data.error?.message ?? "Failed to run scheduled publish");
      }

      setLastResult(data);
      setStatusMessage(`${data.status.toUpperCase()}: ${data.reason}`);
      await Promise.all([loadPublishRuns(), loadPreview(simulationDate)]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to run scheduled publish";
      setStatusMessage(message);
    } finally {
      setIsPublishingDate(false);
    }
  }

  async function runPublishToday() {
    setIsPublishingToday(true);
    setStatusMessage("");
    try {
      const response = await fetch("/api/publish-now", {
        method: "POST",
        headers: buildHeaders(),
      });
      const data = (await response.json()) as ScheduledPublishResult & ErrorResponse;
      if (!response.ok) {
        throw new Error(data.error?.message ?? "Failed to publish today");
      }

      setLastResult(data);
      setStatusMessage(`${data.status.toUpperCase()}: ${data.reason}`);
      await Promise.all([loadPublishRuns(), loadPreview(simulationDate)]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to publish today";
      setStatusMessage(message);
    } finally {
      setIsPublishingToday(false);
    }
  }

  async function clearRunForDate() {
    setIsClearingRun(true);
    setStatusMessage("");
    try {
      const params = new URLSearchParams({ date: simulationDate });
      const response = await fetch(`/api/publish-runs?${params.toString()}`, {
        method: "DELETE",
        headers: buildHeaders(),
      });
      const data = (await response.json()) as ClearRunResponse & ErrorResponse;
      if (!response.ok) {
        throw new Error(data.error?.message ?? "Failed to clear run lock");
      }

      setStatusMessage(
        data.deleted
          ? `Cleared run lock for ${simulationDate}.`
          : `No run lock found for ${simulationDate}.`,
      );
      await Promise.all([loadPublishRuns(), loadPreview(simulationDate)]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to clear run lock";
      setStatusMessage(message);
    } finally {
      setIsClearingRun(false);
    }
  }

  useEffect(() => {
    void Promise.all([loadPreview(simulationDate), loadPublishRuns(), loadRuntimeStatus()]);
  }, []);

  return (
    <main>
      <h1 style={{ marginBottom: 8 }}>Social Admin</h1>
      <p style={{ marginTop: 0, color: "#444" }}>
        Automated carousel posts run daily at <strong>8:00 AM America/Toronto</strong>.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <span
          style={{
            padding: "4px 8px",
            border: "1px solid #ccc",
            borderRadius: 4,
            background: isDryRun ? "#fff3cd" : "#d1e7dd",
          }}
        >
          Mode: {isDryRun === null ? "Unknown" : isDryRun ? "DRY_RUN (safe testing)" : "LIVE publishing"}
        </span>
        <span
          style={{
            padding: "4px 8px",
            border: "1px solid #ccc",
            borderRadius: 4,
            background: hasAlertWebhook ? "#d1e7dd" : "#fff3cd",
          }}
        >
          Alerts: {hasAlertWebhook === null ? "Unknown" : hasAlertWebhook ? "Webhook configured" : "No webhook"}
        </span>
      </div>

      <section style={{ background: "#fff", border: "1px solid #ddd", padding: 16, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Controls</h2>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "end" }}>
          <label>
            Simulate Date
            <br />
            <input type="date" value={simulationDate} onChange={(event) => setSimulationDate(event.target.value)} />
          </label>

          <label>
            Admin Secret (optional in local dev)
            <br />
            <input
              type="password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              style={{ width: 280 }}
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={forceRun} onChange={(event) => setForceRun(event.target.checked)} />
            Force rerun date
          </label>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" disabled={isLoadingPreview} onClick={() => void loadPreview(simulationDate)}>
            {isLoadingPreview ? "Loading Preview..." : "Preview Scheduled Post"}
          </button>
          <button type="button" disabled={isPublishingDate} onClick={() => void runPublishForDate()}>
            {isPublishingDate ? "Running..." : "Run Scheduled Post (Test Date)"}
          </button>
          <button type="button" disabled={isPublishingToday} onClick={() => void runPublishToday()}>
            {isPublishingToday ? "Publishing..." : "Publish Today Now"}
          </button>
          <button type="button" disabled={isClearingRun} onClick={() => void clearRunForDate()}>
            {isClearingRun ? "Clearing..." : "Clear Selected Date Lock"}
          </button>
          <button type="button" disabled={isLoadingRuns} onClick={() => void loadPublishRuns()}>
            {isLoadingRuns ? "Refreshing..." : "Refresh Run History"}
          </button>
        </div>

        {statusMessage ? <p style={{ marginBottom: 0, marginTop: 12 }}>{statusMessage}</p> : null}
      </section>

      <section style={{ background: "#fff", border: "1px solid #ddd", padding: 16, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Scheduled Preview</h2>
        <p style={{ marginTop: 0, color: "#666" }}>{previewHeader}</p>

        {!preview ? (
          <p>No preview loaded.</p>
        ) : (
          <>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              {preview.media_urls.map((url, index) => (
                <div key={`${url}-${index}`} style={{ border: "1px solid #ddd", padding: 8 }}>
                  <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>Slide {index + 1}</div>
                  <img src={url} alt={`Slide ${index + 1}`} style={{ width: "100%", display: "block" }} />
                </div>
              ))}
            </div>

            <h3 style={{ marginBottom: 8, marginTop: 16 }}>Caption</h3>
            <pre style={{ whiteSpace: "pre-wrap", background: "#f8f8f8", padding: 12, border: "1px solid #ddd" }}>
              {preview.caption}
            </pre>
          </>
        )}

        <h3 style={{ marginBottom: 8, marginTop: 16 }}>Selected Date Existing Run</h3>
        {!existingRun ? (
          <p style={{ marginTop: 0 }}>No run record for this date.</p>
        ) : (
          <div style={{ background: "#f8f8f8", border: "1px solid #ddd", padding: 12 }}>
            <div>Status: {existingRun.status}</div>
            <div>Run Date: {existingRun.run_date}</div>
            <div>Weekday: {existingRun.weekday_key}</div>
            <div>Instagram Media ID: {existingRun.ig_media_id ?? "-"}</div>
            <div>Error: {existingRun.error_message ?? "-"}</div>
            <div>Updated At: {formatTimestamp(existingRun.created_at)}</div>
          </div>
        )}
      </section>

      <section style={{ background: "#fff", border: "1px solid #ddd", padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Last Run History</h2>
        {runs.length === 0 ? (
          <p>No publish runs yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 760 }}>
              <thead>
                <tr>
                  <th align="left">Date</th>
                  <th align="left">Weekday</th>
                  <th align="left">Status</th>
                  <th align="left">IG Media ID</th>
                  <th align="left">Error</th>
                  <th align="left">Created</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>{formatRunDate(run.run_date)}</td>
                    <td>{run.weekday_key}</td>
                    <td>{run.status}</td>
                    <td>{run.ig_media_id ?? "-"}</td>
                    <td>{run.error_message ?? "-"}</td>
                    <td>{formatTimestamp(run.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {lastResult ? (
        <section style={{ marginTop: 16, background: "#fff", border: "1px solid #ddd", padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Last Publish Response</h2>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{JSON.stringify(lastResult, null, 2)}</pre>
        </section>
      ) : null}
    </main>
  );
}
