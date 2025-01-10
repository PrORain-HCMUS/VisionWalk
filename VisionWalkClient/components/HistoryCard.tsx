import { HistoryItem } from "@/types/db";
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from "react";
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const HistoryCard = ({ imgUrl, text, audiobase64 }: HistoryItem) => {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const scaleAnimation = new Animated.Value(1);

    const animatePress = () => {
        Animated.sequence([
            Animated.timing(scaleAnimation, {
                toValue: 0.95,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnimation, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const playAudio = async () => {
        animatePress();
        try {
            if (sound && isPlaying) {
                await sound.stopAsync();
                await sound.unloadAsync();
                setSound(null);
                setIsPlaying(false);
                return;
            }

            const base64Audio = audiobase64;
            const uri = `data:audio/mp3;base64,${base64Audio}`;

            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: true }
            );

            setSound(newSound);
            setIsPlaying(true);

            newSound.setOnPlaybackStatusUpdate(async (status) => {
                if (status.isLoaded && status.didJustFinish) {
                    setIsPlaying(false);
                    await newSound.unloadAsync();
                    setSound(null);
                }
            });
        } catch (error) {
            console.error('Error playing audio:', error);
            setIsPlaying(false);
        }
    };

    return (
        <Animated.View style={[
            styles.card,
            { transform: [{ scale: scaleAnimation }] }
        ]}>
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: imgUrl }}
                    style={styles.image}
                    resizeMode="cover"
                />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={styles.gradient}
                />
            </View>

            <View style={styles.content}>
                <View style={styles.textContainer}>
                    <Text style={styles.text} numberOfLines={2}>
                        {text}
                    </Text>
                    <Text style={styles.timestamp}>
                        {new Date().toLocaleDateString()}
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.playButton}
                    onPress={playAudio}
                    activeOpacity={0.7}
                >
                    <View style={styles.playButtonInner}>
                        <Ionicons
                            name={isPlaying ? "pause" : "play"}
                            size={20}
                            color="#FFFFFF"
                        />
                    </View>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

export default HistoryCard;

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        marginVertical: 8,
        marginRight: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
        overflow: 'hidden',
    },
    imageContainer: {
        position: 'relative',
        width: '100%',
        height: 180,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '50%',
    },
    content: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        marginRight: 16,
    },
    text: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1A1A1A',
        marginBottom: 4,
        lineHeight: 22,
    },
    timestamp: {
        fontSize: 12,
        color: '#666666',
    },
    playButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#007AFF',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    playButtonInner: {
        width: '100%',
        height: '100%',
        borderRadius: 24,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
});