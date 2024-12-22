import axios from "axios"

interface TTSRequest {
    text: string
}

interface TTSResponse {
    audio_content: string
}

const tts = async (text: string): Promise<TTSResponse> => {
    try {
        const response = await axios.post<TTSResponse>(`${process.env.EXPO_PUBLIC_API_URL}/tts`, { text })
        return response.data
    } catch (error) {
        console.error('Error in TTS:', error)
        throw error
    }
}

export default tts

