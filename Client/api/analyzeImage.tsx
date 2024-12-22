import axios from 'axios';

interface AnalyzeImageResponse {
    audio: string;
}

const analyzeImage = async (formData: FormData): Promise<AnalyzeImageResponse> => {
    try {
        const response = await fetch(
            `${process.env.EXPO_PUBLIC_API_URL}/analyze-image`,
            {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Axios error:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
            });
        } else {
            console.error('Unexpected error:', error);
        }
        throw error;
    }
}


export default analyzeImage

