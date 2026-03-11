// ===========================================
// HubSpot API Client
// ===========================================
// Handles OAuth flow, token management, and all HubSpot API calls.
// Uses the v4 Automation API for workflow data.

import { prisma } from "./prisma";
import { encrypt, decrypt } from "./encryption";
import type {
  HubSpotFlowSummary,
  HubSpotFlowDetail,
  HubSpotTokenResponse,
} from "@/types";

const HUBSPOT_AUTH_URL = "https://app.hubspot.com/oauth/authorize";
const HUBSPOT_TOKEN_URL = "https://api.hubapi.com/oauth/v1/token";
const HUBSPOT_API_BASE = "https://api.hubapi.com";

// Required OAuth scopes
const SCOPES = [
  "automation",
  "crm.objects.contacts.read",
  "crm.schemas.contacts.read",
  "crm.objects.companies.read",
  "crm.objects.deals.read",
  "content",
  "crm.lists.read",
  "tickets",
];

const OPTIONAL_SCOPES: string[] = [];

// --- OAuth ---

/**
 * Generate the HubSpot OAuth authorization URL.
 * Redirects the user to HubSpot to grant access.
 */
export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.HUBSPOT_CLIENT_ID!,
    redirect_uri: process.env.HUBSPOT_REDIRECT_URI!,
    scope: SCOPES.join(" "),
  });

  return `${HUBSPOT_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 * Called from the OAuth callback handler.
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<HubSpotTokenResponse> {
  const response = await fetch(HUBSPOT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.HUBSPOT_CLIENT_ID!,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
      redirect_uri: process.env.HUBSPOT_REDIRECT_URI!,
      code,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`HubSpot OAuth error: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Refresh an expired access token using the refresh token.
 */
