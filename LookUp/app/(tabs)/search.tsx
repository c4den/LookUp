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
  Pressable,
  Modal,
  Alert,
  StyleSheet,
  StatusBar,
  Platform,
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

  const { data: flights = [], loading, error, refetch } = useFlights({}, 60000);
  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const [filtered, setFiltered] = useState<Flight[]>([]);

  useEffect(() => {
    const sq = searchQuery.toLowerCase();
    setFiltered(
      flights
        .filter((f) => f.ident.toLowerCase().includes(sq))
        .filter((f) =>
          originFilter
            ? f.origin.toLowerCase().includes(originFilter.toLowerCase())
            : true
        )
        .filter((f) =>
          destinationFilter
            ? f.destination.toLowerCase().includes(destinationFilter.toLowerCase())
            : true
        )
        .filter((f) =>
          airlineFilter
            ? f.airline.toLowerCase().includes(airlineFilter.toLowerCase())
            : true
        )
        .filter((f) => {
          if (!arrivalRange) return true;
          const hr = new Date(f.arrivalTime).getHours();
          const range = TIME_RANGES.find((t) => t.value === arrivalRange);
          return range ? hr >= range.start && hr <= range.end : true;
        })
    );
  }, [searchQuery, flights, originFilter, destinationFilter, airlineFilter, arrivalRange]);

  const showTimeRangePicker = (title: string, setter: (v: string) => void) => {
    const options = TIME_RANGES.map((t) => t.label);
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { title, options: [...options, "Cancel"], cancelButtonIndex: options.length },
        (idx) => {
          if (idx < options.length) setter(TIME_RANGES[idx].value);
        }
      );
    } else {
      Alert.alert(
        title,
        undefined,
        [
          ...TIME_RANGES.map((t) => ({ text: t.label, onPress: () => setter(t.value) })),
          { text: "Cancel", style: "cancel" },
        ],
        { cancelable: true }
      );
    }
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
          extraData={favorites}
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
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
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
              style={styles.rangeBtn}
              onPress={() => showTimeRangePicker("Select Arrival Time", setArrivalRange)}
            >
              <Text style={styles.rangeTxt}>
                {arrivalRange
                  ? TIME_RANGES.find((t) => t.value === arrivalRange)?.label
                  : "Arrival Time"}
              </Text>
            </Pressable>
            <View style={styles.modalFooter}>
              <Pressable
                style={styles.clearBtn}
                onPress={() => {
                  setOriginFilter("");
                  setDestinationFilter("");
                  setAirlineFilter("");
                  setArrivalRange("");
                }}
              >
                <Text style={styles.clearTxt}>Clear</Text>
              </Pressable>
              <Pressable
                style={styles.applyBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.applyTxt}>Apply</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
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
    paddingBottom: 40,
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
  rangeBtn: {
    backgroundColor: "#1e1e1e",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: "center",
  },
  rangeTxt: { color: "#fff", fontSize: 16 },
  modalFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  clearBtn: {
    flex: 1,
    backgroundColor: "#555",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 8,
  },
  clearTxt: { color: "#fff", fontWeight: "600" },
  applyBtn: {
    flex: 1,
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  applyTxt: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
