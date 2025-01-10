export interface LocationData {
    latitude: number;
    longitude: number;
    accuracy: number;
    heading: number;
    speed: number;
}

export interface UserInfo {
    displayName: string;
    profileImage: string | null;
    email: string;
}

export interface UserStatus {
    online: boolean;
    last_seen: string;
}

export interface NearbyUser {
    id: string;
    info: UserInfo;
    location: {
        latitude: number;
        longitude: number;
    };
    distance: number;
    last_updated: string;
    status: UserStatus;
}

export interface NearbyUsersResponse {
    users: NearbyUser[];
    total_count: number;
}