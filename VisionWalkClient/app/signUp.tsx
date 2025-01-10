import { authService } from '@/api/api';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const SignupScreen = () => {
    const navigation = useNavigation();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        displayName: '',
        phoneNumber: ''
    });
    const [photoFile, setPhotoFile] = useState<PhotoFile | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth()

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled && result.assets[0]) {
            const photo = result.assets[0]
            const formattedPhoto = {
                uri: Platform.OS === 'android' ? photo.uri : photo.uri.replace('file://', ''),
                name: 'photo.jpg',
                type: 'image/jpeg',
            } as PhotoFile;
            setPhotoFile(formattedPhoto);
        }
    };

    const handleSignup = async () => {
        try {
            setError('');
            setLoading(true);

            if (!formData.email || !formData.password || !formData.displayName) {
                throw new Error('Please fill in all required fields');
            }
            if (formData.password !== formData.confirmPassword) {
                throw new Error('Passwords do not match');
            }
            if (!photoFile) {
                throw new Error('Please select a profile image');
            }

            const cleaned = formData.phoneNumber.replace(/[^0-9]/g, '')

            if (cleaned && cleaned.length < 10) {
                throw new Error('Phone number must be at least 10 digits')
            }

            const signupData: SignUpData = {
                email: formData.email,
                password: formData.password,
                phoneNumber: cleaned,
                displayName: formData.displayName,
                profileImage: {
                    uri: photoFile.uri,
                    name: photoFile.name,
                    type: photoFile.type,
                }
            };

            const data = await authService.register(signupData);

            await login(data["access_token"], data["refresh_token"], data["user"])
            navigation.navigate('userData');
        } catch (err: any) {
            setError(err.message || 'Failed to sign up');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.title}>Create Account</Text>

                {/* Avatar Picker */}
                <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
                    {photoFile ? (
                        <Image
                            source={{ uri: photoFile.uri }}
                            style={styles.profileImage}
                        />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <Text style={styles.imagePlaceholderText}>Add Photo</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Form Fields */}
                <View style={styles.formContainer}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.email}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                            placeholder="Enter your email"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Display Name</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.displayName}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, displayName: text }))}
                            placeholder="Enter your display name"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.phoneNumber}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, phoneNumber: text }))}
                            placeholder="Enter your phonenumber"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.password}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
                            placeholder="Enter your password"
                            secureTextEntry
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.confirmPassword}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, confirmPassword: text }))}
                            placeholder="Confirm your password"
                            secureTextEntry
                        />
                    </View>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleSignup}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>
                            {loading ? 'Creating account...' : 'Sign Up'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.loginLink}
                        onPress={() => navigation.navigate('login')}
                    >
                        <Text style={styles.loginText}>
                            Already have an account? Login
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContainer: {
        flexGrow: 1,
        padding: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
        color: '#1f2937',
    },
    imageContainer: {
        marginBottom: 20,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    imagePlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderStyle: 'dashed',
    },
    imagePlaceholderText: {
        color: '#6b7280',
        fontSize: 14,
    },
    formContainer: {
        width: '100%',
        maxWidth: 400,
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        color: '#4b5563',
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#f9fafb',
    },
    button: {
        backgroundColor: 'rgb(6,182,212)',
        padding: 16,
        borderRadius: 8,
        marginTop: 20,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
    },
    errorText: {
        color: '#ef4444',
        marginTop: 8,
        textAlign: 'center',
    },
    loginLink: {
        marginTop: 16,
        alignItems: 'center',
    },
    loginText: {
        color: 'rgb(6,182,212)',
        fontSize: 14,
    },
});

export default SignupScreen;