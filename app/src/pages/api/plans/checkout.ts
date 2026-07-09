import type { APIRoute } from "astro";
import { redirects } from "@wix/redirects";
import { auth } from "@wix/essentials";

export const POST: APIRoute = async ({ request }) => {
  let planId: string | undefined;
  try {
    const body = await request.json();
    planId = body?.planId;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!planId) {
    return new Response(JSON.stringify({ error: "planId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const origin = new URL(request.url).origin;

  try {
    const { redirectSession } = await auth.elevate(
      redirects.createRedirectSession
    )({
      paidPlansCheckout: { planId },
      callbacks: {
        postFlowUrl: `${origin}/member`,
        thankYouPageUrl: `${origin}/member?plan=purchased`,
      },
    });

    if (!redirectSession?.fullUrl) {
      throw new Error("No redirect URL in response");
    }

    return new Response(JSON.stringify({ url: redirectSession.fullUrl }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[api/plans/checkout]", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Failed to create checkout session" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
