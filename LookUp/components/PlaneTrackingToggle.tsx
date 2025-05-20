import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// initialize the variables and types
export default function PlaneToggle({
  value,
  onToggle,
}: {
  value: boolean;
  onToggle: () => void;
}) {

  // Animation details with effects, interpolations, and styles
  const animation = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const translateX = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 30], // adjust based on container/track width
  });

  const backgroundColor = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ccc', '#009688'], // gray to teal
  });

  // Icon based on the value
  const icon = value ? '✈️' : '🛰️';

  return (
    <Pressable onPress={onToggle}>
      <Animated.View style={[styles.container, { backgroundColor }]}>
        <Animated.View style={[styles.thumb, { transform: [{ translateX }] }]}>
          <Text style={styles.icon}>{icon}</Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 64,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    paddingHorizontal: 4,
    backgroundColor: '#ccc',
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  icon: {
    fontSize: 16,
  },
});
