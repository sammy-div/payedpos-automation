import "server-only";
import { NextResponse } from "next/server";
import fs from "node:fs";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const CONTENT_TYPES = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const url = new URL(request.url);
  const runId = url.searchParams.get("runId");
  const format = url.searchParams.get("format");

  if (!runId) {
    return NextResponse.json({ error: "runId is required." }, { status: 400 });
  }
  if (format !== "xlsx" && format !== "docx") {
    return NextResponse.json({ error: 'format must be "xlsx" or "docx".' }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  const { data: run, error: runError } = await supabase
    .from("automation_runs")
    .select("id, route, status, record_count, started_at, finished_at")
    .eq("id", runId)
    .maybeSingle();

  if (runError) {
    return NextResponse.json({ error: `Failed to look up run: ${runError.message}` }, { status: 500 });
  }
  if (!run) {
    return NextResponse.json({ error: `No run found with id ${runId}.` }, { status: 404 });
  }
  if (run.status !== "success") {
    return NextResponse.json(
      { error: `Run ${runId} did not complete successfully (status: ${run.status}); nothing to export.` },
      { status: 409 }
    );
  }

  const { data: records, error: recordsError } = await supabase
    .from("extracted_records")
    .select("data")
    .eq("run_id", runId);

  if (recordsError) {
    return NextResponse.json({ error: `Failed to load extracted rows: ${recordsError.message}` }, { status: 500 });
  }

  const rows = (records ?? []).map((record) => record.data as Record<string, string>);
  const title = `${run.route} Export`;
  const summary = `Live export from ${run.route}, extracted ${run.finished_at ?? run.started_at}`;

  // Both generators write to getConfig().outputDir, which reads
  // process.env.PAYEDPOS_OUTPUT_DIR fresh on every call (no caching) -
  // pointing it at Vercel's writable /tmp for the duration of this one
  // request is enough; nothing needs to persist past this response.
  process.env.PAYEDPOS_OUTPUT_DIR = "/tmp";

  let outputPath: string;
  try {
    if (format === "xlsx") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ExcelReportGenerator = require("../../../../src/reports/excel/report-generator");
      outputPath = await new ExcelReportGenerator().generate({ title, summary, rows });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const WordReportGenerator = require("../../../../src/reports/word/report-generator");
      outputPath = await new WordReportGenerator().generate({ title, summary, rows });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Report generation failed." },
      { status: 500 }
    );
  }

  const buffer = fs.readFileSync(outputPath);
  fs.rmSync(outputPath, { force: true });

  const fileName = `${run.route}-${(run.finished_at ?? run.started_at).replace(/[:.]/g, "-")}.${format}`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": CONTENT_TYPES[format],
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
