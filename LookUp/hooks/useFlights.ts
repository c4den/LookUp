// hooks/useFlights.ts

import { useState, useEffect, useCallback } from "react";
import Constants from "expo-constants";
import * as Location from "expo-location";

export interface Flight {
  id: string;
  ident: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  airline: string;
}

export type Query = {
  flightNum?: string;
  origin?: string;
  destination?: string;
};

const BASE_URL =
  "https://fr24api.flightradar24.com/api/live/flight-positions/full";
// how many degrees around the user’s location
const DEFAULT_DELTA = 1.5;

export function useFlights(query: Query = {}, autoRefreshMs = 60000) {
  const { flightNum, origin, destination } = query;

  const [data, setData] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userBounds, setUserBounds] = useState<string | null>(null);

  // 1) On mount, request location and compute the bounding box
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission denied");
        return;
      }
      try {
        const { coords } = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = coords;
        const d = DEFAULT_DELTA;
        const north = latitude + d;
        const south = latitude - d;
        const west = longitude - d;
        const east = longitude + d;
        // FR24 expects: north,south,west,east
        const boundsStr =
          `${north.toFixed(6)},${south.toFixed(6)},${west.toFixed(6)},${east.toFixed(6)}`;
        console.log("[useFlights] computed bounds:", boundsStr);
        setUserBounds(boundsStr);
      } catch (e) {
        console.warn("[useFlights] location error:", e);
        setError("Failed to get current location");
      }
    })();
  }, []);

  // 2) Fetch flights based on bounds or explicit queries
  const fetchFlights = useCallback(async () => {
    // wait until we have bounds (unless specific query)
    if (!flightNum && !(origin && destination) && !userBounds) {
      return;
    }

    console.log("[useFlights] using bounds:", userBounds);
    setLoading(true);
    setError(null);

    // choose the parameter
    let param: string;
    if (flightNum) {
      param = `flights=${encodeURIComponent(flightNum)}`;
    } else if (origin && destination) {
      param = `routes=${encodeURIComponent(origin)}-${encodeURIComponent(
        destination
      )}`;
    } else {
      // fall back to computed bounds
      param = `bounds=${userBounds}`;
    }

    const url = `${BASE_URL}?${param}`;
    const authHeader = `Bearer ${
      Constants.manifest?.extra?.FR24_API_KEY ??
      Constants.expoConfig?.extra?.FR24_API_KEY ??
      ""
    }`;

    try {
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Accept-Version": "v1",
          Authorization: authHeader,
        },
      });
      const json = await resp.json();

      if (!resp.ok) {
        const msg = json?.message || resp.statusText;
        setError(msg);
        setData([]);
      } else if (Array.isArray(json.data)) {
        const flights: Flight[] = json.data.map((f: any) => ({
          id: f.fr24_id ?? "",
          ident: f.flight ?? "",
          origin: f.orig_iata ?? "",
          destination: f.dest_iata ?? "",
          departureTime: f.timestamp ?? "",
          arrivalTime: f.eta ?? "",
          airline:
            f.operating_as || f.painted_as || f.callsign || "",
        }));
        setData(flights);
      } else {
        setData([]);
      }
    } catch (e: any) {
      console.error("[useFlights] fetch error", e);
      setError(e.message || "Fetch error");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [flightNum, origin, destination, userBounds]);

  // trigger fetch when ready
  useEffect(() => {
    fetchFlights();
  }, [fetchFlights]);

  // polling
  useEffect(() => {
    const iv = setInterval(fetchFlights, autoRefreshMs);
    return () => clearInterval(iv);
  }, [fetchFlights, autoRefreshMs]);

  return { data, loading, error, refetch: fetchFlights };
}
