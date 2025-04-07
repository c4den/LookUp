import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLoginModal } from "@/context/LoginModalContext"; // Import the modal context
import { useRouter } from "expo-router"; // Import useRouter for navigation

const FavoritesMenu: React.FC = () => {
  const { showLoginModal } = useLoginModal(); // Access the showLoginModal function from context
  const router = useRouter(); // Initialize the router for navigation
  const flights = Array(8).fill("#1111 JP → NY 02/12");

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Favorites</Text>
        <TouchableOpacity style={styles.userButton} onPress={showLoginModal}>
          <Ionicons name="person" size={20} color="white" />
        </TouchableOpacity>
      </View>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Search Favorites"
          placeholderTextColor="#ccc"
        />
      </View>

      <FlatList
        data={flights}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Ionicons
              name="airplane"
              size={24}
              color="white"
              style={styles.icon}
            />
            <Text style={styles.text}>{item}</Text>

            <TouchableOpacity
              style={styles.arrowContainer}
              onPress={() => router.push("/flightDetails")} // Directly redirect to the flight details page
            >
              <Ionicons name="arrow-forward" size={20} color="black" />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "stretch",
    backgroundColor: "#1E1E1E",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 55,
    marginBottom: 45,
    paddingHorizontal: 20,
    zIndex: 999,
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  userButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    right: 0,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#333",
    marginTop: 30,
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    color: "white",
    fontSize: 16,
    paddingHorizontal: 10,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2A2A2A",
    padding: 15,
    borderRadius: 30,
    marginVertical: 5,
    width: "100%",
  },
  text: {
    flex: 1,
    color: "white",
    fontSize: 16,
    marginLeft: 10,
  },
  icon: {
    marginRight: 10,
  },
  arrowContainer: {
    width: 40,
    height: 40,
    borderRadius: 100,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: "white",
    textAlign: "center",
    fontSize: 24,
    fontWeight: "bold",
  },
});

export default FavoritesMenu;
