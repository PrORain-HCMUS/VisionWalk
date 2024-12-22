import axios from "axios";

interface STTResponse {
    text: string
}

const stt = async (audioFile: File): Promise<STTResponse> => {
    try {
        const formData = new FormData()
        formData.append('file', audioFile);

        const response = await axios.post<STTResponse>(`${process.env.EXPO_PUBLIC_API_URL}/stt`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })

        return response.data
    } catch (error) {
        console.error('Error in STT:', error)
        throw error
    }
}

export default stt