async function refreshAccessToken(
  refreshToken: string
): Promise<HubSpotTokenResponse> {
  const response = await fetch(HUBSPOT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.HUBSPOT_CLIENT_ID!,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`HubSpot token refresh error: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Get a valid access token for a portal, refreshing if expired.
 * Updates the database with new tokens if refreshed.
 */
export async function getValidAccessToken(portalId: string): Promise<string> {
  const portal = await prisma.portal.findUniqueOrThrow({
    where: { id: portalId },
  });

  const now = new Date();
  const tokenExpiry = new Date(portal.tokenExpiresAt);

  // If token is still valid (with 5-minute buffer), use it
  if (tokenExpiry > new Date(now.getTime() + 5 * 60 * 1000)) {
    return decrypt(portal.accessToken);
  }

  // Token expired or about to expire - refresh it
  const decryptedRefreshToken = decrypt(portal.refreshToken);
  const tokenResponse = await refreshAccessToken(decryptedRefreshToken);

  // Update the stored tokens
  await prisma.portal.update({
    where: { id: portalId },
    data: {
      accessToken: encrypt(tokenResponse.access_token),
      refreshToken: encrypt(tokenResponse.refresh_token),
      tokenExpiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
    },
  });

  return tokenResponse.access_token;
}

/**
 * Save a new portal connection after OAuth.
 * Returns the portal's internal ID.
 */
export async function savePortalConnection(
  tokenResponse: HubSpotTokenResponse
): Promise<string> {
  // Get portal info from the access token
  const portalInfo = await getPortalInfo(tokenResponse.access_token);

  const portal = await prisma.portal.upsert({
    where: { hubspotPortalId: portalInfo.portalId.toString() },
    update: {
      accessToken: encrypt(tokenResponse.access_token),
      refreshToken: encrypt(tokenResponse.refresh_token),
      tokenExpiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
      name: portalInfo.portalName,
    },
    create: {
      hubspotPortalId: portalInfo.portalId.toString(),
      name: portalInfo.portalName,
      accessToken: encrypt(tokenResponse.access_token),
      refreshToken: encrypt(tokenResponse.refresh_token),
      tokenExpiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
    },
  });

  return portal.id;
}

// --- Portal Info ---

interface PortalInfo {
  portalId: number;
  portalName: string;
}

async function getPortalInfo(accessToken: string): Promise<PortalInfo> {
  const response = await hubspotFetch(
    "/oauth/v1/access-tokens/" + accessToken,
    accessToken
  );
  return {
    portalId: response.hub_id,
    portalName: response.hub_domain || `Portal ${response.hub_id}`,
  };
}

// --- Workflow API Calls ---

/**
 * Fetch all workflows (metadata only) from a portal.
 * Uses GET /automation/v4/flows
 */
export async function fetchAllWorkflows(
  portalId: string
): Promise<HubSpotFlowSummary[]> {
  const accessToken = await getValidAccessToken(portalId);
  const workflows: HubSpotFlowSummary[] = [];
  let after: string | undefined;

  // Paginate through all workflows
  do {
    const params = new URLSearchParams();
    if (after) params.set("after", after);
    params.set("limit", "100");

    const response = await hubspotFetch(
      `/automation/v4/flows?${params.toString()}`,
      accessToken
    );

    if (response.results) {
      workflows.push(...response.results);
    }

    after = response.paging?.next?.after;
  } while (after);

  return workflows;
}

/**
 * Fetch full details for a single workflow.
 * Uses GET /automation/v4/flows/{flowId}
 */
export async function fetchWorkflowDetail(
  portalId: string,
  flowId: string
): Promise<HubSpotFlowDetail> {
  const accessToken = await getValidAccessToken(portalId);
  return hubspotFetch(`/automation/v4/flows/${flowId}`, accessToken);
}

/**
 * Batch fetch full details for multiple workflows.
 * Uses POST /automation/v4/flows/batch/read
 * Chunks into batches of 50 to stay within limits.
 */
export async function batchFetchWorkflowDetails(
  portalId: string,
  flowIds: string[],
  onProgress?: (completed: number, total: number) => Promise<void>
): Promise<HubSpotFlowDetail[]> {
  const accessToken = await getValidAccessToken(portalId);
  const allDetails: HubSpotFlowDetail[] = [];
  const BATCH_SIZE = 50;

  for (let i = 0; i < flowIds.length; i += BATCH_SIZE) {
    const batch = flowIds.slice(i, i + BATCH_SIZE);

    const response = await hubspotFetch(
      "/automation/v4/flows/batch/read",
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          inputs: batch.map((flowId) => ({
            flowId,
            type: "FLOW_ID",
          })),
        }),
      }
    );

    if (response.results) {
      allDetails.push(...response.results);
    }

    // Report progress
    if (onProgress) {
      await onProgress(Math.min(i + BATCH_SIZE, flowIds.length), flowIds.length);
    }

    // Rate limit: wait between batches
    if (i + BATCH_SIZE < flowIds.length) {
      await sleep(200);
    }
  }

  return allDetails;
}

/**
 * Fetch all properties for a given object type.
 * Uses GET /crm/v3/properties/{objectType}
 */
export async function fetchProperties(
  portalId: string,
  objectType: string
): Promise<Array<{ name: string; label: string; type: string; groupName: string }>> {
  const accessToken = await getValidAccessToken(portalId);
  const objectTypeMap: Record<string, string> = {
    CONTACT: "contacts",
    COMPANY: "companies",
    DEAL: "deals",
    TICKET: "tickets",
  };

  const objectTypePath = objectTypeMap[objectType] || objectType.toLowerCase();
  const response = await hubspotFetch(
    `/crm/v3/properties/${objectTypePath}`,
    accessToken
  );

  return response.results || [];
}

// --- HTTP Helper ---

/**
 * Make an authenticated request to the HubSpot API.
 * Handles rate limiting with exponential backoff.
 */
async function hubspotFetch(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<any> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${HUBSPOT_API_BASE}${endpoint}`;

  const maxRetries = 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    // Rate limited - exponential backoff
    if (response.status === 429) {
      if (attempt === maxRetries) {
        throw new Error(`HubSpot rate limit exceeded after ${maxRetries} retries`);
      }
      const retryAfter = parseInt(response.headers.get("Retry-After") || "1", 10);
      const backoffMs = Math.max(retryAfter * 1000, Math.pow(2, attempt) * 1000);
      console.warn(`Rate limited. Retrying in ${backoffMs}ms (attempt ${attempt + 1})`);
      await sleep(backoffMs);
      continue;
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `HubSpot API error ${response.status}: ${errorBody}`
      );
    }

    return response.json();
  }
}

/**
 * Fetch marketing email details by ID.
 * Tries multiple API endpoints since HubSpot has several.
 */
