import { UserProfile } from '@/utils/types';
import * as FileSystem from 'expo-file-system';

const USER_PROFILE_FILE = `${FileSystem.documentDirectory}userProfile.json`
const IMAGES_DIRECTORY = `${FileSystem.documentDirectory}images/`

export const ensureDirectoryExists = async () => {
    const dirInfo = await FileSystem.getInfoAsync(IMAGES_DIRECTORY);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(IMAGES_DIRECTORY, { intermediates: true });
    }
};

export const saveUserProfile = async (profile: UserProfile) => {
    try {
        await ensureDirectoryExists()
        await FileSystem.writeAsStringAsync(USER_PROFILE_FILE, JSON.stringify(profile))
        return true
    } catch (error) {
        console.error('Error saving user profile:', error)
        return false
    }
}


export const loadUserProfile = async (): Promise<UserProfile | null> => {
    try {
        const fileExists = await FileSystem.getInfoAsync(USER_PROFILE_FILE)
        if (!fileExists) {
            return null
        }

        const content = await FileSystem.readAsStringAsync(USER_PROFILE_FILE)
        return JSON.parse(content)

    } catch (error) {
        console.error('Error loading user profile:', error)
        return null
    }
}

export const saveImageToLocal = async (imageUri: string): Promise<string> => {
    try {
        await ensureDirectoryExists()

        const filename = `profile_${Date.now()}.jpg`
        const newPath = `${IMAGES_DIRECTORY}${filename}`

        await FileSystem.copyAsync({
            from: imageUri,
            to: newPath
        })

        return newPath
    } catch (error) {
        console.error('Error saving image:', error)
        return ''
    }
}





