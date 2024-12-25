import analyzeImage from '@/api/analyzeImage';
import qa from '@/api/qa';
import { testConnection } from '@/api/test';
import Wave from '@/components/Wave';
import { databaseHelper } from '@/db/databaseHelper';
import { saveImageToLocal } from '@/utils/userInfo';
import { Audio } from 'expo-av';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { Link } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Button, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


export default function App() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [replay, setReplay] = useState(false)
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [currentAudioContent, setCurrentAudioContent] = useState<string>('');
  const cameraRef = useRef<CameraView>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const db = useSQLiteContext()


  useEffect(() => {
    (async () => {
      const { status } = await requestPermission();
      const { status: mediaStatus } = await requestMediaLibraryPermission();
      setHasPermission(status === 'granted' && mediaStatus === 'granted');
    })();

    testConnection();
  }, []);

  const captureAndSendScreenshot = async () => {
    try {
      if (cameraRef.current) {
        console.log('Taking photo...');
        const photo = await cameraRef.current.takePictureAsync({
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

        const imgLocalPath = await saveImageToLocal(photo.uri)

        const formData = new FormData();
        const photoFile = {
          uri: Platform.OS === 'android' ? photo.uri : photo.uri.replace('file://', ''),
          name: 'photo.jpg',
          type: 'image/jpeg',
        } as any;

        formData.append('file', photoFile);

        console.log('Sending photo to server...');
        const response = await analyzeImage(formData);

        if (response?.audio) {
          console.log('Got audio response, setting up playback...');
          setCurrentAudioContent(response.audio);

          if (response?.text) {
            await databaseHelper.addHistoryItem(db, {
              id: 0,
              imgUrl: imgLocalPath,
              text: response.text,
              audiobase64: response.audio
            })
          }
        }
      }
    } catch (error) {
      console.error('Error in captureAndSendScreenshot:', error);
      setCurrentAudioContent('');
    }
  };


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

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          if (status.metering && status.metering < -50) { // Điều chỉnh ngưỡng im lặng
            const currentTime = Date.now();
            if (recordingStartTimeRef.current &&
              currentTime - recordingStartTimeRef.current > 3000) { // 3 giây
              stopRecording();
            }
          }
        },
        500 // Check mỗi 500ms
      );

      recordingStartTimeRef.current = Date.now();
      setRecording(recording);
      setIsRecording(true);

    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (uri) {
        const formData = new FormData()
        formData.append('audio', {
          uri: uri,
          type: 'audio/wav',
          name: 'audio.wav',
        } as any)

        const response = await qa(formData)

        if (response?.audio) {
          console.log('Got audio response, setting up playback...');
          setCurrentAudioContent(response.audio);
        }
      }

      setRecording(null);
      setIsRecording(false);
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
        {currentAudioContent && (
          <View style={styles.waveContainer}>
            <Wave audioContent={currentAudioContent} replay={replay} onReplayComplete={() => setReplay(false)} />
          </View>
        )}
        <View style={styles.optionContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              isRecording && styles.recordingButton
            ]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <Text style={styles.captureText}>
              {isRecording ? 'Stop' : 'Mic'}
            </Text>
          </TouchableOpacity>

          {currentAudioContent && !replay && (
            <TouchableOpacity style={styles.captureButton} onPress={() => setReplay(true)}  >
              <Text style={styles.captureText}>Replay</Text>
            </TouchableOpacity>
          )}

        </View>
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
  waveContainer: {
    position: 'absolute',
    bottom: 108,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 20,
    paddingHorizontal: 20
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
  recordingButton: {
    backgroundColor: 'rgba(255,0,0,0.5)',
  },
});