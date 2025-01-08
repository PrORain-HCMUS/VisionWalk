import UserInfoCard from '@/components/Card'
import HistoryWrap from '@/components/HistoryWrap'
import React from 'react'
import { StyleSheet, View } from 'react-native'

const UserData = () => {
    return (
        <View style={styles.container}>
            <UserInfoCard />
            <View style={styles.historyContainer}>
                <HistoryWrap />
            </View>
        </View>
    )
}

export default UserData

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    historyContainer: {
        flex: 1,
        width: '100%',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'space-between'
    }
})
