import { requestLocation } from "../../../lib/request-location";

export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return Response.json(
    { location: requestLocation(request.headers) },
    {
      status: 200,
      headers: { "cache-control": "private, no-store" },
    },
  );
}
