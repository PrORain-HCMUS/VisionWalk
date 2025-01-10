import * as FileSystem from 'expo-file-system';

const USER_PROFILE_FILE = `${FileSystem.documentDirectory}userProfile.json`
const IMAGES_DIRECTORY = `${FileSystem.documentDirectory}images/`

export const ensureDirectoryExists = async () => {
    const dirInfo = await FileSystem.getInfoAsync(IMAGES_DIRECTORY);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(IMAGES_DIRECTORY, { intermediates: true });
    }
};

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





