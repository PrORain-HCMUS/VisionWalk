// components/HistoryWrap.tsx
import { databaseHelper } from '@/db/databaseHelper';
import { HistoryItem } from '@/utils/types';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    StyleSheet,
    Text,
    View,
    ViewToken
} from 'react-native';
import HistoryCard from './HistoryCard';

const { width: screenWidth } = Dimensions.get('window');
const ITEMS_PER_PAGE = 10;

// Tạo Animated FlatList
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<HistoryItem>);

const HistoryWrap = () => {
    const db = useSQLiteContext();
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef<FlatList>(null);

    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    useEffect(() => {
        loadPage(currentPage);
    }, [currentPage]);

    const loadPage = async (page: number) => {
        try {
            setLoading(true);
            const result = await databaseHelper.getHistoryItems(db, {
                offset: page * ITEMS_PER_PAGE,
                limit: ITEMS_PER_PAGE
            });

            setHistoryItems(result.items);
            setTotalItems(result.total);
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderPage = ({ item }: { item: HistoryItem }) => (
        <View style={[styles.page, { width: screenWidth }]}>
            <HistoryCard
                id={item.id}
                imgUrl={item.imgUrl}
                text={item.text}
                audiobase64={item.audiobase64}
            />
        </View>
    );

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0) {
            setCurrentPage(viewableItems[0].index || 0);
        }
    }).current;

    const renderPaginationDots = () => (
        <View style={styles.pagination}>
            {Array.from({ length: totalPages }).map((_, index) => {
                const inputRange = [
                    (index - 1) * screenWidth,
                    index * screenWidth,
                    (index + 1) * screenWidth,
                ];

                const opacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.3, 1, 0.3],
                    extrapolate: 'clamp',
                });

                return (
                    <Animated.View
                        key={index}
                        style={[styles.dot, { opacity }]}
                    />
                );
            })}
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
            <AnimatedFlatList
                ref={flatListRef}
                data={historyItems}
                renderItem={renderPage}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: true }
                )}
                getItemLayout={(_, index) => ({
                    length: screenWidth,
                    offset: screenWidth * index,
                    index,
                })}
            />
            {renderPaginationDots()}
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
        paddingHorizontal: 20,
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    page: {
        paddingVertical: 10,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#007AFF',
        marginHorizontal: 4,
    },
});

export default HistoryWrap;