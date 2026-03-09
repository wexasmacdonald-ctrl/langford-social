import { after, NextResponse } from "next/server";
import nacl from "tweetnacl";
import { getRunDateForNow } from "@/lib/daily-deals";
import { getDiscordEnv } from "@/lib/env";
import { runScheduledPublish } from "@/lib/publisher";

export const dynamic = "force-dynamic";

type DiscordInteraction = {
  type?: number;
  data?: {
    name?: string;
    options?: Array<{
      name?: string;
      value?: unknown;
    }>;
  };
};

function hexToBytes(value: string): Uint8Array {
  if (value.length % 2 !== 0) {
    throw new Error("Invalid hex input length");
  }

  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }
  return bytes;
}

function verifyDiscordSignature(signature: string, timestamp: string, rawBody: string, publicKey: string): boolean {
  const message = new TextEncoder().encode(`${timestamp}${rawBody}`);
  const signatureBytes = hexToBytes(signature);
  const keyBytes = hexToBytes(publicKey);
  return nacl.sign.detached.verify(message, signatureBytes, keyBytes);
}

function getStringOption(interaction: DiscordInteraction, key: string): string | undefined {
  const match = interaction.data?.options?.find((option) => option.name === key);
  return typeof match?.value === "string" ? match.value : undefined;
}

function getBooleanOption(interaction: DiscordInteraction, key: string, fallback: boolean): boolean {
  const match = interaction.data?.options?.find((option) => option.name === key);
  return typeof match?.value === "boolean" ? match.value : fallback;
}

export async function POST(request: Request) {
  const discord = getDiscordEnv();
  if (!discord.DISCORD_INTERACTIONS_PUBLIC_KEY) {
    return NextResponse.json({ error: "Discord interaction key is not configured." }, { status: 503 });
  }

  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  if (!signature || !timestamp) {
    return NextResponse.json({ error: "Missing Discord signature headers." }, { status: 401 });
  }

  const rawBody = await request.text();
  let isValid = false;
  try {
    isValid = verifyDiscordSignature(signature, timestamp, rawBody, discord.DISCORD_INTERACTIONS_PUBLIC_KEY);
  } catch {
    isValid = false;
  }

  if (!isValid) {
    return NextResponse.json({ error: "Invalid request signature." }, { status: 401 });
  }

  let interaction: DiscordInteraction = {};
  try {
    interaction = JSON.parse(rawBody) as DiscordInteraction;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (interaction.type === 1) {
    return NextResponse.json({ type: 1 });
  }

  if (interaction.type !== 2) {
    return NextResponse.json({
      type: 4,
      data: { content: "Unsupported Discord interaction type.", flags: 64 },
    });
  }

  const commandName = interaction.data?.name?.toLowerCase();
  if (commandName !== "retrytoday") {
    return NextResponse.json({
      type: 4,
      data: { content: "Unknown command. Use /retrytoday.", flags: 64 },
    });
  }

  const requestedDate = getStringOption(interaction, "date");
  const force = getBooleanOption(interaction, "force", true);
  const runDate = requestedDate ?? getRunDateForNow();

  after(async () => {
    try {
      await runScheduledPublish({
        dateKey: requestedDate,
        force,
        mode: "manual",
      });
    } catch {
      return;
    }
  });

  return NextResponse.json({
    type: 4,
    data: {
      content: `Retry queued for ${runDate} (force=${force ? "true" : "false"}). Check admin history in about a minute.`,
      flags: 64,
    },
  });
}
