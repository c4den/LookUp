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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

// Map of IATA codes to country codes for flags
const AIRPORT_TO_COUNTRY: Record<string, string> = {
  BED: "us",
  PBI: "us",
  JFK: "us",
  LAX: "us",
  LHR: "gb",
  CDG: "fr",
  FRA: "de",
  DXB: "ae",
  SYD: "au",
  // add more mappings as needed
};

type Params = {
  ident?: string;
  origin?: string;
  destination?: string;
  arrivalTime?: string;
  airline?: string;
};

export default function FlightDetails() {
  const router = useRouter();
  const { ident, origin, destination, arrivalTime, airline } =
    useLocalSearchParams<Params>();

  // Format ISO arrivalTime to a friendly string
  const fmtDateTime = (iso?: string) => {
    if (!iso) return "—";
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) return "—";
    return dt.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const originCountry = origin
    ? AIRPORT_TO_COUNTRY[origin.toUpperCase()]
    : undefined;
  const destCountry = destination
    ? AIRPORT_TO_COUNTRY[destination.toUpperCase()]
    : undefined;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Flight #{ident ?? "—"}</Text>
        <View style={styles.spacer} />
      </View>

      {/* Origin Section */}
      <View style={styles.section}>
        <Text style={styles.label}>Origin</Text>
        <View style={styles.row}>
          <Text style={styles.value}>{origin ?? "—"}</Text>
          {originCountry && (
            <Image
              source={{ uri: `https://flagcdn.com/w80/${originCountry}.png` }}
              style={styles.flag}
            />
          )}
        </View>
      </View>

      {/* Destination Section */}
      <View style={styles.section}>
        <Text style={styles.label}>Destination</Text>
        <View style={styles.row}>
          <Text style={styles.value}>{destination ?? "—"}</Text>
          {destCountry && (
            <Image
              source={{ uri: `https://flagcdn.com/w80/${destCountry}.png` }}
              style={styles.flag}
            />
          )}
        </View>
        <Text style={styles.subValue}>
          Estimated arrival: {fmtDateTime(arrivalTime)}
        </Text>
      </View>

      {/* Airline Section */}
      <View style={styles.section}>
        <Text style={styles.label}>Airline</Text>
        <Text style={styles.subValue}>{airline ?? "—"}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E1E1E",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 15,
  },
  closeButton: { padding: 10 },
  closeText: { color: "#fff", fontSize: 24, marginLeft: 14 },
  title: { color: "#fff", fontSize: 28, fontWeight: "bold" },
  spacer: { width: 34 },
  section: {
    backgroundColor: "#333",
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    marginHorizontal: 14,
  },
  label: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
  },
  row: { flexDirection: "row", alignItems: "center" },
  value: { color: "#fff", fontSize: 18 },
  subValue: { color: "#ccc", fontSize: 16, marginTop: 5 },
  flag: {
    width: 40,
    height: 25,
    marginLeft: 10,
    borderRadius: 3,
  },
});
