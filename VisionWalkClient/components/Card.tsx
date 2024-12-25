import { UserProfile } from '@/utils/types';
import { loadUserProfile } from '@/utils/userInfo';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


const UserInfoCard = () => {

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const savedUser = await loadUserProfile()
            setProfile(savedUser)
        } catch (error) {
            console.error('Error loading profile:', error)
            setProfile(null)
        } finally {
            setLoading(false)
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        )
    }


    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>User Info</Text>
                <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => router.push('/editProfile')}
                >
                    <Text style={styles.editButtonText}>Change</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.card}>
                <View style={styles.userBasicInfo}>
                    <Image
                        source={
                            profile?.avatar
                                ? { uri: profile.avatar }
                                : require('../assets/images/default-avatar.png')
                        }
                        style={styles.avatar}
                    />
                    <View style={styles.nameContainer}>
                        <Text style={styles.name}>
                            {profile?.name || 'User Name'}
                        </Text>
                        <Text style={styles.phone}>
                            {profile?.phoneNumber || 'No phone number'}
                        </Text>
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.label}>Date of Birth</Text>
                    <Text style={styles.value}>
                        {profile?.dateOfBirth
                            ? new Date(profile.dateOfBirth).toLocaleDateString()
                            : 'Not set'}
                    </Text>
                </View>
            </View>
        </View>
    );
}

export default UserInfoCard

const styles = StyleSheet.create({
    container: {
        width: '100%',
        padding: 16,
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 200,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    editButton: {
        padding: 8,
        borderRadius: 6,
        backgroundColor: '#007AFF',
    },
    editButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    userBasicInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 16,
    },
    nameContainer: {
        flex: 1,
    },
    name: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    phone: {
        fontSize: 14,
        color: '#666',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        color: '#666',
    },
    value: {
        fontSize: 14,
        fontWeight: '500',
    },
});