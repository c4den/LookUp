// sets up context menu for setting flight radius globally.

import React, { createContext, useContext, useState } from 'react';

// define context menu 
type FlightRadiusContextType = {
  flightRadius: number;
  setFlightRadius: (radius: number) => void;
};

// create context
const FlightRadiusContext = createContext<FlightRadiusContextType | undefined>(undefined);

// Create provider for export with default values. 
export const FlightRadiusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flightRadius, setFlightRadius] = useState(10); // default value

  return (
    <FlightRadiusContext.Provider value={{ flightRadius, setFlightRadius }}>
      {children}
    </FlightRadiusContext.Provider>
  );
};

export const useFlightRadius = () => {
  const context = useContext(FlightRadiusContext);
  if (!context) {
    throw new Error('useFlightRadius must be used within a FlightRadiusProvider');
  }
  return context;
};