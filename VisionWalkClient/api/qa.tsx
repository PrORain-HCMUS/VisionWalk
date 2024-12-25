interface QAResponse {
    audio: string;
    text: string
}

const qa = async (formData: FormData): Promise<QAResponse> => {
    try {
        console.log('Fetching data...')
        const response = await fetch(
            `${process.env.EXPO_PUBLIC_API_URL}/qa`,
            {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'multipart/form-data',
                },
            }
        )
        console.log('Fetched data successfully!')
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        throw error;
    }
}

export default qa



