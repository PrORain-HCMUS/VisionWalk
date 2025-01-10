import { NearbyUser } from '@/types/location';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    ImageSourcePropType,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PARTIAL_HEIGHT = 300; // Height for 2 users
const FULL_HEIGHT = SCREEN_HEIGHT;

interface BottomSheetProps {
    isVisible: boolean;
    onClose: () => void;
    users: NearbyUser[];
    isLoading: boolean;
    onUserPress: (user: NearbyUser) => void;
    getImageSource: (url: string) => ImageSourcePropType;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
    isVisible,
    onClose,
    users,
    isLoading,
    onUserPress,
    getImageSource
}) => {
    const [isFullyExpanded, setIsFullyExpanded] = useState(false);
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const currentPositionRef = useRef(SCREEN_HEIGHT);

    const updatePosition = (position: number) => {
        currentPositionRef.current = position;
        translateY.setValue(position);
    };

    useEffect(() => {
        if (isVisible) {
            // Animate to partial height
            const toValue = SCREEN_HEIGHT - PARTIAL_HEIGHT;
            Animated.spring(translateY, {
                toValue,
                useNativeDriver: true,
                friction: 8
            }).start(() => {
                currentPositionRef.current = toValue;
            });
        } else {
            // Animate to hidden
            Animated.timing(translateY, {
                toValue: SCREEN_HEIGHT,
                duration: 300,
                useNativeDriver: true
            }).start(() => {
                currentPositionRef.current = SCREEN_HEIGHT;
            });
        }
    }, [isVisible]);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                const { dy } = gestureState;
                return Math.abs(dy) > 10;
            },
            onPanResponderMove: (_, gestureState) => {
                const { dy } = gestureState;
                const newPosition = Math.min(
                    Math.max(
                        SCREEN_HEIGHT - FULL_HEIGHT,
                        currentPositionRef.current + dy
                    ),
                    SCREEN_HEIGHT
                );
                updatePosition(newPosition);
            },
            onPanResponderRelease: (_, gestureState) => {
                const { dy, vy } = gestureState;
                const currentPosition = currentPositionRef.current;

                // Calculate thresholds
                const partialThreshold = SCREEN_HEIGHT - PARTIAL_HEIGHT;
                const fullThreshold = SCREEN_HEIGHT - FULL_HEIGHT;

                let finalPosition;

                // Determine whether to snap to partial or full height
                if (currentPosition > partialThreshold + (PARTIAL_HEIGHT * 0.2) ||
                    (dy > 0 && vy > 0.5)) {
                    // Snap to hidden or partial based on velocity
                    finalPosition = dy > PARTIAL_HEIGHT / 2 ? SCREEN_HEIGHT : partialThreshold;
                    setIsFullyExpanded(false);
                    if (finalPosition === SCREEN_HEIGHT) {
                        onClose();
                        return;
                    }
                } else if (currentPosition < partialThreshold - (PARTIAL_HEIGHT * 0.1)) {
                    // Snap to full height
                    finalPosition = fullThreshold;
                    setIsFullyExpanded(true);
                } else {
                    // Snap to partial height
                    finalPosition = partialThreshold;
                    setIsFullyExpanded(false);
                }

                Animated.spring(translateY, {
                    toValue: finalPosition,
                    useNativeDriver: true,
                    friction: 8
                }).start(() => {
                    currentPositionRef.current = finalPosition;
                });
            }
        })
    ).current;

    const opacity = translateY.interpolate({
        inputRange: [SCREEN_HEIGHT - FULL_HEIGHT, SCREEN_HEIGHT - PARTIAL_HEIGHT, SCREEN_HEIGHT],
        outputRange: [0.5, 0.3, 0],
        extrapolate: 'clamp'
    });

    const formatDistance = (distance: number): string => {
        return distance < 1
            ? `${Math.round(distance * 1000)}m`
            : `${distance.toFixed(1)}km`;
    };

    return (
        <>
            {isVisible && (
                <TouchableWithoutFeedback onPress={onClose}>
                    <Animated.View style={[
                        styles.backdrop,
                        { opacity }
                    ]} />
                </TouchableWithoutFeedback>
            )}

            <Animated.View style={[
                styles.bottomSheet,
                {
                    transform: [{ translateY }]
                }
            ]}>
                {/* Drag Handle */}
                <View {...panResponder.panHandlers} style={styles.handleContainer}>
                    <View style={styles.handle} />
                </View>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerText}>Người dùng lân cận</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <ScrollView
                    style={styles.content}
                    scrollEnabled={isFullyExpanded}
                    showsVerticalScrollIndicator={false}
                >
                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#4A90E2" />
                            <Text style={styles.loadingText}>
                                Đang tìm kiếm người dùng lân cận...
                            </Text>
                        </View>
                    ) : users.length > 0 ? (
                        users.map((user) => (
                            <TouchableOpacity
                                key={user.id}
                                onPress={() => onUserPress(user)}
                                style={styles.userCard}
                            >
                                <Image
                                    source={getImageSource(user.info.profileImage || '')}
                                    style={styles.avatar}
                                />
                                <View style={styles.userInfo}>
                                    <Text style={styles.userName}>
                                        {user.info.displayName || 'Người dùng vô danh'}
                                    </Text>
                                    <Text style={styles.userDistance}>
                                        {formatDistance(user.distance)}
                                    </Text>
                                    {/* <Text style={[
                                        styles.userStatus,
                                        { color: user.status.online ? '#2ECC71' : '#95A5A6' }
                                    ]}>
                                        {user.status.online ? 'Đang hoạt động' : 'Không hoạt động'}
                                    </Text> */}
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>
                            Không tìm thấy người dùng nào gần đây
                        </Text>
                    )}
                </ScrollView>
            </Animated.View>
        </>
    );
};


const styles = StyleSheet.create({
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'black',
        zIndex: 10
    },
    bottomSheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: FULL_HEIGHT,
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
        elevation: 5,
        zIndex: 11
    },
    handleContainer: {
        width: '100%',
        padding: 10,
        alignItems: 'center',
        backgroundColor: 'transparent'
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: '#E0E0E0',
        borderRadius: 3
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16
    },
    headerText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2C3E50'
    },
    closeButton: {
        padding: 8
    },
    closeButtonText: {
        fontSize: 20,
        color: '#95A5A6'
    },
    content: {
        flex: 1
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center'
    },
    loadingText: {
        marginTop: 10,
        color: '#7F8C8D'
    },
    userCard: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        alignItems: 'center'
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12
    },
    userInfo: {
        flex: 1
    },
    userName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#2C3E50',
        marginBottom: 4
    },
    userDistance: {
        fontSize: 14,
        color: '#7F8C8D',
        marginBottom: 2
    },
    userStatus: {
        fontSize: 12
    },
    emptyText: {
        textAlign: 'center',
        color: '#7F8C8D',
        padding: 20
    }
});

export default BottomSheet;