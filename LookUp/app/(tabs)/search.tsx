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
import { useRouter } from "expo-router"; // Import useRouter for navigation

interface SearchMenuProps {
  closeSearch: () => void;
}

const SearchMenu: React.FC<SearchMenuProps> = ({ closeSearch }) => {
  const router = useRouter(); // Initialize router for navigation

  const flights = Array(8).fill("#1111 JP → NY 02/12");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search</Text>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Search Flight #"
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
              onPress={() => router.push("/flightDetails")} // Redirect to flight details
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

export default SearchMenu;

// ================================== ROUTES SEARCH ==================================
// Temp source and destination airports, replace with user input
// const source = 'MCO';
// const destination = 'JFK';

// fetch(
//   `https://fr24api.flightradar24.com/api/live/flight-positions/full?routes=${source}-${destination}`,
//   {
//     method: 'GET',
//     headers: {
//       'Accept': 'application/json',
//       'Accept-Version': 'v1',
//       'Authorization': `Bearer 019653fd-4687-73b7-8676-2813ddad5873|UnUs6oib9b7bnbjHToIHmSovQJ8CaEujhVsFYzKS4805cff7`,
//     },
//   }
// )
//   .then((response) => response.json())
//   .then((data) => {
//     console.log(JSON.stringify(data));
//   })
//   .catch((error) => {
//     console.log(error);
//   });
// ================================== END ROUTES SEARCH ==================================


// // ================================== FLIGHT NUMBER SEARCH ==================================
// // Temp flight number, replace with user input
// const flightNum = 'UA1742';

// fetch(
//   `https://fr24api.flightradar24.com/api/live/flight-positions/full?flights=${flightNum}`,
//   {
//     method: 'GET',
//     headers: {
//       'Accept': 'application/json',
//       'Accept-Version': 'v1',
//       'Authorization': `Bearer 019653fd-4687-73b7-8676-2813ddad5873|UnUs6oib9b7bnbjHToIHmSovQJ8CaEujhVsFYzKS4805cff7`,
//     },
//   }
// )
//   .then((response) => response.json())
//   .then((data) => {
//     console.log(JSON.stringify(data));
//   })
//   .catch((error) => {
//     console.log(error);
//   });
// // ================================== END FLIGHT NUMBER SEARCH ==================================


// // ================================== FLIGHT CALLSIGN SEARCH ==================================
// // Temp flight number, replace with user input
// const callsign = 'UAL1742';

// fetch(
//   `https://fr24api.flightradar24.com/api/live/flight-positions/full?callsigns=${callsign}`,
//   {
//     method: 'GET',
//     headers: {
//       'Accept': 'application/json',
//       'Accept-Version': 'v1',
//       'Authorization': `Bearer 019653fd-4687-73b7-8676-2813ddad5873|UnUs6oib9b7bnbjHToIHmSovQJ8CaEujhVsFYzKS4805cff7`,
//     },
//   }
// )
//   .then((response) => response.json())
//   .then((data) => {
//     console.log(JSON.stringify(data));
//   })
//   .catch((error) => {
//     console.log(error);
//   });
// // ================================== END FLIGHT CALLSIGN SEARCH ==================================


// ================================== AIRPORT SEARCH ==================================
// // Temp direction. Can be 'inbound', 'outbound', or 'both'
// const direction = 'both';
// // Temp airport, replace with user input
// const airport = 'MCO';

// fetch(
//   `https://fr24api.flightradar24.com/api/live/flight-positions/full?airports=${direction}:${airport}`,
//   {
//     method: 'GET',
//     headers: {
//       'Accept': 'application/json',
//       'Accept-Version': 'v1',
//       'Authorization': `Bearer 019653fd-4687-73b7-8676-2813ddad5873|UnUs6oib9b7bnbjHToIHmSovQJ8CaEujhVsFYzKS4805cff7`,
//     },
//   }
// )
//   .then((response) => response.json())
//   .then((data) => {
//     console.log(JSON.stringify(data));
//   })
//   .catch((error) => {
//     console.log(error);
//   });
// ================================== END AIRPORT SEARCH ==================================

