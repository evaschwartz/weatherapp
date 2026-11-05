
const router = require("express").Router();

/* =========================
   MET NORWAY API
========================= */

const API_URL =
  "https://api.met.no/weatherapi/locationforecast/2.0/compact";

const USER_AGENT =
  "Weatherly/1.0 (https://github.com/evaschwartz/weatherapp; evaschwartz@live.dk)";

/* =========================
   DANISH CITIES
========================= */

const cities = [
  { name: "København", lat: 55.6761, lon: 12.5683 },
  { name: "Aarhus", lat: 56.1629, lon: 10.2039 },
  { name: "Odense", lat: 55.4038, lon: 10.4024 },
  { name: "Aalborg", lat: 57.0488, lon: 9.9217 },
  { name: "Vejle", lat: 55.7113, lon: 9.5364 },
  { name: "Kolding", lat: 55.4904, lon: 9.4722 },
  { name: "Svendborg", lat: 55.0598, lon: 10.6068 },
  { name: "Esbjerg", lat: 55.4765, lon: 8.4594 },
  { name: "Fredericia", lat: 55.5657, lon: 9.7526 },
  { name: "Horsens", lat: 55.8607, lon: 9.8503 }
];

/* =========================
   CACHE
========================= */

const cache = new Map();
const CACHE_DURATION = 20 * 60 * 1000;

/* =========================
   HELPERS
========================= */

function validateCoordinates(latInput, lonInput) {
  if (
    latInput === undefined ||
    lonInput === undefined ||
    String(latInput).trim() === "" ||
    String(lonInput).trim() === ""
  ) {
    return null;
  }

  const latitude = Number(latInput);
  const longitude = Number(lonInput);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    lat: Number(latitude.toFixed(4)),
    lon: Number(longitude.toFixed(4))
  };
}

/* =========================
   FETCH WEATHER DATA
========================= */

async function fetchWeather(lat, lon) {
  const url = new URL(API_URL);

  url.searchParams.set("lat", lat.toFixed(4));
  url.searchParams.set("lon", lon.toFixed(4));

  console.log("Henter vejr fra:", url.toString());

  const response = await fetch(url, {
    method: "GET",

    headers: {
      "User-Agent": USER_AGENT,
      "Accept": "application/json"
    },

    signal: AbortSignal.timeout(15000)
  });

  console.log("MET Norway status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();

    console.error("MET Norway fejl:", {
      status: response.status,
      body: errorText.slice(0, 500)
    });

    const error = new Error(
      `MET Norway returnerede HTTP ${response.status}`
    );

    error.status = response.status;

    throw error;
  }

  const json = await response.json();

  if (!Array.isArray(json.properties?.timeseries)) {
    throw new Error("Uventet svar fra vejr-API.");
  }

  return {
    updatedAt:
      json.properties.meta?.updated_at || null,

    timeseries: json.properties.timeseries.map(
      entry => {
        const details =
          entry.data.instant.details;

        return {
          time: entry.time,

          temperature:
            details.air_temperature,

          wind:
            details.wind_speed,

          humidity:
            details.relative_humidity,

          symbol:
            entry.data.next_1_hours?.summary
              ?.symbol_code ||
            entry.data.next_6_hours?.summary
              ?.symbol_code ||
            entry.data.next_12_hours?.summary
              ?.symbol_code ||
            "cloudy",

          precipitation:
            entry.data.next_1_hours?.details
              ?.precipitation_amount ??
            entry.data.next_6_hours?.details
              ?.precipitation_amount ??
            null
        };
      }
    )
  };
}

/* =========================
   GET AVAILABLE CITIES
========================= */

router.get("/cities", (req, res) => {
  res.json(cities);
});

/* =========================
   TEST API CONNECTION
========================= */

router.get("/test/connection", async (req, res) => {
  try {
    console.log("Tester MET Norway forbindelse...");

    const lat = 55.7113;
    const lon = 9.5364;

    const data = await fetchWeather(lat, lon);

    res.json({
      success: true,
      status: 200,
      message: "Forbindelsen til MET Norway virker!",
      location: "Vejle",
      temperature:
        data.timeseries[0]?.temperature ?? null,
      updatedAt: data.updatedAt
    });

  } catch (error) {
    console.error("API-test fejlede:", error);

    res.status(502).json({
      success: false,
      status: error.status || null,
      message: error.message
    });
  }
});

/* =========================
   GET WEATHER
========================= */

router.get("/", async (req, res) => {
  const coordinates = validateCoordinates(
    req.query.lat,
    req.query.lon
  );

  if (!coordinates) {
    return res.status(400).json({
      error: "Ugyldige koordinater."
    });
  }

  const { lat, lon } = coordinates;
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;

  // Returner cachede data
  const saved = cache.get(key);

  if (saved && saved.expires > Date.now()) {
    console.log("Bruger cache for:", key);
    return res.json(saved.data);
  }

  try {
    const data = await fetchWeather(lat, lon);

    // Gem vejrdata i cache
    cache.set(key, {
      data,
      expires: Date.now() + CACHE_DURATION
    });

    console.log("Vejrdata hentet:", key);

    res.json(data);

  } catch (error) {
    console.error("VEJR API FEJL:", error);

    res.status(502).json({
      error: "Vejrdata kunne ikke hentes lige nu.",
      details: error.message
    });
  }
});

module.exports = router;
