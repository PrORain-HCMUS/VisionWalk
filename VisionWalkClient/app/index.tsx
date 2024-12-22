import analyzeImage from '@/api/analyzeImage';
import { testConnection } from '@/api/test';
import { Audio } from 'expo-av';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Button, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';



export default function App() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const volumePressCount = useRef(0)
  const lastPressTime = useRef(0)
  const cameraRef = useRef<CameraView>(null)


  useEffect(() => {
    (async () => {
      const { status } = await requestPermission();
      const { status: mediaStatus } = await requestMediaLibraryPermission();
      setHasPermission(status === 'granted' && mediaStatus === 'granted');
    })();

    testConnection()
  }, []);


  const captureAndSendScreenshot = async () => {
    try {
      if (cameraRef.current) {
        console.log('Taking photo...');
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          base64: false,
          skipProcessing: true
        });

        if (!photo) {
          throw new Error('Photo URI is empty');
        }

        console.log('Photo taken:', {
          uri: photo.uri,
          width: photo.width,
          height: photo.height,
        });

        const formData = new FormData();
        const photoFile = {
          uri: Platform.OS === 'android' ? photo.uri : photo.uri.replace('file://', ''),
          name: 'photo.jpg',
          type: 'image/jpeg',
        } as any;

        formData.append('file', photoFile);

        console.log('Sending photo to server...');
        const audioResponse = await analyzeImage(formData);

        if (audioResponse?.audio) {
          console.log('Playing audio...');
          await playAudio(audioResponse.audio);
          console.log('Audio played.');
        }
      }
    } catch (error) {
      console.error('Error in captureAndSendScreenshot:', error);

    }
  }

  const playAudio = async (audioContent: string) => {
    try {
      console.log('Loading audio...');
      const soundObject = new Audio.Sound()
      await soundObject.loadAsync({ uri: `data:audio/mpeg;base64,${audioContent}` });
      console.log('Audio loaded. Playing...');
      await soundObject.playAsync()
      console.log('Audio playback started.');
    } catch (error) {
      console.error('Error paying audio:', error)
    }
  }

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button}>
            <Link href="/routeTracking">
              <Text style={styles.text}>Route Tracking</Text>
            </Link>
          </TouchableOpacity>
          <TouchableOpacity style={styles.captureButton} onPress={captureAndSendScreenshot}>
            <Text style={styles.captureText}>Capture</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button}>
            <Link href="/userData">
              <Text style={styles.text}>User Data</Text>
            </Link>
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  buttonContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
    paddingHorizontal: 20
  },
  flipButton: {
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 50,
  },
  button: {
    padding: 15,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 30,
  },
  text: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  flipText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  captureButton: {
    padding: 15,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,0,0,0.5)',
    borderRadius: 30,
  },
  captureText: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});