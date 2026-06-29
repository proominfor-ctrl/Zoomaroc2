import {
  AdminEnv,
  PagesFunction,
  deleteFirebaseAuthUser,
  firestoreFetch,
  jsonResponse,
  requireAdmin,
} from "../_shared";

type Params = {
  userId: string;
};

export const onRequestDelete: PagesFunction<AdminEnv, Params> = async ({ request, env, params }) => {
  try {
    const admin = await requireAdmin(env, request);
    if (admin.error) return admin.error;

    const userId = params.userId;
    if (!userId) return jsonResponse({ error: "User ID is required" }, 400);
    if (admin.uid === userId) return jsonResponse({ error: "Admins cannot delete themselves." }, 400);

    await deleteFirebaseAuthUser(env, userId);
    await firestoreFetch(env, `/users/${encodeURIComponent(userId)}`, { method: "DELETE" });

    return jsonResponse({ message: `User ${userId} has been permanently deleted.` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete user";
    return jsonResponse({ error: message }, 500);
  }
};

export const onRequestOptions: PagesFunction = () =>
  new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
