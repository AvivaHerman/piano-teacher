import type { APIRoute } from "astro";
import { members } from "@wix/members";
import { auth } from "@wix/essentials";

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const isEmail = q.includes("@");
    const query = auth.elevate(members.queryMembers)({
      fieldsets: ["FULL" as any],
    });

    let result: any;
    if (isEmail) {
      result = await query.eq("loginEmail", q).limit(5).find();
    } else {
      // Search by contact first name (falls back to last name on empty)
      const firstNameRes = await auth
        .elevate(members.queryMembers)({ fieldsets: ["FULL" as any] })
        .startsWith("contact.firstName", q)
        .limit(5)
        .find()
        .catch(() => null);
      const lastNameRes = await auth
        .elevate(members.queryMembers)({ fieldsets: ["FULL" as any] })
        .startsWith("contact.lastName", q)
        .limit(5)
        .find()
        .catch(() => null);
      // Merge + dedupe by member ID
      const all = [
        ...(firstNameRes?.items ?? []),
        ...(lastNameRes?.items ?? []),
      ];
      const seen = new Set<string>();
      result = { items: all.filter((m: any) => !seen.has(m._id) && seen.add(m._id)) };
    }

    const items: any[] = result?.items ?? [];
    const payload = items.map((m: any) => ({
      memberId: m._id,
      name:
        [m.contact?.firstName ?? m.profile?.firstName, m.contact?.lastName ?? m.profile?.lastName]
          .filter(Boolean)
          .join(" ") ||
        m.profile?.nickname ||
        m.loginEmail?.split("@")[0] ||
        "Member",
      email: m.loginEmail ?? "",
      avatarUrl: m.profile?.photo?.url ?? "",
    }));

    return new Response(JSON.stringify(payload), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[members/search] failed:", err?.message);
    return new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json" },
    });
  }
};
