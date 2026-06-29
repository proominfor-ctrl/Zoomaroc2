type PagesContext<Env = Record<string, string>, Params = Record<string, string>> = {
  request: Request;
  env: Env;
  params: Params;
};

export type PagesFunction<Env = Record<string, string>, Params = Record<string, string>> = (
  context: PagesContext<Env, Params>,
) => Response | Promise<Response>;

export type AdminEnv = {
  FIREBASE_API_KEY?: string;
  FIREBASE_ADMIN_CREDENTIALS?: string;
  FIRESTORE_DATABASE_ID?: string;
};

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
};

type FirebaseLookupResponse = {
  users?: Array<{ localId?: string }>;
};

type FirestoreValue = {
  stringValue?: string;
  booleanValue?: boolean;
  timestampValue?: string;
  integerValue?: string;
};

type FirestoreDocument = {
  name?: string;
  fields?: Record<string, FirestoreValue>;
};

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function cleanEnvValue(value: string | undefined) {
  return value?.trim().replace(/^['"]|['"]$/g, "");
}

export function getServiceAccount(env: AdminEnv): ServiceAccount {
  const credentials = cleanEnvValue(env.FIREBASE_ADMIN_CREDENTIALS);
  if (!credentials) {
    throw new Error("Missing Cloudflare environment variable: FIREBASE_ADMIN_CREDENTIALS");
  }

  const serviceAccount = JSON.parse(credentials) as ServiceAccount;
  if (!serviceAccount.client_email || !serviceAccount.private_key || !serviceAccount.project_id) {
    throw new Error("FIREBASE_ADMIN_CREDENTIALS must contain client_email, private_key, and project_id");
  }

  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  return serviceAccount;
}

function base64UrlEncode(input: string | ArrayBuffer) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function importPrivateKey(privateKey: string) {
  const pem = privateKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binary = atob(pem);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return crypto.subtle.importKey(
    "pkcs8",
    bytes.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function createServiceJwt(serviceAccount: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const unsignedJwt = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claim))}`;
  const key = await importPrivateKey(serviceAccount.private_key);
  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    new TextEncoder().encode(unsignedJwt),
  );

  return `${unsignedJwt}.${base64UrlEncode(signature)}`;
}

export async function getAccessToken(env: AdminEnv) {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  const serviceAccount = getServiceAccount(env);
  const assertion = await createServiceJwt(serviceAccount);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const result = (await response.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description || "Failed to create Firebase admin access token");
  }

  cachedAccessToken = {
    token: result.access_token,
    expiresAt: Date.now() + (result.expires_in || 3600) * 1000,
  };
  return cachedAccessToken.token;
}

export async function verifyFirebaseToken(env: AdminEnv, request: Request) {
  const apiKey = cleanEnvValue(env.FIREBASE_API_KEY);
  if (!apiKey) {
    throw new Error("Missing Cloudflare environment variable: FIREBASE_API_KEY");
  }

  const token = request.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: token }),
  });

  if (!response.ok) return null;

  const result = (await response.json()) as FirebaseLookupResponse;
  return result.users?.[0]?.localId || null;
}

export function firestoreBaseUrl(env: AdminEnv) {
  const serviceAccount = getServiceAccount(env);
  const databaseId = cleanEnvValue(env.FIRESTORE_DATABASE_ID) || "(default)";
  return `https://firestore.googleapis.com/v1/projects/${serviceAccount.project_id}/databases/${encodeURIComponent(
    databaseId,
  )}/documents`;
}

export async function firestoreFetch(env: AdminEnv, path: string, init: RequestInit = {}) {
  const accessToken = await getAccessToken(env);
  const response = await fetch(`${firestoreBaseUrl(env)}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Firestore request failed with status ${response.status}`);
  }

  return response;
}

export async function requireAdmin(env: AdminEnv, request: Request) {
  const uid = await verifyFirebaseToken(env, request);
  if (!uid) {
    return { error: jsonResponse({ error: "Authentication required" }, 401), uid: null };
  }

  const response = await firestoreFetch(env, `/users/${encodeURIComponent(uid)}`);
  const userDoc = (await response.json()) as FirestoreDocument;
  if (userDoc.fields?.role?.stringValue !== "admin") {
    return { error: jsonResponse({ error: "Admin access required" }, 403), uid: null };
  }

  return { error: null, uid };
}

export async function countCollection(env: AdminEnv, collectionId: string, status?: string) {
  const structuredQuery: Record<string, unknown> = {
    from: [{ collectionId }],
  };

  if (status) {
    structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: "status" },
        op: "EQUAL",
        value: { stringValue: status },
      },
    };
  }

  const response = await firestoreFetch(env, ":runAggregationQuery", {
    method: "POST",
    body: JSON.stringify({
      structuredAggregationQuery: {
        structuredQuery,
        aggregations: [{ alias: "count", count: {} }],
      },
    }),
  });

  const result = (await response.json()) as Array<{
    result?: { aggregateFields?: { count?: { integerValue?: string } } };
  }>;
  return Number(result[0]?.result?.aggregateFields?.count?.integerValue || 0);
}

export async function patchUserDocument(env: AdminEnv, userId: string, disabled: boolean) {
  await firestoreFetch(
    env,
    `/users/${encodeURIComponent(userId)}?updateMask.fieldPaths=disabled&updateMask.fieldPaths=updatedAt`,
    {
      method: "PATCH",
      body: JSON.stringify({
        fields: {
          disabled: { booleanValue: disabled },
          updatedAt: { timestampValue: new Date().toISOString() },
        },
      }),
    },
  );
}

export async function updateFirebaseAuthUser(env: AdminEnv, userId: string, disabled: boolean) {
  const serviceAccount = getServiceAccount(env);
  const accessToken = await getAccessToken(env);
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${serviceAccount.project_id}/accounts:update`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ localId: userId, disableUser: disabled }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Firebase Auth update failed with status ${response.status}`);
  }
}

export async function deleteFirebaseAuthUser(env: AdminEnv, userId: string) {
  const serviceAccount = getServiceAccount(env);
  const accessToken = await getAccessToken(env);
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${serviceAccount.project_id}/accounts:delete`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ localId: userId }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    if (text.includes("USER_NOT_FOUND")) return;
    throw new Error(text || `Firebase Auth delete failed with status ${response.status}`);
  }
}
