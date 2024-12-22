import * as Device from 'expo-device';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';


const { width, height } = Dimensions.get('window');

const LocationMap: React.FC = () => {
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const webViewRef = useRef<WebView | null>(null);
    const [isTracking, setIsTracking] = useState<boolean>(false);

    const getCurrentLocation = async (): Promise<void> => {
        try {
            const currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Highest,
            })

            setLocation(currentLocation);

            if (webViewRef.current) {
                const { latitude, longitude } = currentLocation.coords;
                webViewRef.current.injectJavaScript(`
                    updateMarkerAndCenter(${latitude}, ${longitude});
                    true;
                `);
            }
        } catch (error) {
            console.error('Error getting current location:', error);
            setErrorMessage('Error getting location');
        }
    }

    useEffect(() => {
        const initialLocation = async () => {
            if (Platform.OS === 'android' && !Device.isDevice) {
                setErrorMessage('This will not work on an Android emulator. Try it on a real device.');
                return;
            }

            try {
                const { status } = await Location.requestForegroundPermissionsAsync()
                if (status !== 'granted') {
                    setErrorMessage('Permission to access location was denied');
                    return;
                }

                await getCurrentLocation()

                const locationSubscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.Highest,
                        distanceInterval: 10,
                        timeInterval: 5000
                    },
                    (newLocation) => {
                        setLocation(newLocation);
                        if (webViewRef.current && isTracking) {
                            const { latitude, longitude } = newLocation.coords;
                            webViewRef.current.injectJavaScript(`
                                updateMarker(${latitude}, ${longitude});
                                true;
                            `);
                        }
                    }
                )

                return () => {
                    if (locationSubscription) {
                        locationSubscription.remove();
                    }
                }

            } catch (error) {
                console.log('Error getting location:', error);
                setErrorMessage('Error getting location');
            }
        }

        initialLocation();
    }, [isTracking])


    const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
        <style>
            body { margin: 0; padding: 0; }
            #map { width: 100%; height: 100vh; }
            .location-marker {
                animation: pulse 1.5s infinite;
            }
            @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.3); opacity: 0.7; }
                100% { transform: scale(1); opacity: 1; }
            }
            </style>
        </head>
        <body>
            <div id="map"></div>
            <script>
            // Initialize map with a default view
            var map = L.map('map', {
                zoomControl: true,
                attributionControl: true
            }).setView([21.028511, 105.804817], 15);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            var marker;
            var circle;

            function updateMarkerAndCenter(lat, lng) {
                const position = [lat, lng];
                
                // Update or create marker
                if (marker) {
                marker.setLatLng(position);
                } else {
                marker = L.marker(position, {
                    title: 'Your Location',
                    riseOnHover: true
                }).addTo(map);
                }

                // Update or create accuracy circle
                if (circle) {
                circle.setLatLng(position);
                } else {
                circle = L.circle(position, {
                    radius: 50,
                    color: '#4A90E2',
                    fillColor: '#4A90E2',
                    fillOpacity: 0.2
                }).addTo(map);
                }

                // Center map on position
                map.setView(position, map.getZoom());
            }

            // Add location found handler
            map.on('locationfound', function(e) {
                updateMarkerAndCenter(e.latitude, e.longitude);
            });

            // Add location error handler
            map.on('locationerror', function(e) {
                console.error('Location error:', e.message);
            });
            </script>
        </body>
        </html>
    `;

    if (errorMessage) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <WebView
                ref={webViewRef}
                style={styles.map}
                source={{ html: htmlContent }}
                onError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.warn('WebView error: ', nativeEvent);
                }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                scalesPageToFit={true}
            />
            <TouchableOpacity
                style={styles.button}
                onPress={() => {
                    setIsTracking(!isTracking);
                    getCurrentLocation();
                }}
            >
                <Text style={styles.buttonText}>
                    {isTracking ? 'Stop Tracking' : 'Start Tracking'}
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, styles.centerButton]}
                onPress={getCurrentLocation}
            >
                <Text style={styles.buttonText}>Center Map</Text>
            </TouchableOpacity>
        </View>
    );
}

export default LocationMap;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    map: {
        width: width,
        height: height,
    },
    errorText: {
        fontSize: 16,
        color: 'red',
        textAlign: 'center',
        margin: 20,
    },
    button: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        backgroundColor: '#4A90E2',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    centerButton: {
        bottom: 90,
        backgroundColor: '#2ECC71',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
