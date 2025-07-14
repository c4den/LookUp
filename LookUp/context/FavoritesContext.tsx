// hooks/FavoritesContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Flight } from '../hooks/useFlights';

const STORAGE_KEY = 'FAVORITE_FLIGHTS';

interface FavoritesContextValue {
  favorites: Flight[];
  isFavorite: (flight: Flight) => boolean;
  toggleFavorite: (flight: Flight) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<Flight[]>([]);

  // Load favorites from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const json = await AsyncStorage.getItem(STORAGE_KEY);
        if (json) setFavorites(JSON.parse(json));
      } catch {
        // ignore
      }
    })();
  }, []);

  const persist = async (list: Flight[]) => {
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {
      // ignore
    }
  };

  const toggleFavorite = (flight: Flight) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.id === flight.id);
      const updated = exists
        ? prev.filter(f => f.id !== flight.id)
        : [...prev, flight];
      persist(updated);
      return updated;
    });
  };

  const isFavorite = (flight: Flight) => {
    return favorites.some(f => f.id === flight.id);
  };

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = (): FavoritesContextValue => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
};
