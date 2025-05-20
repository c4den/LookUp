import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { BlurView } from 'expo-blur';

// Get the screen width and height
const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useBouncingBox } from '@/hooks/useBouncingBox'; // bouncing red box for overlays
import { Switch } from 'react-native-gesture-handler';

// For plane tracking switch
import PlaneTrackingToggle from '@/components/PlaneTrackingToggle';

export default function MapScreen() {
  // Default to false for mixed reality mode initially for load on phones
  const [isMixedReality, setIsMixedReality] = useState(false);

  // Uses the built-in permission hook from expo-camera for camera usage
  const [permission, requestPermission] = useCameraPermissions();

  // Set the default camera facing to back
  const [facing, setFacing] = useState<CameraType>('back');

  // Function for button to swap between camera and MxR
  const toggleMode = () => setIsMixedReality(!isMixedReality);

  // Call our hook for the placeholder bouncing box
  const bouncingPosition = useBouncingBox(240); // (size: 240)

  // Get the screen width
  const [placement, setPlacement] = useState<'left' | 'right'>('right');

  // Variables for switch between satellite tracking and plane tracking
  const [isTrackingPlanes, setIsTrackingPlanes] = useState(true);
  const toggleTrackingPlanes = () => setIsTrackingPlanes(!isTrackingPlanes);
  const planeSwitchScale = 1.8; // Change this value to scale the switch

  // Tooltip Init
  const tooltipOffset = useRef(new Animated.Value(250)).current; // default on the right side
  const flipLeftDimensions = -175; // offset for left side
  const flipRightDimensions = 250; // offset for right side
  const flipDuration = 200; // duration for flip animation in ms
  const lastSide = useRef<'left' | 'right'>('right'); // track last position of tooltip

  // Edge detection listener for tooltip. If the box is on the left side, move the tooltip to the right, and vice versa.
  useEffect(() => {
    const listenerId = bouncingPosition.x.addListener(({ value }) => {
      if (value > screenWidth - 450 && lastSide.current !== 'left') {
        lastSide.current = 'left';
        Animated.timing(tooltipOffset, {
          toValue: -230, // flip to left
          duration: flipDuration,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: false,
        }).start();
      } else if (value < 240 && lastSide.current !== 'right') {
        lastSide.current = 'right';
        Animated.timing(tooltipOffset, {
          toValue: flipRightDimensions, // flip to right
          duration: flipDuration,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: false,
        }).start();
      }
    });

    return () => {
      bouncingPosition.x.removeListener(listenerId);
    };
  }, []);

  // ========================= PLANE EXAMPLE TRACKING && TOOLTIP =========================
  const [debugBoxes, setDebugBoxes] = useState 
  <{
    id: number;
    position: Animated.ValueXY;
    tooltipOffset: Animated.Value;
    lastSide: 'left' | 'right';
    showTooltip: boolean;
  }[]
  >([]);

  // Function to spawn a new debug box for following planes
  // the ID is determined based on the datetime, so it is unique
  // The position is randomized to be off-screen on the left side, and the Y position is randomized to be anywhere on the screen
  const spawnDebugBox = () => {
  const id = Date.now();
  const randomY = Math.random() * (screenHeight - 240);
  const position = new Animated.ValueXY({ x: -240, y: randomY });
  const tooltipOffset = new Animated.Value(250); // default to right
  let lastSide: 'left' | 'right' = 'right';

  // Initialize the box with offset and side tracking, use spread operator to enumerate && add to array
  setDebugBoxes(prev => [
    ...prev,
    {
      id,
      position,
      tooltipOffset,
      lastSide,
      showTooltip: false,
    },
  ]);

  // Animate the box across screen
  Animated.timing(position.x, {
    toValue: screenWidth + 240,
    duration: 6000,
    easing: Easing.linear,
    useNativeDriver: false,
  }).start();

  // Tooltip visibility and edge detection flip logic
  // Listen for when position.x changes to be on screen, and if it is on screen, show the tooltip
  const listenerId = position.x.addListener(({ value }) => {
    setDebugBoxes(prev =>
      prev.map(box => {
        if (box.id !== id) return box;

        // Determine whether or not the box is actually on-screen.
        const fullyOnScreen = value >= 0 && value <= screenWidth - 240;

        // If the box is fully on screen, show the tooltip - using logic to find which side it was on.
        if (value > screenWidth - 450 && box.lastSide !== 'left') {
          box.lastSide = 'left';
          Animated.timing(box.tooltipOffset, {
            toValue: flipLeftDimensions, // flip to left
            duration: flipDuration,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: false,
          }).start();
        } else if (value < 240 && box.lastSide !== 'right') {
          box.lastSide = 'right';
          Animated.timing(box.tooltipOffset, {
            toValue: flipRightDimensions, // flip to right
            duration: flipDuration,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: false,
          }).start();
        }

        return {
          // Update the box with the new position
          // SPREAD OPERATOR - this is a new object with the same properties as the old one, but with the updated position
          // (I never get to use this in JS, this is awesome)
          ...box,
          showTooltip: fullyOnScreen,
          lastSide: box.lastSide,
          tooltipOffset: box.tooltipOffset,
        };
      })
    );
  });

  // Clean up after it moves off screen
  setTimeout(() => {
    position.x.removeListener(listenerId);
    setDebugBoxes(prev => prev.filter(box => box.id !== id));
  }, 6500);
  };


  // ========================= CAMERA DISPLAY & CONTROL =========================
  return (
    <View style={styles.container}>

      {/* Plane Tracking Toggle Switch */}
      <View
        style={{
          position: 'absolute',
          bottom: 50,
          left: 50,
          zIndex: 201,
          transform: [{ scale: planeSwitchScale }],
        }}
      >
        <PlaneTrackingToggle
          value={isTrackingPlanes}
          onToggle={() => toggleTrackingPlanes()}
        />
      </View>
      {/* End plane tracking toggle switch */}
      
      {/* We check if mixed reality is enabled and permission is ranted, if so - allow for MxR Access. */}
      {isMixedReality ? (
        permission?.status === 'granted' ? (
          <>
            <CameraView style={styles.camera} />

            {/* This animated view handles the moving of the red-box */}
            <Animated.View
              style={[
                styles.redBox,
                {
                  transform: bouncingPosition.getTranslateTransform(),
                },
              ]}
            />

            {/* This animated view handles the tooltip for the red-box */}
            <Animated.View
              style={[
                styles.infoBubble,
                {
                  top: Animated.add(bouncingPosition.y, new Animated.Value(10)),
                  left: Animated.add(bouncingPosition.x, tooltipOffset),
                },
              ]}
            >
              <BlurView intensity={50} tint="dark" style={styles.flightCard}>
                <Text style={styles.flightTitle}>Flight 12812 ⭐</Text>
                <Text style={styles.route}>JP → NY</Text>
                <Text style={styles.arrival}>Estimated Arrival: 8:00PM EST</Text>
                <View style={styles.detailsButton}>
                  <Text style={styles.detailsText}>See details</Text>
                </View>
              </BlurView>
            </Animated.View>
          </>
          // all well and good, finish up this end - if we don't have permission, hence the else statement below (line beneath this one)
        ) : (
          <View style={styles.permissionContainer}>
            <Text>No access to camera</Text>
            <Button title="Grant Permission" onPress={requestPermission} />
          </View>
        )
        // furthermore, if we're on the map screen, just show the map.
      ) : (
        <View style={styles.mapContainer}>
          <Text style={styles.placeholderText}>Map Placeholder</Text>
        </View>
      )}

      {/* Button to toggle between modes */}
      <View style={styles.buttonContainer}>
        <Button
          title={isMixedReality ? 'Switch to Map' : 'Switch to Mixed Reality'}
          onPress={toggleMode}
        />
        {/* Button to spawn a new debug box */}
        <Button title="Spawn Debug Box" onPress={spawnDebugBox} />
      </View>

      {/* Render debug boxes */}
      {debugBoxes.map(box => (
        <React.Fragment key={box.id}>
          <Animated.View
            style={[
              styles.redBox,
              { transform: box.position.getTranslateTransform() },
            ]}
          />
          {box.showTooltip && (
            <Animated.View
              style={[
                styles.infoBubble,
                {
                  top: Animated.add(box.position.y, new Animated.Value(10)),
                  left: Animated.add(box.position.x, box.tooltipOffset),
                },
              ]}
            >
              <BlurView intensity={50} tint="dark" style={styles.flightCard}>
                <Text style={styles.flightTitle}>DEBUG BOX 🧪</Text>
                <Text style={styles.route}>← → Path</Text>
                <Text style={styles.arrival}>Testing Tooltip Range</Text>
                <View style={styles.detailsButton}>
                  <Text style={styles.detailsText}>Tracking</Text>
                </View>
              </BlurView>
            </Animated.View>
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: {
    flex: 1,
    backgroundColor: '#d0e0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { fontSize: 20, color: '#555' },
  camera: { flex: 1 },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  buttonContainer: {
    position: 'absolute',
    bottom: '10%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  redBox: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderColor: 'red',
    borderWidth: 3,
    borderRadius: 8,
    backgroundColor: 'transparent',
    zIndex: 99,
  },
  infoBubble: {
    position: 'absolute',
    zIndex: 100,
  },
  flightCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.21)',
    backgroundColor: 'rgba(255, 255, 255, 0.27)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 8,
    padding: 16,
    zIndex: 99,
  },
  flightTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  route: {
    color: 'white',
    fontSize: 16,
    marginBottom: 4,
  },
  arrival: {
    color: '#eee',
    fontSize: 14,
    marginBottom: 8,
  },
  detailsButton: {
    backgroundColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  detailsText: {
    color: '#000',
    fontWeight: '600',
  },
});

