import { useAuth } from '@/context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const UserInfoCard = () => {
    const { user, logout } = useAuth();
    const [imageError, setImageError] = useState(false);

    const isValidImageUrl = (url: string | undefined) => {
        if (!url) return false;
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    };

    const getImageSource = () => {
        if (!imageError && isValidImageUrl(user?.profileImage)) {
            return { uri: user?.profileImage };
        }
        return require('../assets/images/default-avatar.png');
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <View style={styles.headerLeft}>
                    <MaterialIcons name="person" size={24} color="#0F172A" />
                    <Text style={styles.headerTitle}>Profile</Text>
                </View>
                {/* <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => router.push('/editProfile' as Href)}
                >
                    <MaterialIcons name="edit" size={16} color="white" />
                    <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity> */}
            </View>

            <View style={styles.card}>
                {/* Avatar Section */}
                <View style={styles.avatarContainer}>
                    <Image
                        source={getImageSource()}
                        style={styles.avatar}
                        onError={() => setImageError(true)}
                    />
                    <View style={styles.statusIndicator} />
                </View>

                {/* User Info Section */}
                <View style={styles.userInfo}>
                    <Text style={styles.name}>
                        {user?.displayName || 'User Name'}
                    </Text>

                    <View style={styles.infoItem}>
                        <MaterialIcons name="phone" size={20} color="#64748B" />
                        <Text style={styles.infoText}>
                            {user?.phoneNumber || 'No phone number'}
                        </Text>
                    </View>

                    <View style={styles.infoItem}>
                        <MaterialIcons name="email" size={20} color="#64748B" />
                        <Text style={styles.infoText}>
                            {user?.email || 'No email'}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={logout}
                >
                    <MaterialIcons name="logout" size={20} color="#EF4444" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        padding: 16,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: 'rgb(6,182,212)',
    },
    editButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: '#F1F5F9',
    },
    statusIndicator: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#22C55E',
        borderWidth: 3,
        borderColor: 'white',
    },
    userInfo: {
        width: '100%',
        alignItems: 'center',
    },
    name: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 8,
        textAlign: 'center',
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    infoText: {
        fontSize: 14,
        color: '#64748B',
        flex: 1,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 24,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        backgroundColor: '#FEE2E2',
        width: '100%',
    },
    logoutText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default UserInfoCard;