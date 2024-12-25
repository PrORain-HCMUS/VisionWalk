import { HistoryItem } from "@/utils/types";
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const HistoryCard = ({ imgUrl, text, audiobase64 }: HistoryItem) => {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const playAudio = async () => {
        try {
            // Nếu đang phát, dừng lại
            if (sound && isPlaying) {
                await sound.stopAsync();
                await sound.unloadAsync();
                setSound(null);
                setIsPlaying(false);
                return;
            }

            // Giải mã base64 thành file audio
            const base64Audio = audiobase64;
            const uri = `data:audio/mp3;base64,${base64Audio}`;

            // Tạo và load sound object
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: true }
            );

            setSound(newSound);
            setIsPlaying(true);

            // Xử lý khi audio phát xong
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
        <View style={styles.card}>
            <Image
                source={{ uri: imgUrl }}
                style={styles.image}
                resizeMode="cover"
            />
            <View style={styles.content}>
                <Text style={styles.text} numberOfLines={2}>{text}</Text>
                <TouchableOpacity
                    style={styles.playButton}
                    onPress={playAudio}
                >
                    <Ionicons
                        name={isPlaying ? "pause-circle" : "play-circle"}
                        size={32}
                        color="#007AFF"
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default HistoryCard;

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        borderRadius: 10,
        marginVertical: 5,
        marginHorizontal: 10,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    image: {
        width: '100%',
        height: 120,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
    },
    content: {
        padding: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    text: {
        fontSize: 14,
        flex: 1,
        marginRight: 10,
    },
    playButton: {
        padding: 5,
    },
});



