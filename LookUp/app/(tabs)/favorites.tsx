// app/(tabs)/favorites.tsx

import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import FlightCard from "../../components/FlightCard";
import { useFavorites } from "../../context/FavoritesContext";

// light / dark mode imports
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from '@/components/ThemedText';
import { useAppTheme } from "@/theme/ThemeContext";
import { Colors } from "@/constants/Colors";

import { useLoginModal } from "@/context/LoginModalContext";

export default function FavoritesScreen() {
  const router = useRouter();
  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const [searchQuery, setSearchQuery] = useState("");
  const [filtered, setFiltered] = useState(favorites);

  // Add theme support for light / dark mode
  const { theme } = useAppTheme();
  const themeColors = Colors[theme];

  const { showLoginModal } = useLoginModal();

  useEffect(() => {
    const sq = searchQuery.toLowerCase();
    setFiltered(
      favorites.filter((f) =>
        f.ident.toLowerCase().includes(sq) ||
        f.origin.toLowerCase().includes(sq) ||
        f.destination.toLowerCase().includes(sq)
      )
    );
  }, [searchQuery, favorites]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favorites</Text>
      </View>

      {/* <TouchableOpacity
          style={styles.userButton}
          onPress={showLoginModal}
        >
          <Ionicons name="person" size={20} color="white" />
      </TouchableOpacity> */}

      <ThemedView style={styles.searchBox }>
        <Ionicons name="search" size={20} color="#888" />
        <TextInput
          style={styles.input}
          placeholder="Search Favorites"
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </ThemedView>

      {filtered.length === 0 ? (
        <ThemedView style={styles.empty}>
          <ThemedText style={styles.emptyText}>No favorites found.</ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
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
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: 
  { 
    flex: 1, 
    backgroundColor: "#000" 
  },
  header: 
  { 
    paddingTop: 24,
    paddingVertical: 12, 
    alignItems: "center", 
    backgroundColor: "#000" 
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "600" },
  userButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 1,
    backgroundColor: "#333",
    borderRadius: 20,
    padding: 8,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    margin: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  input: { flex: 1, marginLeft: 8, color: "#fff", height: 40 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#888", fontSize: 16 },
  listContent: { paddingBottom: 80 },
});
