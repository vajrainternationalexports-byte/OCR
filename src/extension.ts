import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { OcrServer } from "./server";
import { OcrSidebarProvider } from "./sidebar";
import { 
  tryExtractWithGemini, 
  tryExtractWithClaude, 
  tryExtractWithOpenAI, 
  processAndValidateOcrResult,
  EXTRACTION_PROMPTS
} from "./ocrEngine";

let serverInstance: OcrServer | null = null;
let serverRunning = false;
let sidebarProvider: OcrSidebarProvider | null = null;

export function activate(context: vscode.ExtensionContext) {
  sidebarProvider = new OcrSidebarProvider(context.extensionUri, {
    onStartServer: () => vscode.commands.executeCommand("ocr-for-all.startServer"),
    onStopServer: () => vscode.commands.executeCommand("ocr-for-all.stopServer"),
    onRunOcrOnFile: () => vscode.commands.executeCommand("ocr-for-all.runOcrOnFile"),
    onUpdateConfig: (newConfig) => updateConfiguration(newConfig)
  });

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(OcrSidebarProvider.viewType, sidebarProvider)
  );

  // Helper command to return server status
  context.subscriptions.push(
    vscode.commands.registerCommand("ocr-for-all.isServerRunning", () => serverRunning)
  );

  // Command: Start server
  const startServerCommand = vscode.commands.registerCommand("ocr-for-all.startServer", async () => {
    if (serverRunning) {
      vscode.window.showInformationMessage("OCR Proxy Server is already running.");
      return;
    }

    const config = vscode.workspace.getConfiguration("ocr-for-all");
    const port = config.get<number>("port") || 50906;

    serverInstance = new OcrServer(
      port,
      () => ({
        provider: config.get<string>("provider") || "Gemini",
        apiKey: config.get<string>("apiKey") || "",
        apiEndpoint: config.get<string>("apiEndpoint") || "https://api.openai.com/v1",
        apiModel: config.get<string>("apiModel") || "gemini-3.5-flash",
        ocrMode: config.get<string>("ocrMode") || "STANDARD",
        contextText: getActiveEditorContext()
      }),
      {
        onInsertText: (text) => insertTextAtCursor(text),
        onLog: (msg, type) => sidebarProvider?.log(msg, type),
        onStatusChange: (running) => {
          serverRunning = running;
          sidebarProvider?.syncStatus();
        }
      }
    );

    try {
      sidebarProvider?.log(`Starting OCR Proxy Server on port ${port}...`, "info");
      await serverInstance.start();
      vscode.window.showInformationMessage(`OCR Proxy Server started on port ${port}.`);
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to start OCR Proxy Server: ${err.message}`);
      serverInstance = null;
    }
  });

  // Command: Stop server
  const stopServerCommand = vscode.commands.registerCommand("ocr-for-all.stopServer", async () => {
    if (!serverRunning || !serverInstance) {
      vscode.window.showInformationMessage("OCR Proxy Server is not running.");
      return;
    }

    try {
      sidebarProvider?.log("Stopping OCR Proxy Server...", "info");
      await serverInstance.stop();
      serverInstance = null;
      vscode.window.showInformationMessage("OCR Proxy Server stopped.");
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to stop OCR Proxy Server: ${err.message}`);
    }
  });

  // Command: Run OCR on local file directly
  const runOcrOnFileCommand = vscode.commands.registerCommand("ocr-for-all.runOcrOnFile", async () => {
    const fileUris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: "Select Image or PDF for OCR",
      filters: {
        "Images & PDFs": ["png", "jpg", "jpeg", "webp", "pdf"]
      }
    });

    if (!fileUris || fileUris.length === 0) {
      return;
    }

    const filePath = fileUris[0].fsPath;
    sidebarProvider?.log(`Selected file for local OCR: ${path.basename(filePath)}`, "info");

    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `OCR for ALL: Processing ${path.basename(filePath)}`,
      cancellable: false
    }, async (progress) => {
      try {
        const fileBuffer = fs.readFileSync(filePath);
        const fileBase64 = fileBuffer.toString("base64");
        
        let ext = path.extname(filePath).toLowerCase();
        let mimeType = "image/png";
        if (ext === ".jpg" || ext === ".jpeg") {
          mimeType = "image/jpeg";
        } else if (ext === ".webp") {
          mimeType = "image/webp";
        } else if (ext === ".pdf") {
          mimeType = "application/pdf";
        }

        const config = vscode.workspace.getConfiguration("ocr-for-all");
        const provider = config.get<string>("provider") || "Gemini";
        const apiKey = config.get<string>("apiKey") || "";
        const apiModel = config.get<string>("apiModel") || "gemini-3.5-flash";
        const ocrMode = config.get<string>("ocrMode") || "STANDARD";
        const apiEndpoint = config.get<string>("apiEndpoint") || "https://api.openai.com/v1";

        if (!apiKey && provider !== "Custom OpenAI-Compatible") {
          throw new Error(`API Key is not configured for provider ${provider}. Please enter it in the sidebar or settings.`);
        }

        progress.report({ message: "Extracting editor context..." });
        const contextText = getActiveEditorContext();

        let basePrompt = EXTRACTION_PROMPTS[ocrMode] || EXTRACTION_PROMPTS.STANDARD;
        let dynamicPrompt = basePrompt;
        if (contextText) {
          dynamicPrompt += `\n\n### ACTIVE EDITOR DOCUMENT CONTEXT ###\nUse the active document context below to resolve naming abbreviations, code structure, styles, terminology, or reference numbers in the current image:\n${contextText}\n### END OF CONTEXT ###\n`;
        }

        sidebarProvider?.log(`Sending extraction request to ${provider}...`, "info");
        progress.report({ message: `Calling ${provider} Vision API...` });

        let extractedText = "";
        let parsedData: any = null;

        if (provider === "Gemini") {
          const res = await tryExtractWithGemini(fileBase64, mimeType, dynamicPrompt, apiKey, apiModel);
          extractedText = res.rawText;
          parsedData = res.parsed;
        } else if (provider === "Claude 3.5 Sonnet") {
          const res = await tryExtractWithClaude(fileBase64, mimeType, dynamicPrompt, apiKey, apiModel);
          extractedText = res.rawText;
          parsedData = res.parsed;
        } else if (provider === "OpenAI GPT-4o") {
          if (mimeType === "application/pdf") {
            throw new Error("OpenAI provider does not support PDF vision directly. Please convert to images or use Gemini/Claude.");
          }
          const res = await tryExtractWithOpenAI(fileBase64, mimeType, dynamicPrompt, apiKey, apiModel);
          extractedText = res.rawText;
          parsedData = res.parsed;
        } else {
          // Custom OpenAI
          const res = await tryExtractWithOpenAI(fileBase64, mimeType, dynamicPrompt, apiKey, apiModel, apiEndpoint);
          extractedText = res.rawText;
          parsedData = res.parsed;
        }

        // Parse structured GST math if INVOICE_JSON mode
        if (ocrMode === "INVOICE_JSON" && parsedData) {
          try {
            progress.report({ message: "Running mathematical validations..." });
            parsedData = processAndValidateOcrResult(parsedData);
            extractedText = JSON.stringify(parsedData, null, 2);
          } catch (mathErr: any) {
            sidebarProvider?.log(`GST validation engine warning: ${mathErr.message}`, "info");
          }
        }

        sidebarProvider?.log("OCR extraction completed successfully!", "success");

        let insertionText = extractedText;
        if (parsedData && typeof parsedData === "object" && ocrMode === "INVOICE_JSON") {
          insertionText = "```json\n" + JSON.stringify(parsedData, null, 2) + "\n```";
        }

        insertTextAtCursor(insertionText);
        vscode.window.showInformationMessage("OCR transcription inserted successfully.");
      } catch (err: any) {
        sidebarProvider?.log(`Local OCR Failed: ${err.message}`, "error");
        vscode.window.showErrorMessage(`OCR extraction failed: ${err.message}`);
      }
    });
  });

  context.subscriptions.push(startServerCommand);
  context.subscriptions.push(stopServerCommand);
  context.subscriptions.push(runOcrOnFileCommand);

  // Monitor VSCode config changes to notify sidebar
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("ocr-for-all")) {
        sidebarProvider?.syncStatus();
      }
    })
  );
}

