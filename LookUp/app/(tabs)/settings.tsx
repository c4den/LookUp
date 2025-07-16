import React, { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import Slider from '@react-native-community/slider';
// import Slider from '@/components/Slider'; // this is currently bugged as of .20 version of react. it should be fixed soon, hopefully.
import { Picker } from '@react-native-picker/picker';

import { Gesture, GestureDetector } from 'react-native-gesture-handler';

// Use global theme context
import { useAppTheme } from '@/theme/ThemeContext';
import { Colors } from '@/constants/Colors';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useFlightRadius } from '@/context/FlightRadiusContext';

import { ScrollView } from 'react-native';

// Wrap the screen in GestureHandlerRootView for gesture support
function withGestureHandlerRootView(Component: React.ComponentType) {
  return function Wrapper(props: any) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Component {...props} />
      </GestureHandlerRootView>
    );
  };
}

function SettingsScreen() {
  // for Picker
  const [selectedLanguage, setSelectedLanguage] = useState('');

  const { flightRadius, setFlightRadius } = useFlightRadius();

  // Sending the flight radius value to the backend
  const updateFlightRadius = async (radius: number) => {
    setFlightRadius(radius);
  };

  const { theme, toggleTheme } = useAppTheme();
  const isDark = theme === 'dark';

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const maxDetectionRange = 25;

  const themeColors = Colors[theme];

  const getInterpolatedColor = (value: number) => {
    const t = (value - 1) / (maxDetectionRange - 1);
    const r = Math.round(0 + t * (255 - 0));
    const g = Math.round(122 - t * 122);
    const b = Math.round(255 - t * 255);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.titleContainer, { backgroundColor: themeColors.background }]}>
        <ThemedText type="title">Settings</ThemedText>
      </View>

      <View style={[styles.section, { backgroundColor: themeColors.background }]}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Appearance</ThemedText>
        <View style={[styles.item, { backgroundColor: themeColors.background }]}>
          <ThemedText style={{ marginBottom: 6 }}>Dark Mode</ThemedText>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
          />
        </View>
      </View>
      {/*
      <View style={[styles.section, { backgroundColor: themeColors.background }]}>
        <ThemedText type="subtitle" style={[styles.sectionTitle]}>Notifications</ThemedText>
        <View style={[styles.item, { backgroundColor: themeColors.background }]}>
            <ThemedText style={{ marginBottom: 6 }}>Flight Alerts</ThemedText>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
          />
        </View>
      </View>
      */}

      <View style={[styles.section, { backgroundColor: themeColors.background }]}>
        <ThemedText type="subtitle" style={ styles.sectionTitle }>Flight Detection Radius</ThemedText>
        <ThemedText style={{ marginBottom: 12 }}>Set how far (in km) to passively scan for nearby flights:</ThemedText>
        <ThemedText style={{ marginBottom: 8 }}>Radius: {flightRadius} km</ThemedText>

        {/* Placeholder picker in lieu of the slider below, since it's got a bug :P.*/}
        
        <Picker
          selectedValue={flightRadius}
          onValueChange={(itemValue) => updateFlightRadius(Number(itemValue))}
          style={{
            color: getInterpolatedColor(flightRadius),
            marginBottom: 8,
          }}
        >
          <Picker.Item label="1" value={1} />
          <Picker.Item label="5" value={5} />
          <Picker.Item label="10" value={10} />
          <Picker.Item label="15" value={15} />
          <Picker.Item label="20" value={20} />
          <Picker.Item label="25" value={25} />
        </Picker>

        {/*
        <GestureDetector gesture={Gesture.Tap().onEnd(() => {})}>
          <Slider
            value={flightRadius}
            onValueChange={setFlightRadius}
            minimumValue={1}
            maximumValue={maxDetectionRange}
            step={1}
            style={{ width: '100%' }}
            minimumTrackTintColor={getInterpolatedColor(flightRadius)}
            maximumTrackTintColor="#ccc"
            thumbTintColor={getInterpolatedColor(flightRadius)}
          />
        </GestureDetector>
        */}

        <ThemedText style={{ marginTop: 12, color: getInterpolatedColor(flightRadius), fontWeight: '600' }}>
          WARNING: GREATER DETECTION RADIUS MAY INCREASE QUERY TIME
        </ThemedText>
      </View>

      <View style={[styles.section, { backgroundColor: themeColors.background }]}>
        <ThemedText type="subtitle" style={ styles.sectionTitle }>About</ThemedText>
        <View style={[styles.item, { backgroundColor: themeColors.background }]}>
          <ThemedText>Version</ThemedText>
          <ThemedText type="defaultSemiBold">Demo Build - Semester 2</ThemedText>
        </View>
        <View style={[styles.item, { backgroundColor: themeColors.background }]}> 
          <ThemedText>Developers</ThemedText>
          <ThemedText type="defaultSemiBold">L10 - Look Up Dev Team</ThemedText>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 40,
    marginBottom: 20,
  },
  container: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
  },
});

export default withGestureHandlerRootView(SettingsScreen);