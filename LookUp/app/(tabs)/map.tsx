import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from "react-native";
import { BlurView } from "expo-blur";
import * as FileSystem from "expo-file-system";

// flight data API key
const FLIGHTDATAAPIKEY = process.env.FLIGHT_DATA_API_KEY;

// photo send API key
const OBJECTDETECTAPI = `http://134.199.204.181:3000`;

// Get the screen width and height
const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useBouncingBox } from "@/hooks/useBouncingBox"; // bouncing red box for overlays
import { Switch } from "react-native-gesture-handler";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

// For plane tracking switch
import PlaneTrackingToggle from "@/components/PlaneTrackingToggle";
import { ThemedText } from "@/components/ThemedText";

// for mixed reality vs map switch
import MixedRealityToggle from "@/components/MixedRealityToggle";

// Main map screen
import MapView, { Marker, AnimatedRegion } from "react-native-maps";
import * as Location from "expo-location";

// for getting the flight radius from context
import { useFlightRadius } from "@/context/FlightRadiusContext";
import { Ionicons } from "@expo/vector-icons";

// for getting the compass heading from the compass heading component
import CompassHeading from "@/components/CompassHeading";
import { useCompassHeading } from "@/hooks/useCompassHeading";

// to make sure the camera isn't firing when it shouldn't be 
import { useIsFocused } from "@react-navigation/native";

import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "../types"; 
import { TouchableOpacity } from "react-native";

// expo implementation of above:
import { useRouter } from "expo-router";


