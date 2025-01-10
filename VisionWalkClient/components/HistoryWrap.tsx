import { databaseHelper } from '@/db/databaseHelper';
import { HistoryItem } from '@/types/db';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    View
} from 'react-native';
import HistoryCard from './HistoryCard';

const HistoryWrap = () => {
    const db = useSQLiteContext();
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const loadHistoryItems = async () => {
        try {
            setLoading(true);
            const result = await databaseHelper.getHistoryItems(db, {
                offset: 0,
                limit: 1000 // Lấy số lượng lớn items hoặc có thể bỏ limit để lấy tất cả
            });
            setHistoryItems(result.items);
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHistoryItems();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadHistoryItems();
        setRefreshing(false);
    };

    const renderItem = ({ item }: { item: HistoryItem }) => (
        <View style={styles.itemContainer}>
            <HistoryCard
                id={item.id}
                imgUrl={item.imgUrl}
                text={item.text}
                audiobase64={item.audiobase64}
                createdAt={item.createdAt}
            />
        </View>
    );

    if (loading && historyItems.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>History</Text>
            </View>
            <FlatList
                scrollEnabled={false}  // Thêm dòng này
                data={historyItems}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                refreshing={refreshing}
                onRefresh={onRefresh}
                onEndReachedThreshold={0.5}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingLeft: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    itemContainer: {
        paddingVertical: 8,
        paddingLeft: 16,
    },
    listContent: {
        paddingVertical: 8,
    }
});

export default HistoryWrap;