import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Path, Svg } from 'react-native-svg';

interface WaveProps {
    audioContent: string;
    replay: boolean;
    onReplayComplete?: () => void;
}

interface CurveDefinition {
    attenuation: number;
    lineWidth: number;
    opacity: number;
}

interface WaveState {
    phase: number;
    amplitude: number;
}

const CHUNK_DURATION = 100; // 100ms per chunk
const SCREEN_WIDTH = Dimensions.get('window').width;
const HEIGHT_MAX = 40;
const FREQUENCY = 2.5;
const PIXEL_DEPTH = 0.02;
const INITIAL_WAVES = 5;

const AudioWave = ({ audioContent, replay, onReplayComplete }: WaveProps) => {
    const [waveStates, setWaveStates] = useState<WaveState[]>(
        Array.from({ length: INITIAL_WAVES }, (_, i) => ({
            phase: (i * Math.PI) / 2,
            amplitude: 0
        }))
    );

    const animationFrameId = useRef<number | null>(null);
    const audioDataRef = useRef<number[]>([]);
    const chunkIndexRef = useRef(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const lastUpdateTimeRef = useRef(Date.now());
    const soundRef = useRef<Audio.Sound | null>(null);
    const [shouldRenderWave, setShouldRenderWave] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);


    const CURVE_DEFINITIONS: CurveDefinition[] = [
        { attenuation: -2, lineWidth: 1, opacity: 0.1 },
        { attenuation: -6, lineWidth: 1, opacity: 0.2 },
        { attenuation: 4, lineWidth: 1, opacity: 0.4 },
        { attenuation: 2, lineWidth: 1, opacity: 0.6 },
        { attenuation: 1, lineWidth: 1.5, opacity: 1 },
    ];

    useEffect(() => {
        const handleReplay = async () => {
            if (replay && soundRef.current) {
                try {
                    const status = await soundRef.current.getStatusAsync();
                    if (status.isLoaded) {
                        setShouldRenderWave(true);
                        // Reset to beginning
                        await soundRef.current.setPositionAsync(0);
                        chunkIndexRef.current = 0;
                        // Start playing
                        await soundRef.current.playAsync();
                        setIsPlaying(true);
                    } else {
                        // If sound is unloaded, reload and play
                        await loadAndPlayAudio();
                    }
                } catch (error) {
                    console.error('Error handling replay:', error);
                    setShouldRenderWave(false);
                }
            }
        };

        handleReplay();
    }, [replay]);

    // Move loadAndPlayAudio outside useEffect and make it reusable
    const loadAndPlayAudio = async () => {
        if (!audioContent) {
            setIsPlaying(false);
            return;
        }

        try {
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
            }

            const { sound } = await Audio.Sound.createAsync(
                { uri: `data:audio/mp3;base64,${audioContent}` },
                {
                    shouldPlay: true,
                    progressUpdateIntervalMillis: 100,
                }
            );

            sound.setOnPlaybackStatusUpdate((status) => {
                if (!status.isLoaded) return;

                if (status.didJustFinish) {
                    setIsPlaying(false);
                    setWaveStates((prevStates) =>
                        prevStates.map((state) => ({
                            ...state,
                            amplitude: 0,
                        }))
                    );
                    onReplayComplete?.();
                } else if (status.isPlaying) {
                    const { positionMillis, durationMillis } = status;
                    const progress = durationMillis ? positionMillis / durationMillis : 0;

                    setWaveStates((prevStates) => {
                        const newStates = [...prevStates];
                        const activeWaveIndex = Math.floor(progress * INITIAL_WAVES);

                        for (let i = 0; i < newStates.length; i++) {
                            newStates[i] = {
                                phase: (newStates[i].phase + 0.05) % (2 * Math.PI),
                                amplitude:
                                    i === activeWaveIndex ? 1 : newStates[i].amplitude * 0.95,
                            };
                        }
                        return newStates;
                    });
                }
            });

            soundRef.current = sound;
            setIsPlaying(true);
        } catch (error) {
            console.error('Error processing audio data:', error);
            setIsPlaying(false);
        }
    };

    useEffect(() => {
        loadAndPlayAudio();

        return () => {
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
            setIsPlaying(false);
        };
    }, [audioContent]);

    useEffect(() => {
        if (!isPlaying || !soundRef.current) return;

        const animate = () => {
            const currentTime = Date.now();
            if (currentTime - lastUpdateTimeRef.current >= CHUNK_DURATION) {
                const currentChunk = audioDataRef.current[chunkIndexRef.current];

                if (currentChunk !== undefined) {
                    const jitterFactor = 0.85 + Math.random() * 0.3;
                    const amplitude = currentChunk * jitterFactor;

                    setWaveStates(prevStates => {
                        const newStates = [...prevStates];
                        const activeWaveIndex = Math.floor(Math.random() * INITIAL_WAVES);

                        for (let i = 0; i < newStates.length; i++) {
                            newStates[i] = {
                                phase: (newStates[i].phase + 0.05) % (2 * Math.PI),
                                amplitude: i === activeWaveIndex
                                    ? amplitude
                                    : newStates[i].amplitude * 0.95
                            };
                        }
                        return newStates;
                    });

                    chunkIndexRef.current = (chunkIndexRef.current + 1) % audioDataRef.current.length;
                    lastUpdateTimeRef.current = currentTime;
                }
            }

            animationFrameId.current = requestAnimationFrame(animate);
        };

        animationFrameId.current = requestAnimationFrame(animate);
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [isPlaying]);

    useEffect(() => {
        if (!soundRef.current) return;

        const checkAudioStatus = async () => {
            const status = await soundRef.current?.getStatusAsync();
            if (status?.isLoaded && !status.isPlaying && status.positionMillis === status.durationMillis) {
                setShouldRenderWave(false);
                setIsPlaying(false);
                setWaveStates(prevStates =>
                    prevStates.map(state => ({
                        ...state,
                        amplitude: 0
                    }))
                );
                onReplayComplete?.();
            }
        };

        const intervalId = setInterval(checkAudioStatus, 500);

        return () => {
            clearInterval(intervalId);
        };
    }, [soundRef.current]);


    const globalAttenuation = (x: number): number => {
        return Math.pow(4 / (4 + Math.pow(x, 4)), 4);
    };

    const xPos = (i: number): number => {
        return SCREEN_WIDTH * ((i + 2) / 4);
    };

    const yPos = (i: number, attenuation: number, waveIndex: number): number => {
        const { phase, amplitude } = waveStates[waveIndex];
        return HEIGHT_MAX * amplitude * globalAttenuation(i) *
            (1 / attenuation) * Math.sin(FREQUENCY * i - phase);
    };

    const createWavePath = (definition: CurveDefinition): string => {
        const points: Array<[number, number]> = [];

        for (let i = -2; i <= 2; i += PIXEL_DEPTH) {
            const x = xPos(i);
            const totalY = waveStates.reduce((sum, _, index) =>
                sum + yPos(i, definition.attenuation, index), 0);
            points.push([x, HEIGHT_MAX + totalY]);
        }

        return points
            .map(([x, y], idx) =>
                idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` :
                    `L ${x.toFixed(1)} ${y.toFixed(1)}`
            )
            .join(' ');
    };

    if (!shouldRenderWave && !isPlaying) {
        return <View style={styles.container} />;
    }

    return (
        <View style={[styles.container, { backgroundColor: 'transparent' }]}>
            <Svg height={80} width={SCREEN_WIDTH}>
                {CURVE_DEFINITIONS.map((definition, index) => (
                    <Path
                        key={index}
                        d={createWavePath(definition)}
                        stroke="white"
                        strokeWidth={definition.lineWidth}
                        fill="none"
                        opacity={definition.opacity}
                    />
                ))}
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default AudioWave;