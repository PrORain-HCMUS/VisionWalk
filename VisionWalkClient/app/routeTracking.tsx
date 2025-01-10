import { locationService } from '@/api/api';
import BottomSheet from '@/components/BottomSheet';
import { useAuth } from '@/context/AuthContext';
import useLocateNavigation from '@/hooks/useLocationTracking';
import { LocationData, NearbyUser } from '@/types/location';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface Instruction {
    text: string;
    distance: number;
    coordinates: {
        latitude: number;
        longitude: number;
    };
}

const { width, height } = Dimensions.get('window');

const LocationMap: React.FC = () => {
    const { user } = useAuth()
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [searchText, setSearchText] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [routeInfo, setRouteInfo] = useState<{ distance: string, duration: string } | null>(null);
    const webViewRef = useRef<WebView | null>(null);
    const [routeInstructions, setRouteInstructions] = useState<Instruction[]>([]);
    const [isNavigating, setIsNavigating] = useState<boolean>(false);
    const { currentInstruction, playInstruction } = useLocateNavigation({
        instructions: routeInstructions,
        isNavigating
    });


    const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
    const [showNearbyPanel, setShowNearbyPanel] = useState(false);
    const slideAnimation = useRef(new Animated.Value(0)).current;
    const backdropAnimation = useRef(new Animated.Value(0)).current;

    const getNearbyUsers = async (): Promise<void> => {
        try {
            if (user) {
                const data = await locationService.getNearbyUsers()
                console.log('Got nearby users data:', data);

                if (!data || !Array.isArray(data.users)) {
                    throw new Error('Invalid data format from getNearbyUsers');
                }

                setNearbyUsers(data["users"].filter((user) => user.status.online))

                let curText = "";
                data["users"].forEach(user => {
                    if (user.status.online) {
                        curText += `${user.info.displayName} cách bạn ${Math.floor(user.distance * 1000)} mét. `;
                    }
                });
                if (!curText) {
                    curText = "Hiện không có người nào xung quanh bạn"
                }

                playInstruction(curText, false)
            }
        } catch (error) {
            console.error('Error getting nearby users:', error)
            setErrorMessage('Error getting nearby users')
            throw error
        }
    }

    const toggleNearbyPanel = async () => {
        if (showNearbyPanel) {
            Animated.parallel([
                Animated.timing(slideAnimation, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: false,
                }),
                Animated.timing(backdropAnimation, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: false,
                }),
            ]).start(() => {
                setShowNearbyPanel(false);
                setNearbyUsers([]); // Clear users when closing
            });
        } else {
            setIsLoading(true);
            try {
                await getNearbyUsers();

                setShowNearbyPanel(true);
                Animated.parallel([
                    Animated.spring(slideAnimation, {
                        toValue: 1,
                        useNativeDriver: false,
                        friction: 8,
                    }),
                    Animated.spring(backdropAnimation, {
                        toValue: 1,
                        useNativeDriver: false,
                        friction: 8,
                    }),
                ]).start();
            } catch (error) {
                console.error('Error in toggleNearbyPanel:', error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const isValidImageUrl = (url: string | undefined) => {
        if (!url) return false;
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    };

    const getImageSource = (url: string) => {
        if (isValidImageUrl(url)) {
            return { uri: url };
        }
        return require('../assets/images/default-avatar.png');
    };

    const getCurrentLocation = async (): Promise<void> => {
        try {
            const currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Highest,
            });

            setLocation(currentLocation);

            if (webViewRef.current) {
                const { latitude, longitude } = currentLocation.coords;
                webViewRef.current.injectJavaScript(`
                    updateCurrentLocation(${latitude}, ${longitude});
                    true;
                `);
            }

            const curLocation = {
                "latitude": currentLocation.coords.latitude,
                "longitude": currentLocation.coords.longitude,
                "accuracy": currentLocation.coords.accuracy,
                "heading": currentLocation.coords.heading,
                "speed": currentLocation.coords.speed
            } as LocationData

            if (user) {
                await locationService.updateLocation(curLocation);
            }
        } catch (error) {
            console.error('Error getting current location:', error);
            setErrorMessage('Error getting location');
        }
    };

    const searchLocation = async () => {
        if (!searchText.trim()) return;

        setIsLoading(true);
        setErrorMessage(null);
        setRouteInfo(null);

        try {
            // Use OpenStreetMap Nominatim API for better search results
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}&limit=1`,
                {
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'VisionWalk/1.0'
                    }
                }
            );
            const data = await response.json();

            if (data && data.length > 0) {
                const { lat, lon } = data[0];

                if (location && webViewRef.current) {
                    const startLat = location.coords.latitude;
                    const startLng = location.coords.longitude;

                    webViewRef.current.injectJavaScript(`
                        calculateWalkingRoute(${startLat}, ${startLng}, ${lat}, ${lon}, "${data[0].display_name}");
                        true;
                    `);
                }
            } else {
                setErrorMessage('Location not found');
            }
        } catch (error) {
            console.error('Error searching location:', error);
            setErrorMessage('Error searching location');
        } finally {
            setIsLoading(false);
        }
    };

    const navigateToUser = async (user: NearbyUser) => {
        if (location && webViewRef.current) {
            const startLat = location.coords.latitude;
            const startLng = location.coords.longitude;
            const { latitude: endLat, longitude: endLng } = user.location;

            toggleNearbyPanel()

            webViewRef.current.injectJavaScript(`
                calculateWalkingRoute(
                    ${startLat},
                    ${startLng},
                    ${endLat},
                    ${endLng},
                    "${user.info.displayName}"
                );
                true;
            `);
        }
    }

    useEffect(() => {
        let locationSubscription: Location.LocationSubscription;

        const setupLocation = async () => {
            if (Platform.OS === 'android' && !Device.isDevice) {
                setErrorMessage('This will not work on an Android emulator. Try it on a real device.');
                return;
            }
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setErrorMessage('Permission to access location was denied');
                    return;
                }

                await getCurrentLocation();

                // Set up location updates
                locationSubscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.Balanced,
                        timeInterval: 5000,
                        distanceInterval: 10,
                    },
                    async (newLocation) => {
                        setLocation(newLocation);
                        const curLocation = {
                            "latitude": newLocation.coords.latitude,
                            "longitude": newLocation.coords.longitude,
                            "accuracy": newLocation.coords.accuracy,
                            "heading": newLocation.coords.heading,
                            "speed": newLocation.coords.speed
                        } as LocationData

                        if (user) {
                            await locationService.updateLocation(curLocation);
                        }
                    }
                );

            } catch (error) {
                console.error('Error setting up location:', error);
                setErrorMessage('Error setting up location');
            }
        };

        setupLocation();
        return () => {
            if (locationSubscription) {
                locationSubscription.remove();
            }
            setIsNavigating(false);
        };
    }, [user]);

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
            <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
            <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
            <script src="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js"></script>
            <style>
                body { 
                    margin: 0; 
                    padding: 0; 
                }
                #map { 
                    width: 100%; 
                    height: 100vh; 
                }
                .custom-popup { 
                    font-size: 14px; 
                }
                /* Định vị lại control routing */
                .leaflet-routing-container {
                    position: fixed !important;
                    top: 100px !important;  /* Đặt vị trí phía trên thanh search */
                    left: 10px !important;
                    right: 10px !important;
                    width: calc(100% - 20px) !important;
                    max-height: 332px !important;
                    overflow-y: auto !important;
                    background-color: white !important;
                    border-radius: 8px !important;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
                    padding: 10px !important;
                    font-size: 14px !important;
                    z-index: 1000 !important;
                    transition: all 0.3s ease !important
                }

                .leaflet-routing-container.leaflet-routing-container-hide::before {
                    content: "\\f4d7" !important;  /* Mã Unicode của icon route trong Font Awesome */
                    font-family: "Font Awesome 6 Free" !important;
                    font-weight: 900 !important;
                    font-size: 18px !important;
                    color: #666666 !important;
                }

                /* Style cho container khi ẩn */
                .leaflet-routing-container.leaflet-routing-container-hide {
                    width: 32px !important;
                    height: 32px !important;
                    top: 90px !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                    border-radius: 4px !important;
                    cursor: pointer !important;
                    background-color: white !important;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }

                /* Style cho nút collapse/expand */
                .leaflet-routing-collapse-btn {
                    position: absolute !important;
                    top: 5px !important;
                    right: 5px !important;
                    width: 25px !important;
                    height: 25px !important;
                    background: none !important;
                    border: none !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    font-size: 20px !important;
                    color: #666 !important;
                    cursor: pointer !important;
                    z-index: 1001 !important;
                    padding: 0 !important;
                    text-align: center !important;
                    line-height: 25px !important;
                }

                .leaflet-routing-container h3 {
                    display: none !important;
                }

                /* Ẩn nội dung khi thu gọn */
                .leaflet-routing-container-hide .leaflet-routing-alt {
                    display: none !important;
                }

                /* Style cho alternatives */
                .leaflet-routing-alt {
                    max-height: none !important;
                    border-bottom: none !important;
                    padding: 0 !important;
                }

                /* Style cho từng instruction */
                .leaflet-routing-alt tr {
                    padding: 5px 0 !important;
                }

                .leaflet-routing-alt td {
                    padding: 8px 0 !important;
                }

                /* Style cho bảng chỉ dẫn */
                .leaflet-routing-alt table {
                    width: 100% !important;
                }

                /* Ẩn các phần không cần thiết */
                .leaflet-routing-geocoders {
                    display: none !important;
                }
            </style>
        </head>
        <body>
            <div id="map"></div>
            <script>
                let map = L.map('map').setView([21.028511, 105.804817], 15);
                let currentMarker, destinationMarker, routingControl;
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(map);

                

                function updateCurrentLocation(lat, lng) {
                    const position = [lat, lng];
                    
                    if (currentMarker) {
                        currentMarker.setLatLng(position);
                    } else {
                        currentMarker = L.marker(position, {
                            title: 'Your Location'
                        }).addTo(map);
                    }

                    map.setView(position, 15);
                }

                function formatDuration(minutes) {
                    const d = Math.floor(minutes / 1440)
                    const h = Math.floor((minutes - d * 1440) / 60)
                    const min = minutes - 60 * h - 1440 * d
                    let res = ''
                    if (d > 0) {
                        res = res + d + " d "
                    }
                    if (h > 0) {
                        res = res + h + " h "
                    }

                    if (min > 0) {
                        res = res + min + " min"
                    }
                    return res || "1 min"
                }

                function calculateWalkingRoute(startLat, startLng, endLat, endLng, locationName) {
                    // Remove existing route if any
                    if (routingControl) {
                        map.removeControl(routingControl);
                    }
                    if (destinationMarker) {
                        map.removeLayer(destinationMarker);
                    }

                    // Add destination marker
                    destinationMarker = L.marker([endLat, endLng], {
                        title: locationName
                    }).addTo(map);
                    destinationMarker.bindPopup(
                        '<div class="custom-popup"><strong>' + locationName + '</strong></div>'
                    ).openPopup();

                    // Create routing control
                    routingControl = L.Routing.control({
                        waypoints: [
                            L.latLng(startLat, startLng),
                            L.latLng(endLat, endLng)
                        ],
                        lineOptions: {
                            styles: [{
                                color: '#4A90E2',
                                weight: 6,
                                opacity: 0.8
                            }]
                        },
                        showAlternatives: false,
                        addWaypoints: false,
                        draggableWaypoints: false,
                        fitSelectedRoutes: true,
                        show: true
                    }).addTo(map);

                    // Listen for route calculation completion
                    routingControl.on('routesfound', function(e) {
                        const routes = e.routes;
                        const route = routes[0]; // Get the first (best) route
                        
                        const instructions = route.instructions.map((instruction, index) => {
                            const coords = route.coordinates[instruction.index];
                            return {
                                text: instruction.text,
                                distance: instruction.distance,
                                coordinates: {
                                    latitude: coords.lat,
                                    longitude: coords.lng
                                }
                            };
                        });

                        // Calculate distance in kilometers and duration in minutes
                        const meterPerStrike = 4.5
                        const distanceKm = (route.summary.totalDistance / 1000).toFixed(2);
                        const durationMin = Math.floor((distanceKm * 60) / meterPerStrike);

                        // Send route info back to React Native
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'routeInfo',
                            distance: distanceKm,
                            duration: formatDuration(durationMin),
                            instructions: instructions
                        }));

                        // Fit the map to show the entire route
                        map.fitBounds(L.latLngBounds([
                            [startLat, startLng],
                            [endLat, endLng]
                        ]).pad(0.1));
                    });

                    // Handle routing errors
                    routingControl.on('routingerror', function(e) {
                        console.error('Routing error:', e);
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'error',
                            message: 'Không thể tìm được đường đi. Vui lòng thử lại.'
                        }));
                    });
                }
            </script>
        </body>
        </html>
    `;


    return (
        <View style={styles.container}>
            {/* Search bar */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Nhập địa điểm cần tìm..."
                    value={searchText}
                    onChangeText={setSearchText}
                    onSubmitEditing={searchLocation}
                />
                <TouchableOpacity
                    style={styles.searchButton}
                    onPress={searchLocation}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={styles.buttonText}>Tìm</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Route information */}
            {routeInfo && (
                <>
                    <View style={styles.routeInfoContainer}>
                        <Text style={styles.routeInfoText}>
                            Khoảng cách: {routeInfo.distance} km
                        </Text>
                        <Text style={styles.routeInfoText}>
                            Thời gian đi bộ: {routeInfo.duration}
                        </Text>
                        <TouchableOpacity
                            style={styles.navigationButton}
                            onPress={() => setIsNavigating(prev => !prev)}
                        >
                            <Text style={styles.buttonText}>
                                {isNavigating ? 'Dừng dẫn đường' : 'Bắt đầu dẫn đường'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}


            {/* Hiển thị instruction hiện tại khi đang điều hướng */}
            {isNavigating && currentInstruction < routeInstructions.length && (
                <View style={styles.currentInstructionContainer}>
                    <Text style={styles.currentInstructionText}>
                        {routeInstructions[currentInstruction].text}
                    </Text>
                </View>
            )}


            {/* Error message */}
            {errorMessage && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
            )}

            {/* Map */}
            <WebView
                ref={webViewRef}
                style={styles.map}
                source={{ html: htmlContent }}
                onError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.warn('WebView error: ', nativeEvent);
                }}
                onMessage={(event) => {
                    try {
                        const data = JSON.parse(event.nativeEvent.data);
                        if (data.type === 'routeInfo') {
                            setRouteInfo({
                                distance: data.distance,
                                duration: data.duration
                            });

                            if (Array.isArray(data.instructions)) {
                                setRouteInstructions(data.instructions);
                            } else {
                                console.error('Instructions is not an array:', data.instructions);
                            }
                            setErrorMessage(null);
                        } else if (data.type === 'error') {
                            setErrorMessage(data.message);
                            setRouteInfo(null);
                            setRouteInstructions([]);
                        }
                    } catch (error) {
                        console.error('Error parsing message:', error);
                    }
                }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                scalesPageToFit={true}
            />

            <TouchableOpacity
                style={[
                    styles.findNearbyButton,
                    routeInfo ? { bottom: 150 } : { bottom: 16 }
                ]}
                onPress={toggleNearbyPanel}
            >
                <Text style={styles.buttonText}>
                    {showNearbyPanel ? 'Đóng' : 'Tìm lân cận'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.myLocationButton,
                    routeInfo ? { bottom: 150 } : { bottom: 16 }
                ]}
                onPress={getCurrentLocation}
            >
                <Text style={styles.buttonText}>Vị trí của tôi</Text>
            </TouchableOpacity>

            <BottomSheet
                isVisible={showNearbyPanel}
                onClose={toggleNearbyPanel}
                users={nearbyUsers}
                isLoading={isLoading}
                onUserPress={navigateToUser}
                getImageSource={getImageSource}
            />

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    searchContainer: {
        position: 'absolute',
        top: 40,
        left: 10,
        right: 10,
        zIndex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 5,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    searchInput: {
        flex: 1,
        height: 40,
        paddingHorizontal: 10,
        backgroundColor: '#fff',
        borderRadius: 8,
        fontSize: 16,
    },
    searchButton: {
        marginLeft: 10,
        backgroundColor: '#4A90E2',
        padding: 10,
        borderRadius: 8,
        minWidth: 60,
        alignItems: 'center',
    },
    map: {
        width: width,
        height: height,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 10,
    },
    findNearbyButton: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        backgroundColor: '#4A90E2',
        padding: 15,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        minWidth: 120,
        alignItems: 'center',
        zIndex: 1,
    },
    myLocationButton: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: '#2ECC71',
        padding: 15,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        minWidth: 120,
        alignItems: 'center',
        zIndex: 1,
    },
    routeInfoContainer: {
        position: 'absolute',
        bottom: 15, // Đặt vị trí dưới nút "Vị trí của tôi"
        left: 10,
        right: 10,
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 15,
        zIndex: 1,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    routeInfoText: {
        fontSize: 14,
        color: '#333',
        marginVertical: 2,
        textAlign: 'center', // Căn giữa text
        fontWeight: '500', // Làm đậm text một chút
    },
    errorContainer: {
        position: 'absolute',
        top: 100,
        left: 10,
        right: 10,
        zIndex: 1,
        backgroundColor: 'rgba(255, 59, 48, 0.9)',
        borderRadius: 8,
        padding: 10,
    },
    errorText: {
        color: 'white',
        textAlign: 'center',
        fontSize: 14,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#000',
        zIndex: 10,
    },
    bottomSheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 5,
        elevation: 5,
        zIndex: 11,
        maxHeight: '80%',
    },
    dragHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#E0E0E0',
        borderRadius: 3,
        alignSelf: 'center',
        marginTop: 10,
    },
    bottomSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    bottomSheetTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2C3E50',
    },
    bottomSheetContent: {
        padding: 15,
    },
    closeButton: {
        padding: 8,
        borderRadius: 20,
    },
    closeButtonText: {
        fontSize: 20,
        color: '#95A5A6',
        fontWeight: '500',
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0'
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    avatarText: {
        fontSize: 20,
        color: '#7F8C8D',
        fontWeight: 'bold',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#2C3E50',
        marginBottom: 4,
    },
    userDistance: {
        fontSize: 14,
        color: '#7F8C8D',
        marginBottom: 2,
    },
    userStatus: {
        fontSize: 12,
    },
    noUsersText: {
        textAlign: 'center',
        color: '#7F8C8D',
        fontSize: 14,
        marginTop: 20,
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#7F8C8D',
        fontSize: 14,
    },
    navigationButton: {
        backgroundColor: '#4A90E2',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    navigationButtonActive: {
        backgroundColor: '#E74C3C',
    },
    currentInstructionContainer: {
        position: 'absolute',
        top: 100,
        left: 10,
        right: 10,
        backgroundColor: 'rgba(74, 144, 226, 0.9)',
        borderRadius: 8,
        padding: 15,
        zIndex: 1,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    currentInstructionText: {
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
        fontWeight: '500',
    },

})

export default LocationMap;