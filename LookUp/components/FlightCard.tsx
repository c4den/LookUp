// components/ui/FlightCard.tsx

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface FlightCardProps {
  ident: string;
  origin: string;
  destination: string;
  arrivalTime: string; // formatted ETA (e.g. "Jul 14, 2025 at 02:44 PM")
  airline: string;
  isFav: boolean;
  onToggleFav: () => void;
  onPress: () => void;
}

export default function FlightCard({
  ident,
  origin,
  destination,
  arrivalTime,
  airline,
  isFav,
  onToggleFav,
  onPress,
}: FlightCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.ident}>{ident}</Text>
        <View style={styles.headerRight}>
          <Text style={styles.airline}>{airline}</Text>
          <TouchableOpacity onPress={onToggleFav} style={styles.starButton}>
            <Ionicons
              name={isFav ? "star" : "star-outline"}
              size={20}
              color={isFav ? "#FFD700" : "#888"}
            />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.route}>{origin} → {destination}</Text>

      <View style={styles.footer}>
        <Text style={styles.arrivalLabel}>Estimated arrival:</Text>
        <Text style={styles.arrivalTime}>{arrivalTime}</Text>
        <Ionicons name="chevron-forward" size={20} color="#888" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  ident: { fontSize: 16, fontWeight: "600", color: "#fff" },
  airline: { fontSize: 14, color: "#888", marginRight: 8 },
  starButton: { padding: 4 },
  route: { fontSize: 14, color: "#ccc", marginBottom: 12 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
  },
  arrivalLabel: {
    fontSize: 14,
    color: "#ccc",
    marginRight: 4,
  },
  arrivalTime: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
    marginRight: 8,
  },
});
