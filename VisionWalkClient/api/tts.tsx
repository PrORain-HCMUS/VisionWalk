import { ServerResponse } from "@/utils/types"
import axios from "axios"

const tts = async (text: string): Promise<ServerResponse> => {
    try {
        const response = await axios.post<ServerResponse>(`${process.env.EXPO_PUBLIC_API_URL}/tts`, { text })
        return response.data
    } catch (error) {
        console.error('Error in TTS:', error)
        throw error
    }
}

export default tts

