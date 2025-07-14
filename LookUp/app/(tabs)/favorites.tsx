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

export default function FavoritesScreen() {
  const router = useRouter();
  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const [searchQuery, setSearchQuery] = useState("");
  const [filtered, setFiltered] = useState(favorites);

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

      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#888" />
        <TextInput
          style={styles.input}
          placeholder="Search Favorites"
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No favorites found.</Text>
        </View>
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
  container: { flex: 1, backgroundColor: "#000" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    margin: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: { flex: 1, marginLeft: 8, color: "#fff", height: 40 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#888", fontSize: 16 },
  listContent: { paddingBottom: 80 },
});
