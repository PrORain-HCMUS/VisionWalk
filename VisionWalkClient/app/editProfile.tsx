import { UserProfile } from '@/utils/types'
import { loadUserProfile, saveImageToLocal, saveUserProfile } from '@/utils/userInfo'
import DateTimePicker from '@react-native-community/datetimepicker'
import * as ImagePicker from 'expo-image-picker'
import React, { useEffect, useState } from 'react'
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

const EditProfile = () => {
    const [profile, setProfile] = useState<UserProfile>({
        name: '',
        dateOfBirth: new Date().toISOString(),
        avatar: '',
        phoneNumber: ''
    })

    const [phoneError, setPhoneError] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false)

    useEffect(() => {
        loadInitialProfile()
    }, [])

    const loadInitialProfile = async () => {
        const savedProfile = await loadUserProfile()
        if (savedProfile) {
            setProfile(savedProfile)
        }
    }


    const pickImage = async () => {
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync()
        const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync()

        if (cameraPermission.status !== 'granted' || libraryPermission.status !== 'granted') {
            alert('Sorry, we need camera and media library permissions to make this work!');
            return;
        }

        Alert.alert(
            "Choose Your Avatar",
            "Would you like to take a new photo or choose from your library?",
            [
                {
                    text: "Camera",
                    onPress: () => launchCamera()
                },
                {
                    text: "Photo Library",
                    onPress: () => launchImageLibrary()
                },
                {
                    text: "Cancel",
                    style: "cancel"
                }
            ]
        )
    }

    const launchCamera = async () => {
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1
        })

        if (!result.canceled && result.assets[0].uri) {
            handleImageSelected(result.assets[0].uri)
        }
    }


    const launchImageLibrary = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1
        })

        if (!result.canceled && result.assets[0].uri) {
            handleImageSelected(result.assets[0].uri)
        }
    }


    const handleImageSelected = async (imgUri: string) => {
        const savedImagePath = await saveImageToLocal(imgUri)
        if (savedImagePath) {
            setProfile(prev => ({
                ...prev,
                avatar: savedImagePath
            }))
        }
    }

    const handleSave = async () => {
        const cleaned = profile.phoneNumber.replace(/[^0-9]/g, '')

        if (cleaned && cleaned.length < 10) {
            setPhoneError('Phone number must be at least 10 digits')
        } else {
            setPhoneError('')
            const success = await saveUserProfile(profile)
            if (success) {
                alert('Profile updated successfully!')
            } else {
                alert('Failed to update profile')
            }
        }
    }

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false)
        if (selectedDate) {
            setProfile(prev => ({
                ...prev,
                dateOfBirth: selectedDate.toISOString()
            }))
        }
    }


    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
                <Image
                    source={profile.avatar ? { uri: profile.avatar } : require('../assets/images/default-avatar.png')}
                    style={styles.avatar}
                />
                <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                    style={styles.input}
                    value={profile.name}
                    onChangeText={name => setProfile(prev => ({ ...prev, name }))}
                    placeholder="Enter your name"
                />
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Date of Birth</Text>
                <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}
                >
                    <Text>{new Date(profile.dateOfBirth).toLocaleDateString()}</Text>
                </TouchableOpacity>

                {showDatePicker && (
                    <DateTimePicker
                        value={new Date(profile.dateOfBirth)}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                    />
                )}
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                    style={[styles.input, phoneError ? styles.inputError : null]}
                    value={profile.phoneNumber}
                    onChangeText={(text) => {
                        setProfile(prev => ({ ...prev, phoneNumber: text }))

                    }}
                    keyboardType='phone-pad'
                    placeholder='Enter your phone number'
                    maxLength={10}
                />
                {phoneError && (
                    <Text style={styles.errorText}>{phoneError}</Text>
                )}
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
        </View>
    )
}

export default EditProfile

const styles = StyleSheet.create({
    container: {
        padding: 20
    },
    avatarContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20
    },
    avatar: {
        width: 150,
        height: 150,
        borderRadius: 75,
        marginBottom: 10
    },
    changePhotoText: {
        color: '#007AFF',
        textAlign: 'center',
        fontSize: 16
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        marginBottom: 5,
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 10,
        borderRadius: 5,
        backgroundColor: '#fff',
    },
    dateButton: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 10,
        borderRadius: 5,
        backgroundColor: '#fff',
    },
    saveButton: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 20,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    inputError: {
        borderColor: '#FF3B30',
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 12,
        marginTop: 5,
    },
});