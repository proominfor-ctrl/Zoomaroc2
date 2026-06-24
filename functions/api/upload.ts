type PagesFunction<Env = Record<string, string>> = (context: {
  request: Request;
  env: Env;
}) => Response | Promise<Response>;

type Env = {
  FIREBASE_API_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_STORAGE_BUCKET?: string;
};

const allowedFolders = new Set(["listings", "profiles", "hero", "health", "coupling", "coupling_res"]);
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function sanitizeFileName(fileName: string) {
  return fileName.split(/[\\/]/).pop()?.replace(/[^a-zA-Z0-9._-]/g, "-") || "upload";
}

function sanitizeStorageFolder(folder: unknown) {
  if (typeof folder !== "string") return null;

  const sanitizedFolder = folder
    .split("/")
    .map((part) => sanitizeFileName(part))
    .filter(Boolean)
    .join("/");

  return allowedFolders.has(sanitizedFolder) ? sanitizedFolder : null;
}

async function verifyFirebaseToken(token: string, apiKey: string) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: token }),
  });

  if (!response.ok) return null;

  const result = (await response.json()) as { users?: Array<{ localId?: string }> };
  return result.users?.[0]?.localId || null;
}

async function ensureBucket(env: Env, bucket: string) {
  const baseUrl = `${env.SUPABASE_URL}/storage/v1`;
  const headers = {
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    apikey: env.SUPABASE_SERVICE_ROLE_KEY || "",
  };

  const existingBucket = await fetch(`${baseUrl}/bucket/${encodeURIComponent(bucket)}`, { headers });
  if (existingBucket.ok) return;

  if (existingBucket.status !== 404) {
    throw new Error(`Supabase bucket check failed with status ${existingBucket.status}`);
  }

  const createdBucket = await fetch(`${baseUrl}/bucket`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: bucket,
      name: bucket,
      public: true,
      file_size_limit: 10 * 1024 * 1024,
      allowed_mime_types: Array.from(allowedMimeTypes),
    }),
  });

  if (!createdBucket.ok && createdBucket.status !== 409) {
    const errorText = await createdBucket.text();
    throw new Error(errorText || `Supabase bucket create failed with status ${createdBucket.status}`);
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const missingEnv = ["FIREBASE_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter(
      (key) => !env[key as keyof Env],
    );

    if (missingEnv.length > 0) {
      return jsonResponse(
        { error: `Missing Cloudflare environment variables for upload: ${missingEnv.join(", ")}` },
        500,
      );
    }

    const token = request.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    const uid = await verifyFirebaseToken(token, env.FIREBASE_API_KEY);
    if (!uid) {
      return jsonResponse({ error: "Invalid authentication token" }, 401);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const folder = sanitizeStorageFolder(formData.get("folder"));

    if (!(file instanceof File)) {
      return jsonResponse({ error: "No file uploaded" }, 400);
    }

    if (!folder) {
      return jsonResponse({ error: "Invalid upload folder" }, 400);
    }

    if (!allowedMimeTypes.has(file.type)) {
      return jsonResponse({ error: "Only JPEG, PNG, WebP, and GIF images are allowed" }, 400);
    }

    if (file.size > 10 * 1024 * 1024) {
      return jsonResponse({ error: "File size must be less than 10MB" }, 400);
    }

    const bucket = env.SUPABASE_STORAGE_BUCKET || "images";
    await ensureBucket(env, bucket);

    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}-${sanitizeFileName(file.name)}`;
    const uploadUrl = `${env.SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${fileName}`;

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": file.type,
        "x-upsert": "false",
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(errorText || `Supabase upload failed with status ${uploadResponse.status}`);
    }

    const publicUrl = `${env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;
    return jsonResponse({ url: publicUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload image";
    return jsonResponse({ error: message }, 500);
  }
};

export const onRequestOptions: PagesFunction = () =>
  new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
