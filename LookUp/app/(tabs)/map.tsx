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
import { ThemedText } from '@/components/ThemedText';

// for mixed reality vs map switch
import MixedRealityToggle from '@/components/MixedRealityToggle';

export default function MapScreen() {

  // Default to false for mixed reality mode initially for load on phones
  const [isMixedReality, setIsMixedReality] = useState(false);
  const toggleMixedReality = () => setIsMixedReality(!isMixedReality);
  const mixedRealityScale = 1.4; // Change this value to scale the switch(es) that are present on the UI

  // Uses the built-in permission hook from expo-camera for camera usage
  const [permission, requestPermission] = useCameraPermissions();

  // Set the default camera facing to back
  const [facing, setFacing] = useState<CameraType>('back');
  const captureInterval = 2000; // Interval for capturing images in milliseconds (2 seconds by default)
  const cameraRef = useRef<CameraView>(null);

  // Function for button to swap between camera and MxR
  const toggleMode = () => setIsMixedReality(!isMixedReality);

  // Get the screen width
  const [placement, setPlacement] = useState<'left' | 'right'>('right');

  // Variables for switch between satellite tracking and plane tracking
  const [isTrackingPlanes, setIsTrackingPlanes] = useState(true);
  const toggleTrackingPlanes = () => setIsTrackingPlanes(!isTrackingPlanes);
  const planeSwitchScale = 1.4; // Change this value to scale the switch

  // Tooltip Init
  const tooltipOffset = useRef(new Animated.Value(250)).current; // default on the right side
  const flipLeftDimensions = -175; // offset for left side
  const flipRightDimensions = 250; // offset for right side
  const flipDuration = 200; // duration for flip animation in ms
  const lastSide = useRef<'left' | 'right'>('right'); // track last position of tooltip

  // This is the box that will be used for the Object Detection API response
  type BoxTuples = {
    top_left: [number, number];
    top_right: [number, number];
    bottom_left: [number, number];
    bottom_right: [number, number];
    width: number;
    height: number;
  };

  const [apiBox, setApiBox] = useState<BoxTuples | undefined>(undefined);
  const { position: bouncingPosition, width: boxWidth, height: boxHeight } = useBouncingBox(240, 1000, 900, apiBox);

  // =================================== PING SERVER FUNCTION ==================================
  // We don't want to automatially refresh the API, so we have a button to do it manually.
  const refreshAircraftData = async () => {
    try {
      const response = await fetch('APIENDPOINTHERE'); //  API endpoint
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      console.log('API Response:', data);
    } catch (error) {
      console.error('Error pinging server:', error);
    }
  };
  // =================================== END PING SERVER FUNCTION ==================================

  // ================================== OBJECT DETECTION API PAYLOAD ================================== 
  const sendToObjectDetectionAPI = async (base64Image: string) => {
  const response = await fetch('APIENDPOINTHERE', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image }),
  });

  const result = await response.json();

  // Example: result = { top_left: [x, y], top_right: [x, y], bottom_left: [x, y], bottom_right: [x, y] }
  if (Array.isArray(result.top_left) && Array.isArray(result.top_right) && 
      Array.isArray(result.bottom_left) && Array.isArray(result.bottom_right)) {

    // determine the width and height of the box based on the coordinates returned from the API
    // and set the apiBox state with the new dimensions
    const [x, y] = result.top_left;
    const [topRightX] = result.top_right;
    const [, bottomLeftY] = result.bottom_left;
    const width = topRightX - x;
    const height = bottomLeftY - y;
    setApiBox({
      top_left: result.top_left,
      top_right: result.top_right,
      bottom_left: result.bottom_left,
      bottom_right: result.bottom_right,
      width,
      height,
    });
  }
};
  // ================================== END OBJECT DETECTION API PAYLOAD ==================================

  // ================================== EDGE DETECTION FOR TOOLTIP ========================================
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
  // ================================== END EDGE DETECTION FOR TOOLTIP ========================================

  // ================================== CAMERA CAPTURE LOGIC ==================================================
  // Here is where we capture images from the camera at a set interval
  useEffect(() => {

    // define the interval function for capturing images
    const interval = setInterval(async () => {

      // we care that the user has granted permission to use of the camera, and that we're in mixed reality mode
      if (isMixedReality && permission?.status === 'granted' && cameraRef.current) {
        try {
          // capture an image from the camera, if able to and send to API
          const photo = await cameraRef.current.takePictureAsync({ base64: true });

          // have to check if the photo has a base64 string, as it may not always be available
          if (photo.base64) {
            sendToObjectDetectionAPI(photo.base64);
          }
        } catch (error) {
          console.error('Error capturing photo:', error);
        }
      }
    }, captureInterval);
    return () => clearInterval(interval);
  }, []);
  // ========================= END CAMERA CAPTURE LOGIC ========================================================

  // ========================= CAMERA DISPLAY & CONTROL ========================================================
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
            {/* the apiBox && turns the box off if there's no response from the API. apiBox && */}
            
            {apiBox && (
              <Animated.View
                style={[
                  styles.redBox,
                  {
                    width: boxWidth,
                    height: boxHeight,
                    transform: bouncingPosition.getTranslateTransform(),
                  },
                ]}
              />
            )}

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
      <View style={{
          position: 'absolute',
          bottom: 50,
          left: '50%',
          transform: [{ translateX: -35 + mixedRealityScale }, { scale: mixedRealityScale }],
          zIndex: 201,
        }}>
        <MixedRealityToggle
          value={isMixedReality}
          onToggle={toggleMixedReality}
        />
      </View>

      {/* Button to ping the API */}
      <View style={{
        position: 'absolute',
        top: '10%',
        left: '10%',
        zIndex: 200, 
      }}>
        <Button
          title="(DEBUG) Refresh Aircraft Data"
          onPress={ refreshAircraftData }
        />
      </View>
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

