import express = require("express");
import cors = require("cors");
import * as os from "os";
import { Server } from "http";
import { Bonjour } from "bonjour-service";
import { 
  tryExtractWithGemini, 
  tryExtractWithClaude, 
  tryExtractWithOpenAI, 
  tryExtractTextWithOpenAI,
  processAndValidateOcrResult,
  EXTRACTION_PROMPTS
} from "./ocrEngine";

interface ServerCallbacks {
  onInsertText: (text: string) => void;
  onLog: (message: string, type: "info" | "error" | "success") => void;
  onStatusChange: (running: boolean) => void;
}

export class OcrServer {
  private app: any;
  private httpServer: Server | null = null;
  private bonjour: any = null;
  private activeService: any = null;

  constructor(
    private port: number,
    private configGetter: () => {
      provider: string;
      apiKey: string;
      apiEndpoint: string;
      apiModel: string;
      ocrMode: string;
      contextText: string;
    },
    private callbacks: ServerCallbacks
  ) {
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json({ limit: "50mb" }));
    this.app.use(express.urlencoded({ limit: "50mb", extended: true }));
    this.setupRoutes();
  }

  private setupRoutes() {
    // 1. Health Check
    this.app.get("/health", (req: any, res: any) => {
      const config = this.configGetter();
      res.json({
        status: "ok",
        name: "OCR for ALL Server",
        port: this.port,
        provider: config.provider,
        model: config.apiModel,
        mode: config.ocrMode,
        hostname: os.hostname(),
        platform: os.platform()
      });
    });

    // 2. OpenAI-compatible completions endpoint
    const extractHandler = async (req: express.Request, res: express.Response) => {
      const config = this.configGetter();
      this.callbacks.onLog(`Received OCR completion request via ${req.path}`, "info");

      try {
        if (!config.apiKey && config.provider !== "Custom OpenAI-Compatible") {
          throw new Error(`API Key is not configured for provider ${config.provider}.`);
        }

        // Parse base64 and mimeType from messages
        let fileBase64 = "";
        let mimeType = "";
        let customUserMessage = "";

        const messages = req.body.messages;
        if (messages && Array.isArray(messages)) {
          // Look at the last user message for image content
          const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
          if (lastUserMsg) {
            if (typeof lastUserMsg.content === "string") {
              customUserMessage = lastUserMsg.content;
            } else if (Array.isArray(lastUserMsg.content)) {
              for (const part of lastUserMsg.content) {
                if (part.type === "image_url" && part.image_url?.url) {
                  const urlStr = part.image_url.url;
                  if (urlStr.startsWith("data:")) {
                    const match = urlStr.match(/^data:([^;]+);base64,(.*)$/);
                    if (match) {
                      mimeType = match[1];
                      fileBase64 = match[2];
                    }
                  }
                } else if (part.type === "text" && part.text) {
                  customUserMessage = part.text;
                }
              }
            }
          }
        }

        // Alternative check: Direct base64 fields if clients don't use standard chat completion format
        if (!fileBase64 && req.body.fileBase64) {
          fileBase64 = req.body.fileBase64;
          mimeType = req.body.mimeType || "image/png";
        }

        if (!fileBase64) {
          this.callbacks.onLog("Invalid request: No base64 image data found", "error");
          return res.status(400).json({ error: "No image or PDF data found in messages or payload" });
        }

        // Construct dynamic prompt by embedding VSCode editor context
        const mode = config.ocrMode;
        let basePrompt = EXTRACTION_PROMPTS[mode] || EXTRACTION_PROMPTS.STANDARD;
        
        let dynamicPrompt = basePrompt;
        if (config.contextText) {
          dynamicPrompt += `\n\n### ACTIVE EDITOR DOCUMENT CONTEXT ###\nUse the active document context below to resolve naming abbreviations, code structure, styles, terminology, or reference numbers in the current image:\n${config.contextText}\n### END OF CONTEXT ###\n`;
        }

        if (customUserMessage) {
          dynamicPrompt += `\n\n### ADDITIONAL INSTRUCTION ###\n${customUserMessage}\n`;
        }

        this.callbacks.onLog(`Processing OCR using ${config.provider} (Mode: ${mode})...`, "info");

        let extractedText = "";
        let parsedData: any = null;

        // Perform extraction based on provider
        if (config.provider === "Gemini") {
          const resOcr = await tryExtractWithGemini(fileBase64, mimeType, dynamicPrompt, config.apiKey, config.apiModel);
          extractedText = resOcr.rawText;
          parsedData = resOcr.parsed;
        } else if (config.provider === "Claude 3.5 Sonnet") {
          const resOcr = await tryExtractWithClaude(fileBase64, mimeType, dynamicPrompt, config.apiKey, config.apiModel);
          extractedText = resOcr.rawText;
          parsedData = resOcr.parsed;
        } else if (config.provider === "OpenAI GPT-4o") {
          if (mimeType === "application/pdf") {
            // Simulated PDF processing fallback if no direct vision pdf support
            this.callbacks.onLog("PDF input received for OpenAI. Raw text extract fallback not supported natively in this server, using standard image processing rules.", "error");
            throw new Error("OpenAI provider does not support PDF vision directly. Please convert to images or use Gemini/Claude.");
          }
          const resOcr = await tryExtractWithOpenAI(fileBase64, mimeType, dynamicPrompt, config.apiKey, config.apiModel);
          extractedText = resOcr.rawText;
          parsedData = resOcr.parsed;
        } else {
          // Custom OpenAI endpoint
          const resOcr = await tryExtractWithOpenAI(fileBase64, mimeType, dynamicPrompt, config.apiKey, config.apiModel, config.apiEndpoint);
          extractedText = resOcr.rawText;
          parsedData = resOcr.parsed;
        }

        // Apply GST/Math corrections if Invoice JSON mode was specified
        if (mode === "INVOICE_JSON" && parsedData) {
          try {
            parsedData = processAndValidateOcrResult(parsedData);
            extractedText = JSON.stringify(parsedData, null, 2);
          } catch (mathErr: any) {
            this.callbacks.onLog(`GST validation engine warning: ${mathErr.message}`, "info");
          }
        }

        this.callbacks.onLog("OCR extractions completed successfully!", "success");

        // Format to insert in editor
        let insertionText = extractedText;
        if (parsedData && typeof parsedData === "object" && mode === "INVOICE_JSON") {
          // If JSON, let's pretty print as markdown table / raw JSON based on format preference
          insertionText = "```json\n" + JSON.stringify(parsedData, null, 2) + "\n```";
        }

        // Insert text into editor
        this.callbacks.onInsertText(insertionText);

        // Send completion response
        const isStream = req.body.stream === true;
        if (isStream) {
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");

          const responseId = "chatcmpl-" + Date.now();
          const chunk = {
            id: responseId,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: config.apiModel,
            choices: [
              {
                index: 0,
                delta: { content: insertionText },
                finish_reason: "stop"
              }
            ]
          };

          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          res.write("data: [DONE]\n\n");
          res.end();
        } else {
          res.json({
            id: "chatcmpl-" + Date.now(),
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: config.apiModel,
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: insertionText
                },
                finish_reason: "stop"
              }
            ]
          });
        }
      } catch (err: any) {
        this.callbacks.onLog(`Extraction failed: ${err.message}`, "error");
        res.status(500).json({ error: err.message });
      }
    };

    this.app.post("/v1/chat/completions", extractHandler);
    this.app.post("/chat/completions", extractHandler);
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const server = this.app.listen(this.port, () => {
          this.callbacks.onLog(`OCR Proxy Server listening on port ${this.port}`, "info");
          this.callbacks.onStatusChange(true);
          this.registerMdns();
          resolve();
        });
        this.httpServer = server;

        server.on("error", (err: any) => {
          this.callbacks.onLog(`OCR Proxy Server port error: ${err.message}`, "error");
          this.callbacks.onStatusChange(false);
          reject(err);
        });
      } catch (err: any) {
        reject(err);
      }
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.unregisterMdns();
      if (this.httpServer) {
        this.httpServer.close(() => {
          this.callbacks.onLog("OCR Proxy Server stopped.", "info");
          this.callbacks.onStatusChange(false);
          this.httpServer = null;
          resolve();
        });
      } else {
        this.callbacks.onStatusChange(false);
        resolve();
      }
    });
  }

  private registerMdns() {
    try {
      this.bonjour = new Bonjour();
      const hostname = os.hostname().replace(/\.local$/, "");
      this.activeService = this.bonjour.publish({
        name: `OCR for ALL VSCode @ ${hostname}`,
        type: "http",
        port: this.port,
        txt: { path: "/v1/chat/completions" }
      });
      this.callbacks.onLog(`mDNS service advertised: OCR for ALL VSCode @ ${hostname}`, "info");
    } catch (err: any) {
      this.callbacks.onLog(`mDNS registration failed: ${err.message}`, "error");
    }
  }

  private unregisterMdns() {
    if (this.activeService) {
      try {
        this.activeService.stop(() => {
          if (this.bonjour) {
            this.bonjour.destroy();
            this.bonjour = null;
          }
          this.activeService = null;
        });
      } catch (e) {
        this.activeService = null;
      }
    }
  }
}
