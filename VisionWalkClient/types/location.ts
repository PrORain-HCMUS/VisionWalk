import * as Location from 'expo-location';

export interface Coordinates {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    altitude: number | null;
    heading: number | null;
    speed: number | null;
    altitudeAccuracy: number | null;
}

export interface LocationData extends Location.LocationObject { }

export interface NearbyUser {
    user_id: string;
    location: {
        latitude: number;
        longitude: number;
        accuracy?: number;
        heading?: number;
        speed?: number;
    };
    distance: number;
    status: 'active' | 'inactive';
    last_updated?: string;
}

export interface LocationUpdate {
    type: 'location_update';
    user_id: string;
    location: {
        latitude: number;
        longitude: number;
        accuracy?: number;
        heading?: number;
        speed?: number;
    };
    distance: number;
    status: 'active' | 'inactive';
}

export interface ErrorMessage {
    type: 'error';
    message: string;
}

export type WebSocketMessage = LocationUpdate | ErrorMessage;

export interface LocationTrackingState {
    location: Location.LocationObject | null;
    nearbyUsers: NearbyUser[];
    isConnected: boolean;
    errorMsg: string | null;
}

export interface WebSocketConfig {
    serverUrl: string;
    wsUrl: string;
}