export default function MapScreen() {
  const { rawHeading, pitch, startCompass, stopCompass } = useCompassHeading();
  const userHeading = rawHeading !== null ? (rawHeading + 180) % 360 : null;

  // Default to false for mixed reality mode initially for load on phones
  const [isMixedReality, setIsMixedReality] = useState(false);
  const toggleMixedReality = () => setIsMixedReality(!isMixedReality);
  const mixedRealityScale = 1.4; // Change this value to scale the switch(es) that are present on the UI

  // Uses the built-in permission hook from expo-camera for camera usage
  const [permission, requestPermission] = useCameraPermissions();

  // permission hook for location
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // user Latitude and longitude
  const userLatitude = location?.coords.latitude ?? null;
  const userLongitude = location?.coords.longitude ?? null;

  // user defined flight range from context
  const { flightRadius } = useFlightRadius();

  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });

  // determine if the screen is currently focused
  const isFocused = useIsFocused();

  // For the sake of placing text in another screen.
  type NavigationProp = StackNavigationProp<RootStackParamList, "search">;
  const navigation = useNavigation<NavigationProp>();

  // expo implementation
  const router = useRouter();

  // Bounding points for near flights query
  let boundingPoints: {
    north: [number, number];
    east: [number, number];
    south: [number, number];
    west: [number, number];
  } | null = null;

  // State for storing & displaying flights
  type Flight = {
    fr24_id: string;
    flight: string | null;
    callsign: string | null;
    lat: number;
    lon: number;
    track: number;
    alt: number;
    gspeed: number;
    vspeed: number;
    squawk: string | null;
    timestamp: string;
    source: string;
    hex?: string;
    type: string | null;
    reg: string | null;
    painted_as: string | null;
    operating_as: string | null;
    orig_iata: string | null;
    orig_icao: string | null;
    dest_iata: string | null;
    dest_icao: string | null;
    eta: string | null;
  };

  const [flights, setFlights] = useState<Flight[]>([]);
  const [flightInView, setFlightInView] = useState<Flight | null>(null);

  // pinch gesture zoom state variable
  const [zoomLevel, setZoomLevel] = useState(0);

  // auto-refresh interval for flight data
  const [isAutoRefresh, setIsAutoRefresh] = useState(false);
  const toggleAutoRefresh = () => setIsAutoRefresh(!isAutoRefresh);

  // ============================= PINCH GESTURE FOR ZOOMING IN AND OUT =============================
  const pinchGesture = Gesture.Pinch()
  .onUpdate((event) => {
    'worklet';
    const { scale } = event;

    // here we convert the pinch scale to a zoom level
    let newZoom = zoomLevel;

    if (scale > 1) {
      // we're pinching outward (zooming in)
      newZoom = Math.min(1, zoomLevel + (scale - 1) * 0.1);
    } else if (scale < 1) {
      // we're pinching inward (zooming out)
      newZoom = Math.max(0, zoomLevel - (1 - scale) * 0.1);
    }

    // update the state from the worklet
    runOnJS(setZoomLevel)(newZoom);
  })
  .onEnd(() => {
    'worklet';
    console.log('pinch ended, the final zoom is:', zoomLevel);
  });
  // ========================= END PINCH GESTURE FOR ZOOMING IN AND OUT =============================

  // ============================= GET USER'S BEARING =============================
  function getBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;

    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x =
      Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
      Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
    let brng = Math.atan2(y, x);
    brng = toDeg(brng);
    // normalize 0..360
    return (brng + 360) % 360;
  }

  // Function to get the flight in view based on user's bearing and location
  // tolerance is a degree value that determines how close the flight's bearing must be to the user's heading to be considered "in view"
  function getFlightInView(
    userLat: number,
    userLon: number,
    heading: number,
    flights: Flight[],
    tolerance: number = 10
  ): Flight | null {
    let inViewFlight: Flight | null = null;

    for (const flight of flights) {
      const bearing = getBearing(userLat, userLon, flight.lat, flight.lon);
      // measure difference between heading and bearing
      const diff = Math.abs(((bearing - heading + 540) % 360) - 180); 
      // if within tolerance, we consider it "in view"
      if (diff <= tolerance) {
        inViewFlight = flight;
        break; 
      }
    }
    return inViewFlight;
  }
  // ============================== END GET USER'S BEARING =============================

  // Get the user's current location if they allow permission
  // this is from Expo documentation.
  // ============================= LOCATION PERMISSION =============================
  useEffect(() => {
    async function getCurrentLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    }

    getCurrentLocation();
  }, []);
  // ============================= END LOCATION PERMISSION =============================

  // ============================= HAVERSINE FORMULA TO CALCULATE DISTANCE BASED ON USER LOCATION =============================
  /*
   * Returns four points (N, E, S, W) that are `distanceKm` away from the given lat/lon.
   * Uses the haversine formula for destination point.
   */
  function getBoundingPoints(
    latitude: number,
    longitude: number,
    distanceKm: number
  ): {
    north: [number, number];
    east: [number, number];
    south: [number, number];
    west: [number, number];
  } {
    const R = 6371; // Earth's radius in km

    function toRad(deg: number) {
      return (deg * Math.PI) / 180;
    }
    function toDeg(rad: number) {
      return (rad * 180) / Math.PI;
    }

    function destinationPoint(
      lat: number,
      lon: number,
      brngDeg: number,
      distKm: number
    ): [number, number] {
      const brng = toRad(brngDeg);
      const lat1 = toRad(lat);
      const lon1 = toRad(lon);

      const lat2 = Math.asin(
        Math.sin(lat1) * Math.cos(distKm / R) +
          Math.cos(lat1) * Math.sin(distKm / R) * Math.cos(brng)
      );
      const lon2 =
        lon1 +
        Math.atan2(
          Math.sin(brng) * Math.sin(distKm / R) * Math.cos(lat1),
          Math.cos(distKm / R) - Math.sin(lat1) * Math.sin(lat2)
        );
      return [toDeg(lat2), toDeg(lon2)];
    }

    return {
      north: destinationPoint(latitude, longitude, 0, distanceKm),
      east: destinationPoint(latitude, longitude, 90, distanceKm),
      south: destinationPoint(latitude, longitude, 180, distanceKm),
      west: destinationPoint(latitude, longitude, 270, distanceKm),
    };
  }

  // Get the user's bounding points if we have their location. !!ON BOOT!!
  // This occurs every render step -- as such, while debugging we have it commented out.
  // LATER IN DEVELOPMENT, WE WILL UNCOMMENT THIS, AND IMPLEMENT A TIME STEP TO UPDATE THE BOUNDING POINTS

  // if (userLatitude !== null && userLongitude !== null) {
  //   boundingPoints = getBoundingPoints(userLatitude, userLongitude, flightRadius);

  //   // boundingPoints.north, .east, .south, .west are now available. We cull these to 3 deicmal places for API calls.
  //   const northPoint = [
  //     boundingPoints.north[0].toFixed(3),
  //     boundingPoints.north[1].toFixed(3)
  //   ];
  //   const southPoint = [
  //     boundingPoints.south[0].toFixed(3),
  //     boundingPoints.south[1].toFixed(3)
  //   ];
  //   const westPoint = [
  //     boundingPoints.west[0].toFixed(3),
  //     boundingPoints.west[1].toFixed(3)
  //   ];
  //   const eastPoint = [
  //     boundingPoints.east[0].toFixed(3),
  //     boundingPoints.east[1].toFixed(3)
  //   ];

  //   // API call to get flights within the bounding points.
  //   fetch(
  //     `https://fr24api.flightradar24.com/api/live/flight-positions/full?bounds=${northPoint[0]},${southPoint[0]},${westPoint[1]},${eastPoint[1]}`,
  //     {
  //       method: 'GET',
  //       headers: {
  //         'Accept': 'application/json',
  //         'Accept-Version': 'v1',
  //         'Authorization': `Bearer 019653fd-4687-73b7-8676-2813ddad5873|UnUs6oib9b7bnbjHToIHmSovQJ8CaEujhVsFYzKS4805cff7`,
  //       },
  //     }
  //   )
  //     .then((response) => response.json())
  //     .then((data) => {
  //       console.log(JSON.stringify(data));
  //     })
  //     .catch((error) => {
  //       console.log(error);
  //     });
  // }

  // ============================= END HAVERSINE FORMULA TO CALCULATE DISTANCE BASED ON USER LOCATION =============================

  // Set the default camera facing to back
  const [facing, setFacing] = useState<CameraType>("back");
  const captureInterval = 2000; // Interval for capturing images in milliseconds (2 seconds by default)
  const cameraRef = useRef<CameraView>(null);

  // Function for button to swap between camera and MxR
  const toggleMode = () => setIsMixedReality(!isMixedReality);

  // Get the screen width
  const [placement, setPlacement] = useState<"left" | "right">("right");

  // Variables for switch between satellite tracking and plane tracking
  const [isTrackingPlanes, setIsTrackingPlanes] = useState(true);
  const toggleTrackingPlanes = () => setIsTrackingPlanes(!isTrackingPlanes);
  const planeSwitchScale = 1.4; // Change this value to scale the switch

  // Tooltip Init
  const tooltipOffset = useRef(new Animated.Value(250)).current; // default on the right side
  const flipLeftDimensions = -175; // offset for left side
  const flipRightDimensions = 250; // offset for right side
  const flipDuration = 200; // duration for flip animation in ms
  const lastSide = useRef<"left" | "right">("right"); // track last position of tooltip

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
  const {
    position: bouncingPosition,
    width: boxWidth,
    height: boxHeight,
  } = useBouncingBox(240, 1000, 900, apiBox);

  // =================================== PING SERVER FUNCTION and GET THE USERS'S BOUNDING POINTS IF WE HAVE THEIR LOCATION ==================================
  // We don't want to automatially refresh the API, so we have a button to do it manually. This is just for rate limiting purposes.
  const refreshAircraftData = async () => {
    if (userLatitude !== null && userLongitude !== null) {
      const boundingPoints = getBoundingPoints(
        userLatitude,
        userLongitude,
        flightRadius
      );

      const northPoint = [
        boundingPoints.north[0].toFixed(3),
        boundingPoints.north[1].toFixed(3),
      ];
      const southPoint = [
        boundingPoints.south[0].toFixed(3),
        boundingPoints.south[1].toFixed(3),
      ];
      const westPoint = [
        boundingPoints.west[0].toFixed(3),
        boundingPoints.west[1].toFixed(3),
      ];
      const eastPoint = [
        boundingPoints.east[0].toFixed(3),
        boundingPoints.east[1].toFixed(3),
      ];

      try {
        const response = await fetch(
          `https://fr24api.flightradar24.com/api/live/flight-positions/full?bounds=${northPoint[0]},${southPoint[0]},${westPoint[1]},${eastPoint[1]}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              "Accept-Version": "v1",
              Authorization: `Bearer 019653fd-4687-73b7-8676-2813ddad5873|UnUs6oib9b7bnbjHToIHmSovQJ8CaEujhVsFYzKS4805cff7`,
            },
          }
        );
        const data = await response.json();

        console.log(JSON.stringify(data));

        setFlights(data.data ?? []);
      } catch (error) {
        console.log(error);
      }
    } else {
      console.log("User location not available");
    }
  };
  // =================================== END PING SERVER FUNCTION ==================================

  // ================================== INTERVAL FLIGHT UPDATE =====================================
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isAutoRefresh) {
      interval = setInterval(() => {
        refreshAircraftData();
      }, 6000); // 6 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isAutoRefresh]);
  // ================================== END INTERVAL FLIGHT UPDATE =================================

  // ================================== UPDATE FLIGHT IN VIEW WHEN USER HEADING CHANGES ============

  useEffect(() => {
    // console.log("Raw Heading:", rawHeading);
    if (userHeading !== null && userLatitude && userLongitude && isMixedReality) {
      const newFlight = getFlightInView(
        userLatitude,
        userLongitude,
        userHeading,
        flights,
        10
      );
      setFlightInView(newFlight);
      // console.log("User Heading:", userHeading);
      // console.log("Updated flightInView:", newFlight?.callsign ?? "None");
    }
  }, [userHeading, userLatitude, userLongitude, flights]);

  useEffect(() => {
    if (isMixedReality) {
      startCompass();
    } else {
      stopCompass();
    }
  }, [isMixedReality]);

  // ================================== END UPDATE FLIGHT IN VIEW WHEN USER HEADING CHANGES ========

  // ================================== OBJECT DETECTION API PAYLOAD ==================================
  const sendToObjectDetectionAPI = async (
    imageUri: string,
    imageWidth: number,
    imageHeight: number,
    previewWidth: number,
    previewHeight: number
  ) => {
  console.log('Image dimensions:', { imageWidth, imageHeight });
  console.log('Preview dimensions:', { previewWidth, previewHeight });

  // Calculate the actual crop factor by comparing image to preview ratios
  const imageAspect = imageWidth / imageHeight; 
  const previewAspect = previewWidth / previewHeight;

  let visibleImageWidth, visibleImageHeight, cropOffsetX, cropOffsetY;

  let cropFactor: number;
  
  if (imageAspect > previewAspect) {
    // Image is wider - preview shows full height, crops width
    visibleImageHeight = imageHeight; // Full height visible
    visibleImageWidth = imageHeight * previewAspect; // Only center portion of width visible
    cropOffsetX = (imageWidth - visibleImageWidth) / 2; // How much cropped from left/right
    cropOffsetY = 0; // No vertical cropping
  } else {
    // Image is taller - preview shows full width, crops height  
    visibleImageWidth = imageWidth; // Full width visible
    visibleImageHeight = imageWidth / previewAspect; // Only center portion of height visible
    cropOffsetX = 0; // No horizontal cropping
    cropOffsetY = (imageHeight - visibleImageHeight) / 2; // How much cropped from top/bottom
  }

  console.log('Visible area:', { 
    visibleImageWidth, 
    visibleImageHeight, 
    cropOffsetX, 
    cropOffsetY 
  });

  // Base scaling from image to preview
  const baseScaleX = previewWidth / imageWidth;
  const baseScaleY = previewHeight / imageHeight;

  const dontScale = false;

  const scalePoint = ([x, y]: [number, number]): [number, number] => {
    // Step 1: Check if coordinate is within visible area
    if (x < cropOffsetX || x > (cropOffsetX + visibleImageWidth) ||
        y < cropOffsetY || y > (cropOffsetY + visibleImageHeight)) {
      console.log('Coordinate outside visible area:', [x, y]);
      return [-1000, -1000]; // Return off-screen coordinates for invisible points
    }

    // Step 2: Adjust for crop offset (translate to visible area coordinate system)
    const adjustedX = x - cropOffsetX;
    const adjustedY = y - cropOffsetY;

    // Step 3: Scale to preview dimensions
    const scaledX = (adjustedX / visibleImageWidth) * previewWidth;
    const scaledY = (adjustedY / visibleImageHeight) * previewHeight;

    console.log('Coordinate mapping:', {
      original: [x, y],
      adjusted: [adjustedX, adjustedY],
      scaled: [scaledX.toFixed(1), scaledY.toFixed(1)]
    });

    return [scaledX, scaledY];
  };

  const formData = new FormData();
  formData.append("image", {
    uri: imageUri,
    name: "photo.jpg",
    type: "image/jpeg",
  } as any);

  let response;
  try {
    if (!OBJECTDETECTAPI) {
      throw new Error("OBJECTDETECTAPI endpoint is not defined");
    }
    response = await fetch(OBJECTDETECTAPI + "/api/proxy-box-corners", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }
  } catch (error) {
    console.error("Error sending image to object detection API:", error);
    return;
  }

  const result = await response.json();
  console.log(result);

  if (Array.isArray(result) && result.length > 0) {
    const box = result[0];
    const top_left = scalePoint(box.top_left);
    const top_right = scalePoint(box.top_right);
    const bottom_left = scalePoint(box.bottom_left);
    const bottom_right = scalePoint(box.bottom_right);

    console.log('Original coordinates:', box.top_left);
    console.log('Scaled coordinates:', top_left);

    const width = top_right[0] - top_left[0];
    const height = bottom_left[1] - top_left[1];

    setApiBox({
      top_left,
      top_right,
      bottom_left,
      bottom_right,
      width,
      height,
    });
  }
};

  // ================================== END OBJECT DETECTION API PAYLOAD ==================================

  // ================================== EDGE DETECTION FOR TOOLTIP ========================================
  // Edge detection listener for tooltip. If the box is on the left side, move the tooltip to the right, and vice versa.
  // useEffect(() => {
  //   const listenerId = bouncingPosition.x.addListener(({ value }) => {
  //     if (value > screenWidth - 450 && lastSide.current !== "left") {
  //       lastSide.current = "left";
  //       Animated.timing(tooltipOffset, {
  //         toValue: -230, // flip to left
  //         duration: flipDuration,
  //         easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  //         useNativeDriver: false,
  //       }).start();
  //     } else if (value < 240 && lastSide.current !== "right") {
  //       lastSide.current = "right";
  //       Animated.timing(tooltipOffset, {
  //         toValue: flipRightDimensions, // flip to right
  //         duration: flipDuration,
  //         easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  //         useNativeDriver: false,
  //       }).start();
  //     }
  //   });

  //   return () => {
  //     bouncingPosition.x.removeListener(listenerId);
  //   };
  // }, []);
  // ================================== END EDGE DETECTION FOR TOOLTIP ========================================

  // ================================== CAMERA CAPTURE LOGIC ==================================================
  // Here is where we capture images from the camera at a set interval
  
  useEffect(() => {
    // define the interval function for capturing images
    const interval = setInterval(async () => {
      // console.log("Interval running", { isMixedReality, permission, cameraRef: !!cameraRef.current });

      // we care that the user has granted permission to use of the camera, and that we're in mixed reality mode
      if (
        isMixedReality &&
        isFocused &&
        permission?.status === "granted" &&
        cameraRef.current
      ) {
        try {
          // capture an image from the camera, if able to and send to API
          const photo = await cameraRef.current.takePictureAsync();

          // Log photo captured with the photo's uri or a default name
          // console.log('photo captured', photo.uri || 'unnamed_photo'); // DEBUG PHOTO CAPTURE LOG
          if (photo.uri) {
            sendToObjectDetectionAPI(
              photo.uri,
              photo.width,
              photo.height,
              screenWidth,
              screenHeight
            );
          }
        } catch (error) {
          console.error("Error capturing photo:", error);
        }
      }
    }, captureInterval);
    return () => clearInterval(interval);
  }, [isMixedReality, isFocused, permission, cameraRef, captureInterval]);
  // ========================= END CAMERA CAPTURE LOGIC ========================================================

  // ========================= CAMERA DISPLAY & CONTROL ========================================================
  return (
    <View style={styles.container}>
      {/* Plane Tracking Toggle Switch */}
      <View
        style={{
          position: "absolute",
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
        permission?.status === "granted" ? (
          <>
            {/* Compass Heading at the top center of the screen */}

            <View
              style={{
                position: "absolute",
                top: 50,
                left: "50%",
                alignItems: "center",
                zIndex: 999,
              }}
            >
              <CompassHeading />
            </View>

            {flightInView && (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/search",
                    params: { flightNumber: flightInView.flight ?? "" },
                  })
                }
                style={{
                  position: "absolute",
                  top: 120,
                  left: "50%",
                  transform: [{ translateX: -150 }],
                  width: 300,
                  padding: 10,
                  backgroundColor: "rgba(0,0,0,0.7)",
                  borderRadius: 10,
                  zIndex: 999,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
                  {flightInView.callsign ?? "Unknown"}
                </Text>
                <Text style={{ color: "#ccc", fontSize: 14 }}>
                  Flight#: {flightInView.flight ?? "N/A"}
                </Text>
                <Text style={{ color: "#ccc", fontSize: 14 }}>
                  Origin: {flightInView.orig_iata ?? "N/A"}
                </Text>
                <Text style={{ color: "#ccc", fontSize: 14 }}>
                  Destination: {flightInView.dest_iata ?? "N/A"}
                </Text>
              </TouchableOpacity>
            )}
            <GestureDetector gesture={pinchGesture}>
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                zoom={zoomLevel}
                onLayout={(e) => {
                  const { width, height } = e.nativeEvent.layout;
                  setPreviewSize({ width, height });
                }}
              />
            </GestureDetector>

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
            {apiBox && (
              <Animated.View
                style={[
                  styles.infoBubble,
                  {
                    top: Animated.add(bouncingPosition.y, new Animated.Value(boxHeight + 10)),
                    left: Animated.add(bouncingPosition.x, new Animated.Value((boxWidth / 2) - (/* tooltipWidth */ 150))
                  ),
                },
              ]}
            >
              <BlurView intensity={50} tint="dark" style={styles.flightCard}>
                <Text style={styles.flightTitle}>{flightInView?.callsign ?? "Plane Detected"}</Text>
                <Text style={styles.route}>{flightInView?.orig_iata ?? "This is a false positive"}</Text>
                <Text style={styles.route}>{flightInView?.dest_iata ?? "or there is a plane detected and you need to"}</Text>
                <Text style={styles.arrival}>{flightInView?.eta ?? "update flight info"}</Text>
              </BlurView>
            </Animated.View>
            )}
          </>
        ) : (
          // all well and good, finish up this end - if we don't have permission, hence the else statement below (line beneath this one)
          <View style={styles.permissionContainer}>
            <Text>No access to camera</Text>
            <Button title="Grant Permission" onPress={requestPermission} />
          </View>
        )
      ) : (
        (userLongitude && userLatitude) && (
        // furthermore, if we're on the map screen, just show the map.
        <MapView
          style={styles.mapContainer}
          initialRegion={{
            latitude: userLatitude ?? 0,
            longitude: userLongitude ?? 0,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        >
          {/* Place marker at user's location if they have a latitude and longitude. */}
          {userLatitude && userLongitude && (
            <Marker
              coordinate={{ latitude: userLatitude, longitude: userLongitude }}
              title="Current Location"
            />
          )}
          {flights.map((flight) => (
            <Marker
              key={flight.fr24_id}
              coordinate={{ latitude: flight.lat, longitude: flight.lon }}
              title={
                flight.flight ||
                flight.callsign ||
                "Cannot determine flight name or callsign"
              }
              description={`Alt: ${flight.alt} ft, Spd: ${flight.gspeed} km/h, Orig: ${flight.orig_iata || flight.orig_icao || "Unknown"}, Dest: ${flight.dest_iata || flight.dest_icao || "Unknown"}`}
            >
              {/* Ionicons plane icon as marker */}
                <View style={{ alignItems: "center", justifyContent: "center" }}>
                <Ionicons
                  name="airplane"
                  size={28}
                  color="#007aff"
                  style={{
                  transform: [{ rotate: `${flight.track - 90}deg` }], // planes were flying sideways, -90 degrees corrects this
                  }}
                />
                </View>
            </Marker>
          ))}
        </MapView>
      ))}
      {/* Button to toggle between modes */}
      <View
        style={{
          position: "absolute",
          bottom: 50,
          left: "50%",
          transform: [
            { translateX: -35 + mixedRealityScale },
            { scale: mixedRealityScale },
          ],
          zIndex: 201,
        }}
      >
        <MixedRealityToggle
          value={isMixedReality}
          onToggle={toggleMixedReality}
        />
      </View>

      {/* Button to ping the API */}
      <View
        style={{
          position: "absolute",
          top: "10%",
          left: "10%",
          zIndex: 200,
        }}
      >
        <Button
          title="Refresh Aircraft Data"
          onPress={refreshAircraftData}
        />
      </View>

      {/* Button to toggle auto-refresh */}
      <View
        style={{
          position: "absolute",
          top: "16%",
          left: "10%",
          zIndex: 200,
        }}
      >
        <Button
          title={isAutoRefresh ? "Auto-Refresh ON" : "Auto-Refresh OFF"}
          onPress={toggleAutoRefresh}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: {
    flex: 1,
    backgroundColor: "#d0e0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: { fontSize: 20, color: "#555" },
  camera: {
    position: "absolute",
    top: 0,
    left: 0,
    width: screenWidth,
    height: screenHeight,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonContainer: {
    position: "absolute",
    bottom: "10%",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  redBox: {
    position: "absolute",
    width: 240,
    height: 240,
    borderColor: "red",
    borderWidth: 3,
    borderRadius: 8,
    backgroundColor: "transparent",
    zIndex: 99,
  },
  infoBubble: {
    position: "absolute",
    zIndex: 100,
  },
  flightCard: {
    transform: [{ scale: 0.75 }],
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.21)",
    backgroundColor: "rgba(255, 255, 255, 0.27)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 8,
    padding: 16,
    zIndex: 99,
  },
  flightTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  route: {
    color: "white",
    fontSize: 16,
    marginBottom: 4,
  },
  arrival: {
    color: "#eee",
    fontSize: 14,
    marginBottom: 8,
  },
  detailsButton: {
    backgroundColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: "center",
  },
  detailsText: {
    color: "#000",
    fontWeight: "600",
  },
});
