import { ServerResponse } from "@/utils/types";


const analyzeImage = async (formData: FormData): Promise<ServerResponse> => {
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
        throw error;
    }
}


export default analyzeImage

