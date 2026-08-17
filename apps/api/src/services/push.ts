import { GoogleAuth } from "google-auth-library";
import { env, isProduction } from "../config/env";
import { prisma } from "../config/prisma";

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

let cachedAuth: GoogleAuth | null = null;
let cachedProjectId: string | null = null;

function getAuth(): { auth: GoogleAuth; projectId: string } | null {
  if (!env.FCM_SERVICE_ACCOUNT_JSON) return null;
  if (cachedAuth && cachedProjectId) return { auth: cachedAuth, projectId: cachedProjectId };

  const credentials = JSON.parse(env.FCM_SERVICE_ACCOUNT_JSON) as ServiceAccount;
  cachedAuth = new GoogleAuth({
    credentials: { client_email: credentials.client_email, private_key: credentials.private_key },
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });
  cachedProjectId = credentials.project_id;
  return { auth: cachedAuth, projectId: cachedProjectId };
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

async function sendToToken(token: string, payload: PushPayload): Promise<boolean> {
  const configured = getAuth();

  if (!configured) {
    if (isProduction) throw new Error("FCM_SERVICE_ACCOUNT_JSON is not configured");
    console.log(`[dev-push] would send to token ${token.slice(0, 12)}…: "${payload.title}" — "${payload.body}"`);
    return true;
  }

  const { auth, projectId } = configured;
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken.token}` },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: payload.title, body: payload.body },
        data: payload.data ?? {},
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error(`FCM send failed for token ${token.slice(0, 12)}…: ${response.status} ${errorBody}`);
    return false;
  }
  return true;
}

/** Sends a push to every device the user has registered. Best-effort: a
 * push failure never blocks the caller — the in-app Notification row (see
 * services/notifications.ts) is the source of truth regardless of whether
 * the OS push was delivered. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const devices = await prisma.device.findMany({ where: { userId } });
  await Promise.all(devices.map((device) => sendToToken(device.pushToken, payload).catch(() => false)));
}
