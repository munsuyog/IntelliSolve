import { memo, ReactNode, RefObject, useEffect, useRef, useState, useCallback } from "react";
import { 
  Mic, 
  MicOff, 
  MonitorCheck, 
  MonitorOff, 
  Camera, 
  CameraOff, 
  SwitchCamera, 
  Play, 
  Pause 
} from "lucide-react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { UseMediaStreamResult } from "../../hooks/use-media-stream-mux";
import { useScreenCapture } from "../../hooks/use-screen-capture";
import { AudioRecorder } from "../../lib/audio-recorder";
import AudioPulse from "../audio-pulse/AudioPulse";

export type ControlTrayProps = {
  videoRef: RefObject<HTMLVideoElement>;
  children?: ReactNode;
  supportsVideo: boolean;
  onVideoStreamChange?: (stream: MediaStream | null) => void;
};

type MediaStreamButtonProps = {
  isStreaming: boolean;
  onIcon: React.ReactNode;
  offIcon: React.ReactNode;
  start: () => Promise<any>;
  stop: () => any;
};

const MediaStreamButton = memo(
  ({ isStreaming, onIcon, offIcon, start, stop }: MediaStreamButtonProps) =>
    isStreaming ? (
      <button 
        className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
        onClick={stop}
      >
        {onIcon}
      </button>
    ) : (
      <button 
        className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        onClick={start}
      >
        {offIcon}
      </button>
    ),
);

function ControlTray({
  videoRef,
  children,
  onVideoStreamChange = () => {},
  supportsVideo,
}: ControlTrayProps) {
  type CameraType = 'front' | 'back';

  const useWebcamWithCamera = (cameraType: CameraType = 'front') => {
    const [currentCameraType, setCurrentCameraType] = useState<CameraType>(cameraType);

    const start = useCallback(async () => {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: currentCameraType === 'front' ? 'user' : 'environment'
        }
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        return stream;
      } catch (error) {
        console.error('Error accessing camera:', error);
        throw error;
      }
    }, [currentCameraType]);

    const stop = useCallback(() => {
      // Placeholder for stop functionality
    }, []);

    return {
      start,
      stop,
      isStreaming: false,
      cameraType: currentCameraType,
      switchCamera: () => setCurrentCameraType(prev => prev === 'front' ? 'back' : 'front')
    };
  };

  const screenCapture = useScreenCapture();
  const webcam = useWebcamWithCamera();
  const [activeVideoStream, setActiveVideoStream] = useState<MediaStream | null>(null);
  const [inVolume, setInVolume] = useState(0);
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const renderCanvasRef = useRef<HTMLCanvasElement>(null);
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  const { client, connected, connect, disconnect, volume } =
    useLiveAPIContext();

  useEffect(() => {
    if (!connected && connectButtonRef.current) {
      connectButtonRef.current.focus();
    }
  }, [connected]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--volume",
      `${Math.max(5, Math.min(inVolume * 200, 8))}px`,
    );
  }, [inVolume]);

  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: "audio/pcm;rate=16000",
          data: base64,
        },
      ]);
    };
    if (connected && !muted && audioRecorder) {
      audioRecorder.on("data", onData).on("volume", setInVolume).start();
    } else {
      audioRecorder.stop();
    }
    return () => {
      audioRecorder.off("data", onData).off("volume", setInVolume);
    };
  }, [connected, client, muted, audioRecorder]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = activeVideoStream;
    }

    let timeoutId = -1;

    function sendVideoFrame() {
      const video = videoRef.current;
      const canvas = renderCanvasRef.current;

      if (!video || !canvas) {
        return;
      }

      const ctx = canvas.getContext("2d")!;
      canvas.width = video.videoWidth * 0.25;
      canvas.height = video.videoHeight * 0.25;
      if (canvas.width + canvas.height > 0) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 1.0);
        const data = base64.slice(base64.indexOf(",") + 1, Infinity);
        client.sendRealtimeInput([{ mimeType: "image/jpeg", data }]);
      }
      if (connected) {
        timeoutId = window.setTimeout(sendVideoFrame, 1000 / 0.5);
      }
    }
    if (connected && activeVideoStream !== null) {
      requestAnimationFrame(sendVideoFrame);
    }
    return () => {
      clearTimeout(timeoutId);
    };
  }, [connected, activeVideoStream, client, videoRef]);

  const changeStreams = (next?: UseMediaStreamResult | ReturnType<typeof useWebcamWithCamera>) => async () => {
    if (next) {
      const mediaStream = await next.start();
      setActiveVideoStream(mediaStream);
      onVideoStreamChange(mediaStream);
    } else {
      setActiveVideoStream(null);
      onVideoStreamChange(null);
    }

    [screenCapture, webcam].filter((msr) => msr !== next).forEach((msr) => msr.stop());
  };

  return (
    <section className="z-10 bg-white shadow-md p-4 border-t">
      <canvas className="hidden" ref={renderCanvasRef} />
      <nav 
        className={`
          flex justify-center items-center space-x-4 p-2 rounded-lg
          ${!connected ? 'opacity-50' : ''}
        `}
      >
        <button
          className={`
            p-2 rounded-full transition-colors
            ${!muted 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'bg-red-500 text-white hover:bg-red-600'}
          `}
          onClick={() => setMuted(!muted)}
        >
          {!muted ? <Mic /> : <MicOff />}
        </button>

        <div className="bg-gray-100 p-2 rounded-full">
          <AudioPulse volume={volume} active={connected} hover={false} />
        </div>

        {supportsVideo && (
          <>
            <MediaStreamButton
              isStreaming={screenCapture.isStreaming}
              start={changeStreams(screenCapture)}
              stop={changeStreams()}
              onIcon={<MonitorOff />}
              offIcon={<MonitorCheck />}
            />

            <MediaStreamButton
              isStreaming={webcam.isStreaming}
              start={changeStreams(webcam)}
              stop={changeStreams()}
              onIcon={<CameraOff />}
              offIcon={<Camera />}
            />

            <button 
              className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              onClick={() => {
                webcam.switchCamera();
                changeStreams(webcam)();
              }}
            >
              <SwitchCamera />
            </button>
          </>
        )}

        {children}

        <div className="flex items-center">
          <button
            ref={connectButtonRef}
            className={`
              p-2 rounded-full mr-2 transition-colors
              ${connected 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-green-500 text-white hover:bg-green-600'}
            `}
            onClick={connected ? disconnect : connect}
          >
            {connected ? <Pause /> : <Play />}
          </button>
          <span className="text-sm text-gray-600">
            Streaming
          </span>
        </div>
      </nav>
    </section>
  );
}

export default memo(ControlTray);