export async function fetchMarketingEmail(
  portalId: string,
  emailId: string
): Promise<{ id: string; name: string; subject: string } | null> {
  const accessToken = await getValidAccessToken(portalId);

  // Try v3 marketing emails API
  try {
    const response = await hubspotFetch(
      `/marketing/v3/emails/${emailId}`,
      accessToken
    );
    const from = response.from || {};
    // Extract body preview from content widgets
    let bodyPreview = "";
    try {
      const widgets = response.content?.widgets;
      if (widgets) {
        const firstWidget = Object.values(widgets)[0] as any;
        const html = firstWidget?.body?.html || "";
        // Strip HTML tags to get plain text preview
        bodyPreview = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
      }
    } catch {}
    return {
      id: response.id || emailId,
      name: response.name || response.title || `Email ${emailId}`,
      subject: response.subject || "",
      fromName: from.fromName || from.name || response.fromName || "",
      fromEmail: from.fromEmail || from.email || response.fromEmail || response.replyTo || "",
      replyTo: from.replyTo || response.replyTo || response.replyToEmail || "",
      previewText: response.previewText || bodyPreview || "",
    };
  } catch (err: any) {
    console.warn(`[Email] v3 API failed for ${emailId}:`, err.message?.slice(0, 200));
  }

  // Try legacy marketing-emails API
  try {
    const response = await hubspotFetch(
      `/marketing-emails/v1/emails/${emailId}`,
      accessToken
    );
    return {
      id: String(response.id || emailId),
      name: response.name || response.title || `Email ${emailId}`,
      subject: response.subject || "",
      fromName: response.fromName || response.from_name || "",
      fromEmail: response.fromEmail || response.from_email || response.replyTo || "",
      replyTo: response.replyTo || response.reply_to || "",
      previewText: response.previewText || response.preview_text || "",
    };
  } catch (err: any) {
    console.warn(`[Email] v1 API failed for ${emailId}:`, err.message?.slice(0, 200));
  }

  // Try marketing/v3/emails with query search
  try {
    const response = await hubspotFetch(
      `/marketing/v3/emails?limit=1&id=${emailId}`,
      accessToken
    );
    if (response.results && response.results.length > 0) {
      const email = response.results[0];
      return {
        id: String(email.id || emailId),
        name: email.name || email.title || `Email ${emailId}`,
        subject: email.subject || "",
        fromName: email.fromName || email.from?.name || "",
        fromEmail: email.fromEmail || email.from?.email || "",
        replyTo: email.replyTo || "",
        previewText: email.previewText || "",
      };
    }
  } catch (err: any) {
    console.warn(`[Email] v3 search failed for ${emailId}:`, err.message?.slice(0, 200));
  }

  console.warn(`[Email] All attempts failed for ${emailId}`);
  return null;
}

/**
 * Fetch list details by ID.
 * Tries v3 and v1 APIs.
 */
export async function fetchListDetails(
  portalId: string,
  listId: string
): Promise<{ id: string; name: string } | null> {
  const accessToken = await getValidAccessToken(portalId);

  // Try v3 lists API
  try {
    const response = await hubspotFetch(
      `/crm/v3/lists/${listId}`,
      accessToken
    );
    const list = response.list || response;
    return {
      id: String(list.listId || list.id || listId),
      name: list.name || `List ${listId}`,
    };
  } catch (err: any) {
    console.warn(`[List] v3 API failed for ${listId}:`, err.message?.slice(0, 200));
  }

  // Try legacy contacts lists API
  try {
    const response = await hubspotFetch(
      `/contacts/v1/lists/${listId}`,
      accessToken
    );
    return {
      id: String(response.listId || response.internalListId || listId),
      name: response.name || `List ${listId}`,
    };
  } catch (err: any) {
    console.warn(`[List] v1 API failed for ${listId}:`, err.message?.slice(0, 200));
  }

  console.warn(`[List] All attempts failed for ${listId}`);
  return null;
}

/**
 * Fetch all pipelines and their stages for a given object type.
 * Uses GET /crm/v3/pipelines/{objectType}
 */
export async function fetchPipelines(
  portalId: string,
  objectType: string
): Promise<Array<{
  id: string;
  label: string;
  displayOrder: number;
  stages: Array<{ id: string; label: string; displayOrder: number; metadata: any }>;
}>> {
  const accessToken = await getValidAccessToken(portalId);
  const objectTypeMap: Record<string, string> = {
    DEAL: "deals",
    TICKET: "tickets",
  };
  const path = objectTypeMap[objectType];
  if (!path) return [];

  try {
    const response = await hubspotFetch(
      `/crm/v3/pipelines/${path}`,
      accessToken
    );
    return (response.results || []).map((p: any) => ({
      id: p.id,
      label: p.label,
      displayOrder: p.displayOrder || 0,
      stages: (p.stages || []).map((s: any) => ({
        id: s.id,
        label: s.label,
        displayOrder: s.displayOrder || 0,
        metadata: s.metadata || null,
      })),
    }));
  } catch (err) {
    console.warn(`Failed to fetch pipelines for ${objectType}:`, err);
    return [];
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
