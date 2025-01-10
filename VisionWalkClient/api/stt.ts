import { ServerResponse } from "@/types/db";
import axios from "axios";


const stt = async (audioFile: File): Promise<ServerResponse> => {
    try {
        const formData = new FormData()
        formData.append('file', audioFile);

        const response = await axios.post<ServerResponse>(`${process.env.EXPO_PUBLIC_API_URL}/stt`, formData, {
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