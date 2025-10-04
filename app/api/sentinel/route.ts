import { NextResponse } from "next/server";
import axios from "axios";
import { Feature } from "geojson";

interface SentinelRequestBody {
  aoi: Feature;
  startDate: string;
  endDate: string;
}

// This is a placeholder for the actual Copernicus API authentication
async function getCopernicusToken() {
  // In a real application, you would implement OAuth2 client credentials flow
  // to get a token from the Copernicus Data Space Ecosystem.
  // For now, we'll use a placeholder.
  const clientId = process.env.COPERNICUS_CLIENT_ID;
  const clientSecret = process.env.COPERNICUS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn(
      "Copernicus credentials are not set. Using placeholder token."
    );
    return "dummy-token";
  }

  try {
    const response = await axios.post(
      "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error("Error getting Copernicus token:", error);
    throw new Error("Failed to authenticate with Copernicus API");
  }
}

export async function POST(request: Request) {
  try {
    const { aoi, startDate, endDate }: SentinelRequestBody =
      await request.json();

    if (!aoi || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required parameters: aoi, startDate, endDate" },
        { status: 400 }
      );
    }

    const token = await getCopernicusToken();

    const searchBody = {
      collections: ["sentinel-2-l2a"],
      datetime: `${startDate}T00:00:00Z/${endDate}T23:59:59Z`,
      intersects: aoi.geometry,
      query: {
        "eo:cloud_cover": {
          lt: 20,
        },
      },
      limit: 10,
    };

    const response = await axios.post(
      "https://catalogue.dataspace.copernicus.eu/api/v1/search",
      searchBody,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return NextResponse.json({ stacItems: response.data.features });
  } catch (error) {
    console.error("Sentinel API error:", error);
    return NextResponse.json(
      { error: "Error fetching data from Copernicus STAC API" },
      { status: 500 }
    );
  }
}
