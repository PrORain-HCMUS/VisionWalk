interface PhotoFile {
    uri: string;
    name: string;
    type: string;
}

interface SignUpData {
    email: string;
    password: string;
    phoneNumber: string;
    displayName: string;
    profileImage: {
        uri: string;
        name: string;
        type: string;
    };
}

interface LoginData {
    email: string;
    password: string;
}

interface AuthResponse {
    user: {
        id: string;
        email: string;
        displayName: string;
        profileImage: string;
        phoneNumber: string
    };
    access_token: string;
    refresh_token: string;
    message: string
}

interface UpdateProfileData {
    display_name: string;
    profileImage: {
        uri: string;
        name: string;
        type: string;
    };
}

interface User {
    id: string;
    email: string;
    displayName: string;
    profileImage: string;
    phoneNumber: string
}

interface AuthContextData {
    user: User | null;
    aToken: string | null;
    rToken: string | null;
    loading: boolean;
    login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (userData: Partial<User>) => Promise<void>;
}