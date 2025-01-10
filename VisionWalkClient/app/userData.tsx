import UserInfoCard from '@/components/Card'
import HistoryWrap from '@/components/HistoryWrap'
import { useAuth } from '@/context/AuthContext'
import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

const UserData = () => {
    const { aToken } = useAuth()
    const navigation = useNavigation()

    if (!aToken) {
        return (
            <View style={styles.container}>
                <View style={styles.welcomeContainer}>
                    <Text style={styles.welcomeText}>Welcome</Text>
                    <Text style={styles.subtitleText}>Please login or signup to continue</Text>
                </View>
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={() => navigation.navigate('login')}
                    >
                        <Text style={styles.buttonText}>Login</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.signupButton}
                        onPress={() => navigation.navigate('signUp')}
                    >
                        <Text style={[styles.buttonText, styles.signupText]}>Sign Up</Text>
                    </TouchableOpacity>
                </View>
            </View>
        )
    }

    return (
        <ScrollView style={styles.scrollView}>
            <UserInfoCard />
            <View style={styles.historyContainer}>
                <HistoryWrap />
            </View>
        </ScrollView>
    )
}

export default UserData

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 8
    },
    scrollView: {
        flex: 1,
        width: '100%',
        backgroundColor: '#fff',
    },
    welcomeContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    welcomeText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 10
    },
    subtitleText: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center'
    },
    buttonContainer: {
        width: '100%',
        gap: 16,
        marginBottom: 40
    },
    loginButton: {
        backgroundColor: 'rgb(6,182,212)',
        padding: 16,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center'
    },
    signupButton: {
        padding: 15,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgb(6,182,212)'
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff'
    },
    signupText: {
        color: 'rgb(6,182,212)'
    },
    historyContainer: {
        flex: 1,
        width: '100%',
        flexDirection: 'column',
        minHeight: 500,
        alignItems: 'flex-start',
        justifyContent: 'space-between'
    }
})