import { useRef, useState } from "react";
import { BookOpen, Monitor } from "lucide-react";
import { LiveAPIProvider } from "./contexts/LiveAPIContext";
import { Altair } from "./components/altair/Altair";
import ControlTray from "./components/control-tray/ControlTray";
import cn from "classnames";

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY as string;
if (typeof API_KEY !== "string") {
  throw new Error("set REACT_APP_GEMINI_API_KEY in .env");
}
const host = "generativelanguage.googleapis.com";
const uri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BookOpen className="text-blue-600" size={28} />
          <h1 className="text-2xl font-bold text-gray-800">IntelliSolve</h1>
        </div>
        <nav className="flex items-center space-x-4">
          <a href="https://github.com/munsuyog" className="text-gray-600 hover:text-blue-600 transition-colors">Github</a>
        </nav>
      </header>

      <LiveAPIProvider url={uri} apiKey={API_KEY}>
        <div className="flex-grow container mx-auto px-4 py-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Sidebar */}
            <div className="hidden md:block">
              {/* <SidePanel /> */}
            </div>

            {/* Main Content Area */}
            <div className="md:col-span-2 bg-white rounded-lg shadow-md p-6">
              {/* Descriptive Text */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  Welcome to IntelliSolve: Your AI Learning Companion
                </h2>
                <p className="text-gray-600 mb-4">
                  Unlock the power of AI-assisted learning. Capture, analyze, and solve problems with cutting-edge technology.
                </p>
              </div>

              {/* Main App Area */}
              <div className="main-app-area relative">
                <Altair />
                <video
                  className={cn(
                    "w-full rounded-lg shadow-md mt-4", 
                    {
                      "hidden": !videoRef.current || !videoStream
                    }
                  )}
                  ref={videoRef}
                  autoPlay
                  playsInline
                />
                {(!videoRef.current || !videoStream) && (
                  <div className="flex flex-col items-center justify-center h-64 bg-gray-100 rounded-lg">
                    <Monitor className="text-gray-400 mb-4" size={48} />
                    <p className="text-gray-600">No stream available. Start a session to begin.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Control Tray */}
        <ControlTray
          videoRef={videoRef}
          supportsVideo={true}
          onVideoStreamChange={setVideoStream}
        >
          {/* Additional custom buttons can be added here */}
        </ControlTray>
      </LiveAPIProvider>
    </div>
  );
}

export default App;