import {
  AdminEnv,
  PagesFunction,
  jsonResponse,
  patchUserDocument,
  requireAdmin,
  updateFirebaseAuthUser,
} from "../../_shared";

type Params = {
  userId: string;
  action: string;
};

export const onRequestPost: PagesFunction<AdminEnv, Params> = async ({ request, env, params }) => {
  try {
    const admin = await requireAdmin(env, request);
    if (admin.error) return admin.error;

    const { userId, action } = params;
    if (!userId) return jsonResponse({ error: "User ID is required" }, 400);
    if (action !== "ban" && action !== "unban") {
      return jsonResponse({ error: "Invalid action. Use ban or unban." }, 400);
    }
    if (admin.uid === userId) return jsonResponse({ error: "Admins cannot ban themselves." }, 400);

    const disabled = action === "ban";
    await updateFirebaseAuthUser(env, userId, disabled);
    await patchUserDocument(env, userId, disabled);

    return jsonResponse({ message: `User successfully ${action}ned.` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update user";
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
