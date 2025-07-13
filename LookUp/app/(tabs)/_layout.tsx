import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from "@expo/vector-icons"; 
import { Colors } from '@/constants/Colors';
import { LoginModalProvider } from '@/context/LoginModalContext';
import LoginModal from '@/components/LoginModal';
import { ThemeProvider, useAppTheme } from '@/theme/ThemeContext';
import { FlightRadiusProvider } from '@/context/FlightRadiusContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView>
      <FlightRadiusProvider>
        <ThemeProvider>
          <LoginModalProvider>
            <MainLayout />
            <LoginModal />
          </LoginModalProvider>
        </ThemeProvider>
      </FlightRadiusProvider>
    </GestureHandlerRootView>
  );
}

function MainLayout() {
  const { theme } = useAppTheme(); // <- from context && utilized for light / dark mode

  return (
    <Tabs
      initialRouteName="map"
      screenOptions={{
        tabBarActiveTintColor: Colors[theme].tint,
        headerShown: false,
        tabBarStyle: Platform.select({
          ios: { position: 'absolute' },
          default: {},
        }),
      }}
    >
      <Tabs.Screen name="search" options={{
        title: '',
        tabBarIcon: ({ color }) => <Ionicons name='search' size={24} color={color} />
      }} />
      <Tabs.Screen name="favorites" options={{
        title: '',
        tabBarIcon: ({ color }) => <Ionicons name='star' size={24} color={color} />
      }} />
      <Tabs.Screen name="map" options={{
        title: '',
        tabBarIcon: ({ color }) => <Ionicons name='map' size={24} color={color} />
      }} />
      <Tabs.Screen name="settings" options={{
        title: '',
        tabBarIcon: ({ color }) => <Ionicons name='settings' size={24} color={color} />
      }} />
    </Tabs>
  );
}
