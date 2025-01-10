import { LocationData, NearbyUsersResponse } from "@/types/location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { EventEmitter } from "expo-location";


interface ApiError {
    message: string;
    status: number;
}

async function handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json()
    if (!response.ok) {
        if (response.status === 401) {
            await AsyncStorage.multiRemove(['@Auth:accessToken', '@Auth:refreshToken', '@Auth:user']);
            EventEmitter.emit('unauthorizedError');
        }
        throw {
            message: data.message || 'Something went wrong',
            status: response.status
        } as ApiError;
    }

    return data as T;
}

export async function fetchData<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await AsyncStorage.getItem('@Auth:accessToken')

    const defaultHeaders: HeadersInit = {}

    if (token) {
        defaultHeaders.Authorization = `Bearer ${token}`
    }

    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}${endpoint}`, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    })

    return handleResponse<T>(response)
}


export const authService = {
    async register(data: SignUpData): Promise<AuthResponse> {
        const formData = new FormData();
        formData.append('email', data.email);
        formData.append('password', data.password);
        formData.append('phoneNumber', data.phoneNumber);
        formData.append('displayName', data.displayName);
        formData.append('profileImage', {
            uri: data.profileImage.uri,
            name: data.profileImage.name,
            type: data.profileImage.type,
        } as any);

        return fetchData('/auth/register', {
            method: 'POST',
            body: formData
        });
    },
    async login(data: LoginData): Promise<AuthResponse> {
        const formData = new FormData();
        formData.append('email', data.email);
        formData.append('password', data.password);
        return fetchData<AuthResponse>('/auth/login', {
            method: 'POST',
            body: formData
        });
    }
}

export const userService = {
    async getProfile(): Promise<User> {
        return fetchData<User>('/users/profile', {
            method: 'GET'
        });
    },

    async updateProfile({ display_name, profileImage }: UpdateProfileData): Promise<User> {
        const formData = new FormData();
        formData.append('display_name', display_name);
        formData.append('profile_image', {
            uri: profileImage.uri,
            name: profileImage.name,
            type: profileImage.type
        } as any);

        return fetchData<User>('/users/profile', {
            method: 'PATCH',
            body: formData
        });
    }
}

export const locationService = {
    async updateLocation(location: LocationData) {
        return fetchData<{ status: string, message: string }>('/location/update-location', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(location)
        })
    },

    async broadcastLocation(location: LocationData) {

        return fetchData<{ status: string; message: string }>('/location/broadcast-location', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(location),
        });
    },

    async getNearbyUsers() {
        return fetchData<NearbyUsersResponse>('/location/nearby-users', {
            method: 'POST',
        });
    },
}


