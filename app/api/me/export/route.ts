import { exportFileName } from "@/lib/data-export";
import { authorizeRead, errorResponse } from "@/lib/server/api";
import { buildDataExport } from "@/lib/server/data-export";
import { toStudyDay } from "@/lib/study-days";

// "Tải dữ liệu của tôi": the signed-in person's own data as a JSON file. Reading needs no CSRF
// guard: another site can make the browser request it but cannot read the answer.
export async function GET() {
  const auth = await authorizeRead();
  if (auth.response) {
    return auth.response;
  }
  try {
    const now = new Date();
    const data = await buildDataExport(auth.account, now);
    return new Response(`${JSON.stringify(data, null, 2)}\n`, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${exportFileName(toStudyDay(now))}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
