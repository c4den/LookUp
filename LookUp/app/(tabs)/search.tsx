// app/(tabs)/search.tsx

import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Modal,
  Pressable,
  ActionSheetIOS,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import FlightCard from "../../components/FlightCard";
import { useFlights, Flight } from "../../hooks/useFlights";
import { useFavorites } from "../../context/FavoritesContext";

const TIME_RANGES = [
  { label: "Morning (00:00–12:00)", value: "morning", start: 0, end: 11 },
  { label: "Afternoon (12:00–18:00)", value: "afternoon", start: 12, end: 17 },
  { label: "Evening (18:00–23:59)", value: "evening", start: 18, end: 23 },
];

export default function SearchScreen() {
  const router = useRouter();
  const { flightNumber } = useLocalSearchParams<{ flightNumber?: string }>();
  const [searchQuery, setSearchQuery] = useState(
    typeof flightNumber === "string" ? flightNumber : ""
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [originFilter, setOriginFilter] = useState("");
  const [destinationFilter, setDestinationFilter] = useState("");
  const [airlineFilter, setAirlineFilter] = useState("");
  const [arrivalRange, setArrivalRange] = useState("");

  // flight data + favorites
  const { data: flights = [], loading, error, refetch } = useFlights({}, 60000);
  const { isFavorite, toggleFavorite } = useFavorites();
  const [filtered, setFiltered] = useState<Flight[]>([]);

  // apply filters
  useEffect(() => {
    const sq = searchQuery.toLowerCase();
    setFiltered(
      flights
        .filter((f) => f.ident.toLowerCase().includes(sq))
        .filter((f) => (originFilter ? f.origin.toLowerCase().includes(originFilter.toLowerCase()) : true))
        .filter((f) => (destinationFilter ? f.destination.toLowerCase().includes(destinationFilter.toLowerCase()) : true))
        .filter((f) => (airlineFilter ? f.airline.toLowerCase().includes(airlineFilter.toLowerCase()) : true))
        .filter((f) => {
          if (!arrivalRange) return true;
          const hr = new Date(f.arrivalTime).getHours();
          const range = TIME_RANGES.find((t) => t.value === arrivalRange);
          return range ? hr >= range.start && hr <= range.end : true;
        })
    );
  }, [searchQuery, flights, originFilter, destinationFilter, airlineFilter, arrivalRange]);

  const showTimeRangePicker = (title: string, setter: (v: string) => void) => {
    const options = TIME_RANGES.map((t) => t.label).concat("Cancel");
    ActionSheetIOS.showActionSheetWithOptions(
      { title, options, cancelButtonIndex: options.length - 1 },
      (idx) => {
        if (idx < TIME_RANGES.length) setter(TIME_RANGES[idx].value);
      }
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#888" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Search by Flight Number"
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Ionicons name="options-outline" size={24} color="#888" style={styles.icon} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          onRefresh={refetch}
          refreshing={loading}
          renderItem={({ item }) => (
            <FlightCard
              ident={item.ident}
              origin={item.origin}
              destination={item.destination}
              arrivalTime={item.arrivalTime}
              airline={item.airline}
              isFav={isFavorite(item)}
              onToggleFav={() => toggleFavorite(item)}
              onPress={() =>
                router.push({ pathname: "/flightDetails", params: { ...item } })
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>
              {error ? `Error: ${error}` : "No flights found."}
            </Text>
          )}
        />
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Advanced Filters</Text>

            <TextInput
              style={styles.filterInput}
              placeholder="Origin"
              placeholderTextColor="#888"
              value={originFilter}
              onChangeText={setOriginFilter}
            />
            <TextInput
              style={styles.filterInput}
              placeholder="Destination"
              placeholderTextColor="#888"
              value={destinationFilter}
              onChangeText={setDestinationFilter}
            />
            <TextInput
              style={styles.filterInput}
              placeholder="Airline"
              placeholderTextColor="#888"
              value={airlineFilter}
              onChangeText={setAirlineFilter}
            />

            <Pressable
              style={styles.rangeButton}
              onPress={() => showTimeRangePicker("Arrival Time", setArrivalRange)}
            >
              <Text style={styles.rangeButtonText}>
                Arrival: {arrivalRange || "Any"}
              </Text>
            </Pressable>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.clearButton}
                onPress={() => {
                  setOriginFilter("");
                  setDestinationFilter("");
                  setAirlineFilter("");
                  setArrivalRange("");
                }}
              >
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
              <Pressable
                style={styles.applyButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.applyText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#000" },
  header: { paddingVertical: 16, alignItems: "center", backgroundColor: "#000" },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "600" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    margin: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  icon: { marginHorizontal: 4 },
  input: { flex: 1, height: 40, color: "#fff", marginHorizontal: 8 },
  loader: { flex: 1, justifyContent: "center" },
  listContent: { paddingBottom: 80 },
  emptyText: { textAlign: "center", marginTop: 32, color: "#888" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#2a2a2a",
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  filterInput: {
    backgroundColor: "#1e1e1e",
    color: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  rangeButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#333",
    marginVertical: 6,
    alignItems: "center",
  },
  rangeButtonText: { color: "#fff" },
  modalFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  clearButton: {
    flex: 1,
    backgroundColor: "#555",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 8,
  },
  clearText: { color: "#fff", fontWeight: "600" },
  applyButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  applyText: { color: "#fff", fontWeight: "600" },
});
