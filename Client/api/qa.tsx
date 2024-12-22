import axios from "axios";

interface QARequest {
    question: string
}

interface QAResponse {
    answer: string;
}

const qa = async (question: string): Promise<QAResponse> => {
    try {
        const response = await axios.post<QAResponse>(`${process.env.EXPO_PUBLIC_API_URL}/qa`, { question })
        return response.data
    } catch (error) {
        console.error('Error in QA:', error)
        throw error
    }
}

export default qa



