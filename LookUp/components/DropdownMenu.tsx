import { Link } from "expo-router";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  StatusBar,
  TouchableWithoutFeedback,
} from "react-native";

interface DropdownMenuProps {
  isVisible: boolean;
  animation: Animated.Value;
  closeMenu: () => void;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  isVisible,
  animation,
  closeMenu,
}) => {
  return (
    isVisible && (
      <TouchableWithoutFeedback onPress={closeMenu}>
        <Animated.View
          style={[
            styles.menuDropdown,
            {
              transform: [
                {
                  translateY: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-300, 0],
                  }),
                },
              ],
              opacity: animation.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
            },
          ]}
        >
          <Text style={styles.menuItem}>Search</Text>
          <Text style={styles.menuItem}>Favorites</Text>
          <Link href="/map" style={styles.menuItem}>Map</Link>
          <Text style={styles.menuItem}>Account</Text>
          <Text style={styles.menuItem}>Settings</Text>
        </Animated.View>
      </TouchableWithoutFeedback>
    )
  );
};

const styles = StyleSheet.create({
  menuDropdown: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "auto",
    backgroundColor: "#1E1E1E",
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + 30 : 80,
  },
  menuItem: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
    marginVertical: 6,
    padding: 6,
  },
});

export default DropdownMenu;
