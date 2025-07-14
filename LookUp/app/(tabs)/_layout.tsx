// app/_layout.tsx

import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { LoginModalProvider } from '@/context/LoginModalContext';
import LoginModal from '@/components/LoginModal';
import { ThemeProvider, useAppTheme } from '@/theme/ThemeContext';
import { FlightRadiusProvider } from '@/context/FlightRadiusContext';
import { FavoritesProvider } from '@/context/FavoritesContext';

export default function RootLayout() {
  return (
    <FlightRadiusProvider>
      <ThemeProvider>
        <LoginModalProvider>
          <FavoritesProvider>
            <MainLayout />
            <LoginModal />
          </FavoritesProvider>
        </LoginModalProvider>
      </ThemeProvider>
    </FlightRadiusProvider>
  );
}

function MainLayout() {
  const { theme } = useAppTheme();

  return (
    <Tabs
      initialRouteName="search"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors[theme].tint,
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: Platform.select({ ios: { position: 'absolute' }, default: {} }),
        tabBarIcon: ({ color, size }) => {
          let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'help-circle';
          if (route.name === 'search') iconName = 'search';
          else if (route.name === 'favorites') iconName = 'star';
          else if (route.name === 'map') iconName = 'map';
          else if (route.name === 'settings') iconName = 'settings';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="favorites" options={{ title: 'Favorites' }} />
      <Tabs.Screen name="map" options={{ title: 'Map' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
