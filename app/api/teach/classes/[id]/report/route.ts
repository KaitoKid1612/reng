import { authorizeRead, errorResponse, jsonResponse } from "@/lib/server/api";
import { getClassCsv } from "@/lib/server/reports";

interface ReportRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: ReportRouteContext) {
  const auth = await authorizeRead();
  if (auth.response) {
    return auth.response;
  }
  if (auth.account.role !== "teacher") {
    return jsonResponse({ code: "not_found" }, 404);
  }
  try {
    const { id } = await params;
    const { className, csv } = await getClassCsv(auth.account.id, id, new Date());
    const fileName = `reng-${className}.csv`;
    return new Response(csv, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reng-report.csv"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
