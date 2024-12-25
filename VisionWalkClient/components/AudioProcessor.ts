import { SiriWave } from "@/components";

export class AudioProcessor {
    private siriWave: SiriWave;
    private audioData: Float32Array = new Float32Array();
    private sampleRate: number = 44100;
    private chunkSize: number = 4410; // 100ms at 44.1kHz
    private currentChunk: number = 0;
    private animationId: number | null = null;

    constructor(siriWave: SiriWave) {
        this.siriWave = siriWave;
    }

    private base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binaryString = window.atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    private async decodeAudioData(arrayBuffer: ArrayBuffer): Promise<Float32Array> {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        return audioBuffer.getChannelData(0); // Get first channel
    }

    private calculateAmplitude(chunk: Float32Array): number {
        // Calculate average amplitude for the chunk
        const sum = chunk.reduce((acc, val) => acc + Math.abs(val), 0);
        const average = sum / chunk.length;

        // Normalize to a value between 0 and 1
        // You might need to adjust these values based on your audio
        const minAmplitude = 0;
        const maxAmplitude = 0.5;
        const normalizedAmplitude = Math.min(
            Math.max((average - minAmplitude) / (maxAmplitude - minAmplitude), 0),
            1
        );

        return normalizedAmplitude;
    }

    private updateWave = () => {
        if (this.currentChunk * this.chunkSize >= this.audioData.length) {
            this.stop();
            return;
        }

        const start = this.currentChunk * this.chunkSize;
        const end = Math.min(start + this.chunkSize, this.audioData.length);
        const chunk = this.audioData.slice(start, end);

        const amplitude = this.calculateAmplitude(chunk);
        this.siriWave.setAmplitude(amplitude);

        this.currentChunk++;
        this.animationId = requestAnimationFrame(this.updateWave);
    }

    public async processAudio(audioContent: string) {
        try {
            const arrayBuffer = this.base64ToArrayBuffer(audioContent);
            this.audioData = await this.decodeAudioData(arrayBuffer);
            this.currentChunk = 0;
            this.start();
        } catch (error) {
            console.error('Error processing audio:', error);
        }
    }

    public start() {
        if (!this.animationId) {
            this.siriWave.start();
            this.updateWave();
        }
    }

    public stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
            this.siriWave.stop();
        }
    }

    public reset() {
        this.stop();
        this.currentChunk = 0;
    }
}

