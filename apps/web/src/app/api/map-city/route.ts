import { NextRequest, NextResponse } from "next/server";
import { resolveCityLocation } from "@/lib/city-location";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const city = params.get("city") ?? "";
  const region = params.get("region") ?? "";
  const country = params.get("country") ?? "";
  if (
    !city.trim() ||
    city.length > 150 ||
    region.length > 150 ||
    country.length > 10
  ) {
    return NextResponse.json({ location: null }, { status: 400 });
  }
  return NextResponse.json(
    { location: resolveCityLocation({ city, region, country }) },
    {
      headers: { "Cache-Control": "public, max-age=86400" },
    },
  );
}
