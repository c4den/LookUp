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

  // fetch flight data
  const { data: flights = [], loading, error, refetch } = useFlights({}, 60000);

  // filter by flight number only
  const [filtered, setFiltered] = useState<Flight[]>([]);
  useEffect(() => {
    const sq = searchQuery.toLowerCase();
    setFiltered(flights.filter((f) => f.ident.toLowerCase().includes(sq)));
  }, [searchQuery, flights]);

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
          <Ionicons
            name="options-outline"
            size={24}
            color="#888"
            style={styles.icon}
          />
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
              departureTime={item.departureTime}
              arrivalTime={item.arrivalTime}
              airline={item.airline}
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
            {/* advanced filters UI as before */}
            <Pressable
              style={styles.applyButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.applyText}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#000" },
  header: {
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#000",
  },
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
  input: {
    flex: 1,
    height: 40,
    color: "#fff",
    marginHorizontal: 8,
  },
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
  applyButton: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  applyText: { color: "#fff", fontWeight: "600" },
});
