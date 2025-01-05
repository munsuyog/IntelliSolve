import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { useEffect, useRef, useState, memo } from "react";
import vegaEmbed from "vega-embed";
import { BarChart2, X } from "lucide-react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { ToolCall } from "../../multimodal-live-types";

const declaration: FunctionDeclaration = {
  name: "render_altair",
  description: "Displays an altair graph in json format.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      json_graph: {
        type: SchemaType.STRING,
        description: "JSON STRING representation of the graph to render. Must be a string, not a json object",
      },
    },
    required: ["json_graph"],
  },
};

function AltairComponent() {
  const [jsonString, setJSONString] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { client, setConfig } = useLiveAPIContext();

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: "audio",
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
        },
      },
      systemInstruction: {
        parts: [
          {
            text: 'You are my helpful assistant. Any time I ask you for a graph call the "render_altair" function I have provided you. Dont ask for additional information just make your best judgement.',
          },
        ],
      },
      tools: [
        { googleSearch: {} },
        { functionDeclarations: [declaration] },
      ],
    });
  }, [setConfig]);

  useEffect(() => {
    const onToolCall = (toolCall: ToolCall) => {
      console.log(`got toolcall`, toolCall);
      const fc = toolCall.functionCalls.find(
        (fc) => fc.name === declaration.name,
      );
      if (fc) {
        const str = (fc.args as any).json_graph;
        setJSONString(str);
        setIsLoading(false);
        setIsModalOpen(true);
      }
      
      if (toolCall.functionCalls.length) {
        setTimeout(
          () =>
            client.sendToolResponse({
              functionResponses: toolCall.functionCalls.map((fc) => ({
                response: { output: { success: true } },
                id: fc.id,
              })),
            }),
          200,
        );
      }
    };

    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  const embedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (embedRef.current && jsonString && isModalOpen) {
      try {
        vegaEmbed(embedRef.current, JSON.parse(jsonString));
      } catch (error) {
        console.error("Error embedding graph:", error);
      }
    }
  }, [embedRef, jsonString, isModalOpen]);

  return (
    <>
      {/* Placeholder to trigger graph generation */}

      {/* Modal */}
      {isModalOpen && jsonString && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <BarChart2 className="text-blue-600 mr-2" />
                Data Visualization
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div 
              ref={embedRef} 
              className="w-full p-4 overflow-auto"
              style={{ minHeight: '500px' }}
            />
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-white bg-opacity-70 flex items-center justify-center">
          <div className="animate-pulse">
            <BarChart2 className="text-blue-600" size={48} />
          </div>
        </div>
      )}
    </>
  );
}

export const Altair = memo(AltairComponent);