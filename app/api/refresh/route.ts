import "server-only";
import { NextResponse } from "next/server";
import { dispatchWorkflow, hasActiveRun } from "@/lib/github-actions-client";
import { extractBearerToken, secretsMatch } from "@/lib/auth-helpers";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ROUTES } = require("../../../src/browser/navigation/router");

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const expectedSecret = process.env.REFRESH_TRIGGER_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      { error: "REFRESH_TRIGGER_SECRET is not configured on the server." },
      { status: 500 }
    );
  }

  const provided = extractBearerToken(request.headers.get("authorization"));

  if (!provided || !secretsMatch(provided, expectedSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { route?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const route = body.route;
  const knownRoutes = Object.keys(ROUTES);
  if (!route || !knownRoutes.includes(route)) {
    return NextResponse.json(
      { error: `route must be one of: ${knownRoutes.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    // Practical anti-duplicate-trigger guard, not the security boundary
    // (the secret above is). Errs toward allowing the trigger if the
    // check itself fails - see hasActiveRun()'s fail-open comment.
    if (await hasActiveRun()) {
      return NextResponse.json(
        { error: "An automation run is already in progress. Try again once it finishes." },
        { status: 409 }
      );
    }

    await dispatchWorkflow({ route, triggeredBy: "api" });

    return NextResponse.json({ status: "started", route });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to trigger the workflow." },
      { status: 502 }
    );
  }
}
