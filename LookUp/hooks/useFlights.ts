// hooks/useFlights.ts

import { useState, useEffect, useCallback } from "react";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { useFlightRadius } from "../context/FlightRadiusContext";

/**
 * Detailed Flight type including all API fields
 */
export interface Flight {
  id: string;
  ident: string;
  origin: string;
  destination: string;
  arrivalTime: string;
  airline: string;
  callsign?: string;
  lat?: number;
  lon?: number;
  track?: number;
  alt?: number;
  gspeed?: number;
  vspeed?: number;
  squawk?: string;
  timestamp?: string;
  source?: string;
  hex?: string;
  type?: string;
  reg?: string;
  painted_as?: string;
  operating_as?: string;
  orig_iata?: string;
  orig_icao?: string;
  dest_iata?: string;
  dest_icao?: string;
  eta?: string;
}

export type Query = {
  flightNum?: string;
  origin?: string;
  destination?: string;
};

const BASE_URL =
  "https://fr24api.flightradar24.com/api/live/flight-positions/full";

/**
 * Returns four points (N, E, S, W) that are `distanceKm` away
 * from the given lat/lon. Uses the haversine formula.
 */
function getBoundingPoints(
  latitude: number,
  longitude: number,
  distanceKm: number
): { north: [number, number]; east: [number, number]; south: [number, number]; west: [number, number] } {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const R = 6371; // km
  const d = distanceKm / R;
  const lat1 = toRad(latitude);
  const lon1 = toRad(longitude);

  const destPoint = (bearingDeg: number): [number, number] => {
    const brng = toRad(bearingDeg);
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d) +
        Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
    );
    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
        Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
      );
    return [toDeg(lat2), toDeg(lon2)];
  };

  return {
    north: destPoint(0),
    east: destPoint(90),
    south: destPoint(180),
    west: destPoint(270),
  };
}

export function useFlights(query: Query = {}, autoRefreshMs = 60000) {
  const { flightNum, origin, destination } = query;
  const { flightRadius } = useFlightRadius();

  const [data, setData] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userBounds, setUserBounds] = useState<string | null>(null);

  // Compute bounds using user's location + flightRadius
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
        const bp = getBoundingPoints(latitude, longitude, flightRadius);
        const { north, south, west, east } = bp;
        const boundsStr = `${north[0].toFixed(3)},${south[0].toFixed(3)},${west[1].toFixed(3)},${east[1].toFixed(3)}`;
        setUserBounds(boundsStr);
      } catch {
        setError("Failed to get current location");
      }
    })();
  }, [flightRadius]);

  const fetchFlights = useCallback(async () => {
    if (!flightNum && !(origin && destination) && !userBounds) return;
    setLoading(true);
    setError(null);

    let param: string;
    if (flightNum) {
      param = `flights=${encodeURIComponent(flightNum)}`;
    } else if (origin && destination) {
      param = `routes=${encodeURIComponent(origin)}-${encodeURIComponent(destination)}`;
    } else {
      param = `bounds=${userBounds}`;
    }

    const url = `${BASE_URL}?${param}`;

    const auth = `Bearer ${
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
          Authorization: auth,
        },
      });
      const json = await resp.json();

      if (!resp.ok) {
        setError(json?.message || resp.statusText);
        setData([]);
      } else if (Array.isArray(json.data)) {
        setData(
          json.data.map((f: any) => ({
            id: f.fr24_id ?? "",
            ident: f.flight || f.callsign || "",
            origin: f.orig_iata ?? "",
            destination: f.dest_iata ?? "",
            arrivalTime: f.eta ?? "",
            airline: f.operating_as || f.painted_as || "",
            callsign: f.callsign,
            lat: f.lat,
            lon: f.lon,
            track: f.track,
            alt: f.alt,
            gspeed: f.gspeed,
            vspeed: f.vspeed,
            squawk: f.squawk,
            timestamp: f.timestamp,
            source: f.source,
            hex: f.hex,
            type: f.type,
            reg: f.reg,
            painted_as: f.painted_as,
            operating_as: f.operating_as,
            orig_iata: f.orig_iata,
            orig_icao: f.orig_icao,
            dest_iata: f.dest_iata,
            dest_icao: f.dest_icao,
            eta: f.eta,
          }))
        );
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

  // Initial fetch
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
