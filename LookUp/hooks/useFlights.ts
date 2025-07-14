// hooks/useFlights.ts

import { useState, useEffect, useCallback } from "react";
import Constants from "expo-constants";
import * as Location from "expo-location";

export interface Flight {
  id: string;
  ident: string;
  origin: string;
  destination: string;
  arrivalTime: string; // raw ISO string
  airline: string;
}

export type Query = {
  flightNum?: string;
  origin?: string;
  destination?: string;
};

const BASE_URL =
  "https://fr24api.flightradar24.com/api/live/flight-positions/full";
const DEFAULT_DELTA = 1.5; // degrees padding around user location

export function useFlights(query: Query = {}, autoRefreshMs = 60000) {
  const { flightNum, origin, destination } = query;

  const [data, setData] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userBounds, setUserBounds] = useState<string | null>(null);

  // Compute user's bounding box on mount
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
        setUserBounds(
          `${north.toFixed(6)},${south.toFixed(6)},${west.toFixed(6)},${east.toFixed(6)}`
        );
      } catch {
        setError("Failed to get current location");
      }
    })();
  }, []);

  // Fetch flights when bounds or queries change
  const fetchFlights = useCallback(async () => {
    if (!flightNum && !(origin && destination) && !userBounds) return;

    setLoading(true);
    setError(null);

    // Build query param: flights > routes > geo-bounds
    let param: string;
    if (flightNum) {
      param = `flights=${encodeURIComponent(flightNum)}`;
    } else if (origin && destination) {
      param = `routes=${encodeURIComponent(origin)}-${encodeURIComponent(destination)}`;
    } else {
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
        setError(json?.message || resp.statusText);
        setData([]);
      } else if (Array.isArray(json.data)) {
        const flights: Flight[] = json.data.map((f: any) => ({
          id: f.fr24_id ?? "",
          ident: f.flight || f.callsign || "",
          origin: f.orig_iata ?? "",
          destination: f.dest_iata ?? "",
          arrivalTime: f.eta ?? "",
          airline: f.operating_as || f.painted_as || "",
        }));
        setData(flights);
      } else {
        setData([]);
      }
    } catch (e: any) {
      setError(e.message || "Fetch error");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [flightNum, origin, destination, userBounds]);

  // Initial and reactive fetch
  useEffect(() => {
    fetchFlights();
  }, [fetchFlights]);

  // Polling
  useEffect(() => {
    const iv = setInterval(fetchFlights, autoRefreshMs);
    return () => clearInterval(iv);
  }, [fetchFlights, autoRefreshMs]);

  return { data, loading, error, refetch: fetchFlights };
}
