import tts, { translate_tts } from '@/api/tts'
import { Audio } from 'expo-av'
import * as Location from 'expo-location'
import { useEffect, useState } from 'react'

interface Instruction {
    text: string,
    distance: number,
    coordinates: {
        latitude: number,
        longitude: number
    }
}

interface NavigationHookProps {
    instructions: Instruction[];
    isNavigating: boolean
}


const useLocateNavigation = ({ instructions, isNavigating }: NavigationHookProps) => {
    const [currentInstruction, setCurrentInstruction] = useState<number>(0)
    const [sound, setSound] = useState<Audio.Sound | null>(null)
    const [passedPoints, setPassedPoints] = useState<Set<number>>(new Set())
    const [isFirstInstruction, setIsFirstInstruction] = useState<boolean>(true)

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371e3
        const rad1 = lat1 * Math.PI / 180
        const rad2 = lat2 * Math.PI / 180
        const dPhi = (lat2 - lat1) * Math.PI / 180
        const dLambda = (lon2 - lon1) * Math.PI / 180

        const a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
            Math.cos(rad1) * Math.cos(rad2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c
    }


    const playInstruction = async (text: string, en: boolean) => {
        try {
            if (sound) {
                const status = await sound.getStatusAsync();
                if (status.isLoaded) {
                    await sound.stopAsync();
                    await sound.unloadAsync();
                }
                setSound(null);
            }

            let response
            if (en) {
                response = await translate_tts(text)
            } else {
                response = await tts(text)
            }
            if (response?.audio) {
                console.log('Got TTS response, creating sound...');

                try {
                    const { sound: newSound } = await Audio.Sound.createAsync(
                        { uri: `data:audio/mp3;base64,${response.audio}` },
                        { shouldPlay: false }
                    )

                    setSound(newSound)

                    newSound.setOnPlaybackStatusUpdate(async (status) => {
                        if (status.isLoaded && status.didJustFinish) {
                            console.log('Sound finished playing');
                            try {
                                await newSound.unloadAsync()
                            } catch (error) {
                                console.error('Error unloading sound:', error);
                            }
                            setSound(null)
                        }
                    })
                    await newSound.playAsync();
                    console.log('Started playing sound');
                } catch (error) {
                    console.error('Error setting up sound:', error);
                }
            }
        } catch (error) {
            console.error('Error playing instruction:', error)
        }
    }


    useEffect(() => {
        let locationSubscription: Location.LocationSubscription

        const startNavigation = async () => {
            if (!isNavigating || instructions.length === 0) return

            if (isFirstInstruction && instructions[0]) {
                await playInstruction(instructions[0].text, true)
                setIsFirstInstruction(false)

                // Đánh dấu điểm đầu tiên đã được đọc
                const newPassedPoints = new Set(passedPoints)
                newPassedPoints.add(0)
                setPassedPoints(newPassedPoints)

                // Di chuyển đến instruction tiếp theo
                if (instructions.length > 1) {
                    setCurrentInstruction(1)
                }
            }

            try {
                locationSubscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.BestForNavigation,
                        timeInterval: 5000,
                        distanceInterval: 5
                    },
                    async (location) => {
                        if (currentInstruction >= instructions.length) return

                        const nextInstruction = instructions[currentInstruction]
                        const distanceToNext = calculateDistance(
                            location.coords.latitude,
                            location.coords.longitude,
                            nextInstruction.coordinates.latitude,
                            nextInstruction.coordinates.longitude
                        )

                        if (distanceToNext <= 550 && !passedPoints.has(currentInstruction)) {
                            await playInstruction(nextInstruction.text, true);

                            const newPassedPoints = new Set(passedPoints)
                            newPassedPoints.add(currentInstruction)
                            setPassedPoints(newPassedPoints)
                            if (currentInstruction < instructions.length - 1) {
                                setCurrentInstruction(prev => prev + 1)
                            }
                        }
                    }
                )
            } catch (error) {
                console.error('Error starting navigation:', error);
            }
        }

        startNavigation()

        return () => {
            if (locationSubscription) {
                locationSubscription.remove()
            }
            if (sound) {
                (async () => {
                    try {
                        const status = await sound.getStatusAsync();
                        if (status.isLoaded) {
                            await sound.stopAsync();
                            await sound.unloadAsync();
                        }
                    } catch (err) {
                        console.error('Error cleaning up sound:', err);
                    }
                })();
            }
        }
    }, [isNavigating, instructions, currentInstruction])


    useEffect(() => {
        if (!isNavigating) {
            setCurrentInstruction(0);
            if (sound) {
                sound.unloadAsync();
                setSound(null);
            }
        }
    }, [isNavigating]);

    return {
        currentInstruction,
        playInstruction
    }
}

export default useLocateNavigation





