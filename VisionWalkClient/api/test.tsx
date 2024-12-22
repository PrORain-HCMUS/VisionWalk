import axios from 'axios';

export const testConnection = async () => {
    try {
        const response = await axios.get(`${process.env.EXPO_PUBLIC_API_URL}/ping`);
        console.log('Connection test:', response.data);
    } catch (error) {
        console.error('Connection test failed:', error);
    }
};