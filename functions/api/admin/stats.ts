import {
  AdminEnv,
  PagesFunction,
  countCollection,
  jsonResponse,
  requireAdmin,
} from "./_shared";

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  try {
    const admin = await requireAdmin(env, request);
    if (admin.error) return admin.error;

    const [
      users,
      listings,
      couplingCount,
      healthCount,
      lostFoundCount,
      pendingListings,
      pendingCoupling,
      pendingHealth,
      pendingLostFound,
      pendingReports,
    ] = await Promise.all([
      countCollection(env, "users"),
      countCollection(env, "listings"),
      countCollection(env, "coupling_offers"),
      countCollection(env, "health_posts"),
      countCollection(env, "lost_and_found_posts"),
      countCollection(env, "listings", "pending"),
      countCollection(env, "coupling_offers", "pending"),
      countCollection(env, "health_posts", "pending"),
      countCollection(env, "lost_and_found_posts", "pending"),
      countCollection(env, "reports", "pending"),
    ]);

    return jsonResponse({
      users,
      listings,
      couplingCount,
      healthCount,
      lostFoundCount,
      pendingListings,
      pendingCoupling,
      pendingHealth,
      pendingLostFound,
      pendingReports,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch admin stats";
    return jsonResponse({ error: message }, 500);
  }
};

export const onRequestOptions: PagesFunction = () =>
  new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