export function deactivate() {
  if (serverInstance && serverRunning) {
    serverInstance.stop();
  }
}

// Extract surrounding lines text from active text editor
function getActiveEditorContext(): string {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return "";
  }

  const config = vscode.workspace.getConfiguration("ocr-for-all");
  const radius = config.get<number>("contextLineRadius") ?? 20;
  const charLimit = config.get<number>("contextCharLimit") ?? 2000;

  const document = editor.document;
  const position = editor.selection.active;
  const cursorLine = position.line;

  const startLine = Math.max(0, cursorLine - radius);
  const endLine = Math.min(document.lineCount - 1, cursorLine + radius);

  let contextLines: string[] = [];
  for (let i = startLine; i <= endLine; i++) {
    const lineText = document.lineAt(i).text;
    if (i === cursorLine) {
      // Add cursor marker to helper OCR model trace cursor location contextually
      contextLines.push(`${lineText} <-- [CURSOR POSITION]`);
    } else {
      contextLines.push(lineText);
    }
  }

  const merged = contextLines.join("\n");
  if (merged.length > charLimit) {
    return merged.substring(0, charLimit) + "... [truncated]";
  }
  return merged;
}

// Insert text directly at cursor location in active editor
function insertTextAtCursor(text: string) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    sidebarProvider?.log("No active text editor found to insert result.", "error");
    return;
  }

  editor.edit(editBuilder => {
    const selection = editor.selection;
    if (selection.isEmpty) {
      editBuilder.insert(selection.active, text);
    } else {
      editBuilder.replace(selection, text);
    }
  }).then(success => {
    if (!success) {
      sidebarProvider?.log("Failed to insert OCR text into the active document.", "error");
    }
  });
}

// Update settings dynamically from sidebar UI input fields
function updateConfiguration(newConfig: any) {
  const config = vscode.workspace.getConfiguration("ocr-for-all");
  config.update("provider", newConfig.provider, vscode.ConfigurationTarget.Global);
  config.update("apiModel", newConfig.apiModel, vscode.ConfigurationTarget.Global);
  config.update("apiEndpoint", newConfig.apiEndpoint, vscode.ConfigurationTarget.Global);
  config.update("apiKey", newConfig.apiKey, vscode.ConfigurationTarget.Global);
  config.update("ocrMode", newConfig.ocrMode, vscode.ConfigurationTarget.Global);
  config.update("port", newConfig.port, vscode.ConfigurationTarget.Global);
}
