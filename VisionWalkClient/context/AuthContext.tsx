import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

    const [user, setUser] = useState<User | null>(null)
    const [aToken, setAccessToken] = useState<string | null>(null)
    const [rToken, setRefreshToken] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        loadStoredData()
    }, [])

    async function loadStoredData() {
        try {
            const [storedUser, storedAccessToken, storedRefreshToken] = await Promise.all([
                AsyncStorage.getItem('@Auth:user'),
                AsyncStorage.getItem('@Auth:accessToken'),
                AsyncStorage.getItem('@Auth:refreshToken')
            ]);

            if (storedUser && storedAccessToken && storedRefreshToken) {
                setUser(JSON.parse(storedUser));
                setAccessToken(storedAccessToken);
                setRefreshToken(storedRefreshToken)
            }
        } catch (error) {
            console.error('Error loading stored auth data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function login(accessToken: string, refreshToken: string, userData: User) {
        try {
            await Promise.all([
                AsyncStorage.setItem('@Auth:user', JSON.stringify(userData)),
                AsyncStorage.setItem('@Auth:accessToken', accessToken),
                AsyncStorage.setItem('@Auth:refreshToken', refreshToken)
            ])

            setUser(userData)
            setAccessToken(accessToken);
            setRefreshToken(refreshToken)
        } catch (error) {
            console.error('Error storing auth data:', error)
            throw new Error('Failed to sign in')
        }
    }

    async function logout() {
        try {
            await Promise.all([
                AsyncStorage.removeItem('@Auth:user'),
                AsyncStorage.removeItem('@Auth:accessToken'),
                AsyncStorage.removeItem('@Auth:refreshToken')
            ])

            setUser(null)
            setAccessToken(null)
            setRefreshToken(null)
        } catch (error) {
            console.error('Error removing auth data:', error);
            throw new Error('Failed to sign out');
        }
    }

    async function updateUser(userData: Partial<User>) {
        try {
            const updatedUser = user ? { ...user, ...userData } : null
            if (updatedUser) {
                await AsyncStorage.setItem('@Auth:user', JSON.stringify(updatedUser))
                setUser(updatedUser)
            }

        } catch (error) {
            console.error('Error updating user data:', error);
            throw new Error('Failed to update user');
        }
    }


    return (
        <AuthContext.Provider value={{
            user,
            aToken,
            rToken,
            loading,
            login,
            logout,
            updateUser
        }}>
            {children}
        </AuthContext.Provider>
    )
}

// Hook để sử dụng AuthContext
export function useAuth(): AuthContextData {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}




