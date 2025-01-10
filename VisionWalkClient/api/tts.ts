import { ServerResponse } from "@/types/db";

const tts = async (text: string): Promise<ServerResponse> => {
    try {
        const formData = new FormData();
        formData.append('text', text)

        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/tts`, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'multipart/form-data',
            }
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error in TTS:', error)
        throw error
    }
}

export default tts


export const translate_tts = async (text: string): Promise<ServerResponse> => {
    try {
        const formData = new FormData();
        formData.append('text', text)

        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/translate-tts`, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'multipart/form-data',
            }
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error in TTS:', error)
        throw error
    }
}

