// app/flightDetails.tsx

import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFavorites } from "../context/FavoritesContext";

// Map of IATA codes to country codes for flags
const AIRPORT_TO_COUNTRY: Record<string, string> = {
  SJU: "pr",
  MCO: "us",
  // add more mappings as needed
};

type Params = {
  id?: string;
  flight?: string;
  callsign?: string;
  lat?: string;
  lon?: string;
  track?: string;
  alt?: string;
  gspeed?: string;
  vspeed?: string;
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
};

export default function FlightDetails() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const {
    id = "",
    flight = "",
    callsign = "",
    lat = "",
    lon = "",
    track = "",
    alt = "",
    gspeed = "",
    vspeed = "",
    squawk = "",
    timestamp = "",
    source = "",
    hex = "",
    type = "",
    reg = "",
    painted_as = "",
    operating_as = "",
    orig_iata = "",
    orig_icao = "",
    dest_iata = "",
    dest_icao = "",
    eta = "",
  } = params;

  const flightObj = { id, ident: flight, origin: orig_iata!, destination: dest_iata!, arrivalTime: eta!, airline: operating_as! };
  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = isFavorite(flightObj);

  // format date/time
  const fmt = (iso?: string) => {
    if (!iso) return "—";
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) return iso;
    return dt.toLocaleString();
  };

  const originCountry = AIRPORT_TO_COUNTRY[orig_iata!.toUpperCase()];
  const destCountry = AIRPORT_TO_COUNTRY[dest_iata!.toUpperCase()];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Flight {flight || callsign || "—"}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Route */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Route</Text>
          <Text style={styles.sectionText}>{orig_iata} ({orig_icao}) → {dest_iata} ({dest_icao})</Text>
        </View>
        {/* Timing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timing</Text>
          <Text style={styles.sectionText}>ETA: {fmt(eta)}</Text>
          <Text style={styles.sectionText}>Last Update: {fmt(timestamp)}</Text>
        </View>
        {/* Position & Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Position & Performance</Text>
          <Text style={styles.sectionText}>Lat/Lon: {lat}, {lon}</Text>
          <Text style={styles.sectionText}>Altitude: {alt} ft</Text>
          <Text style={styles.sectionText}>Ground Speed: {gspeed} kt</Text>
          <Text style={styles.sectionText}>Vertical Speed: {vspeed} ft/min</Text>
          <Text style={styles.sectionText}>Heading: {track}°</Text>
        </View>
        {/* Flight Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flight Details</Text>
          <Text style={styles.sectionText}>Type: {type}</Text>
          <Text style={styles.sectionText}>Registration: {reg}</Text>
          <Text style={styles.sectionText}>Squawk: {squawk}</Text>
          <Text style={styles.sectionText}>Source: {source}</Text>
          <Text style={styles.sectionText}>Hex: {hex}</Text>
          <Text style={styles.sectionText}>Painted As: {painted_as}</Text>
          <Text style={styles.sectionText}>Operating As: {operating_as}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: 
  { 
    flex: 1, 
    backgroundColor: 'black', 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, 
    justifyContent: "center", 
    marginTop: 48
  },
  header: 
  { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#000' 
  },
  iconBtn: 
  { 
    padding: 8 
  },
  title: 
  { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    flex: 1 
  },
  content: 
  { 
    padding: 16 
  },
  section: 
  { 
    marginBottom: 24, 
    backgroundColor: "#2a2a2a",
    padding: 14,
    borderRadius: 16,
  },
  sectionTitle: 
  { 
    color: '#fff', 
    fontSize: 28, 
    fontWeight: '600', 
    marginBottom: 8 
  },
  sectionText: 
  { 
    color: '#ccc', 
    fontSize: 16, 
    marginBottom: 4 
  },
});
