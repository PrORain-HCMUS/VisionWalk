// hooks/useLocationTracking.tsx
import auth from '@react-native-firebase/auth';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    LocationTrackingState,
    NearbyUser,
    WebSocketConfig,
    WebSocketMessage
} from '../types/location';

const config: WebSocketConfig = {
    serverUrl: process.env.EXPO_PUBLIC_API_URL || '',
    wsUrl: process.env.EXPO_PUBLIC_WS_URL || ''
};

export const useLocationTracking = (): LocationTrackingState => {
    const [state, setState] = useState<LocationTrackingState>({
        location: null,
        nearbyUsers: [],
        isConnected: false,
        errorMsg: null
    });

    const websocket = useRef<WebSocket | null>(null);
    const locationSubscription = useRef<Location.LocationSubscription | null>(null);

    const handleNearbyUserUpdate = useCallback((data: WebSocketMessage) => {
        if (data.type === 'location_update') {
            setState(prev => ({
                ...prev,
                nearbyUsers: [
                    ...prev.nearbyUsers.filter(user => user.user_id !== data.user_id),
                    {
                        user_id: data.user_id,
                        location: data.location,
                        distance: data.distance,
                        status: data.status
                    }
                ]
            }));
        } else if (data.type === 'error') {
            setState(prev => ({ ...prev, errorMsg: data.message }));
        }
    }, []);

    const sendLocation = useCallback((location: Location.LocationObject) => {
        if (websocket.current?.readyState === WebSocket.OPEN) {
            const { coords } = location;
            websocket.current.send(JSON.stringify({
                latitude: coords.latitude,
                longitude: coords.longitude,
                accuracy: coords.accuracy || undefined,
                heading: coords.heading || undefined,
                speed: coords.speed || undefined,
            }));
        }
    }, []);

    const initializeWebSocket = useCallback(async () => {
        try {
            const token = await auth().currentUser?.getIdToken();
            if (!token) {
                throw new Error('No authentication token available');
            }

            websocket.current = new WebSocket(`${config.wsUrl}/ws/location/${token}`);

            websocket.current.onopen = () => {
                setState(prev => ({ ...prev, isConnected: true }));
                console.log('WebSocket Connected');
            };

            websocket.current.onclose = () => {
                setState(prev => ({ ...prev, isConnected: false }));
                console.log('WebSocket Disconnected - Retrying in 5s');
                setTimeout(initializeWebSocket, 5000);
            };

            websocket.current.onerror = (error: Event) => {
                console.error('WebSocket error:', error);
                setState(prev => ({ ...prev, errorMsg: 'Connection error' }));
            };

            websocket.current.onmessage = (event: MessageEvent) => {
                try {
                    const data = JSON.parse(event.data) as WebSocketMessage;
                    handleNearbyUserUpdate(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
        } catch (error) {
            console.error('Error initializing WebSocket:', error);
            setState(prev => ({
                ...prev,
                errorMsg: 'Failed to initialize connection'
            }));
        }
    }, [handleNearbyUserUpdate]);

    const fetchInitialNearbyUsers = useCallback(async () => {
        try {
            const token = await auth().currentUser?.getIdToken();
            const response = await fetch(
                `${config.serverUrl}/nearby-users?token=${token}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch nearby users');
            }

            const data = await response.json() as NearbyUser[];
            setState(prev => ({ ...prev, nearbyUsers: data }));
        } catch (error) {
            console.error('Error fetching nearby users:', error);
            setState(prev => ({
                ...prev,
                errorMsg: 'Failed to fetch nearby users'
            }));
        }
    }, []);

    const startLocationTracking = useCallback(async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setState(prev => ({
                    ...prev,
                    errorMsg: 'Permission to access location was denied'
                }));
                return;
            }

            // Get initial location
            const currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.BestForNavigation,
            });

            setState(prev => ({ ...prev, location: currentLocation }));
            sendLocation(currentLocation);

            // Start watching position
            locationSubscription.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.BestForNavigation,
                    distanceInterval: 10,
                    timeInterval: 5000,
                },
                (newLocation) => {
                    setState(prev => ({ ...prev, location: newLocation }));
                    sendLocation(newLocation);
                }
            );
        } catch (error) {
            console.error('Error starting location tracking:', error);
            setState(prev => ({
                ...prev,
                errorMsg: 'Failed to start location tracking'
            }));
        }
    }, [sendLocation]);

    useEffect(() => {
        startLocationTracking();
        initializeWebSocket();
        fetchInitialNearbyUsers();

        return () => {
            locationSubscription.current?.remove();
            websocket.current?.close();
        };
    }, [startLocationTracking, initializeWebSocket, fetchInitialNearbyUsers]);

    return state;
};