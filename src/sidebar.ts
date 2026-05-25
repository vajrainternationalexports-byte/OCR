import * as vscode from "vscode";

export class OcrSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "ocr-for-all-sidebar";
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _callbacks: {
      onStartServer: () => void;
      onStopServer: () => void;
      onRunOcrOnFile: () => void;
      onUpdateConfig: (config: any) => void;
    }
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void | Thenable<void> {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // Message listener from Webview to Extension
    webviewView.webview.onDidReceiveMessage(message => {
      switch (message.type) {
        case "startServer":
          this._callbacks.onStartServer();
          break;
        case "stopServer":
          this._callbacks.onStopServer();
          break;
        case "runOcrOnFile":
          this._callbacks.onRunOcrOnFile();
          break;
        case "updateConfig":
          this._callbacks.onUpdateConfig(message.data);
          break;
        case "requestStatus":
          this.syncStatus();
          break;
      }
    });

    this.syncStatus();
  }

  // Update server status and configuration settings inside the webview
  public syncStatus() {
    if (!this._view) { return; }

    const config = vscode.workspace.getConfiguration("ocr-for-all");
    const isRunning = vscode.commands.executeCommand("ocr-for-all.isServerRunning") as any;

    // We can resolve the actual state dynamically
    Promise.resolve(isRunning).then(running => {
      this._view?.webview.postMessage({
        type: "status",
        data: {
          running: !!running,
          config: {
            provider: config.get<string>("provider"),
            apiEndpoint: config.get<string>("apiEndpoint"),
            apiModel: config.get<string>("apiModel"),
            apiKey: config.get<string>("apiKey"),
            port: config.get<number>("port"),
            ocrMode: config.get<string>("ocrMode"),
            contextLineRadius: config.get<number>("contextLineRadius"),
            contextCharLimit: config.get<number>("contextCharLimit")
          }
        }
      });
    });
  }

  // Add a line of log into the webview console
  public log(message: string, type: "info" | "error" | "success" = "info") {
    if (this._view) {
      this._view.webview.postMessage({
        type: "log",
        data: {
          timestamp: new Date().toLocaleTimeString(),
          message,
          type
        }
      });
    }
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OCR for ALL Controls</title>
  <style>
    :root {
      --accent-color: #007acc;
      --success-color: #2ea043;
      --danger-color: #f85149;
      --bg-gradient: linear-gradient(135deg, rgba(0,122,204,0.1) 0%, rgba(0,0,0,0) 100%);
    }

    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif);
      color: var(--vscode-editor-foreground, #cccccc);
      background-color: var(--vscode-sideBar-background, #1e1e1e);
      padding: 12px;
      margin: 0;
      box-sizing: border-box;
      user-select: none;
    }

    .header {
      background: var(--bg-gradient);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
      border: 1px solid rgba(255,255,255,0.05);
      text-align: center;
    }

    .header h2 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0.5px;
      background: linear-gradient(90deg, #51a1fc 0%, #3fec95 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .header p {
      margin: 0;
      font-size: 11px;
      opacity: 0.7;
    }

    .section-card {
      background-color: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 14px;
    }

    .section-title {
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 10px;
      opacity: 0.6;
      letter-spacing: 0.5px;
    }

    .status-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      font-size: 11px;
      font-weight: bold;
      padding: 3px 8px;
      border-radius: 12px;
      background-color: rgba(255,255,255,0.05);
    }

    .status-badge::before {
      content: "";
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
      background-color: var(--danger-color);
    }

    .status-badge.running::before {
      background-color: var(--success-color);
      box-shadow: 0 0 8px var(--success-color);
    }

    .btn {
      width: 100%;
      background-color: var(--vscode-button-background, var(--accent-color));
      color: var(--vscode-button-foreground, #ffffff);
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 6px;
      transition: opacity 0.2s, transform 0.1s;
    }

    .btn:hover {
      opacity: 0.9;
    }

    .btn:active {
      transform: scale(0.98);
    }

    .btn-secondary {
      background-color: var(--vscode-button-secondaryBackground, rgba(255,255,255,0.05));
      color: var(--vscode-button-secondaryForeground, #ffffff);
      margin-top: 8px;
    }

    .btn-danger {
      background-color: var(--danger-color);
    }

    .form-group {
      margin-bottom: 10px;
    }

    .form-group label {
      display: block;
      font-size: 11px;
      margin-bottom: 4px;
      opacity: 0.8;
    }

    select, input {
      width: 100%;
      background-color: var(--vscode-input-background, rgba(0,0,0,0.2));
      color: var(--vscode-input-foreground, #ffffff);
      border: 1px solid var(--vscode-input-border, rgba(255,255,255,0.1));
      padding: 6px 8px;
      border-radius: 4px;
      font-size: 12px;
      box-sizing: border-box;
    }

    select:focus, input:focus {
      outline: 1px solid var(--vscode-focusBorder, var(--accent-color));
    }

    .console-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .console-clear {
      font-size: 10px;
      cursor: pointer;
      opacity: 0.6;
      transition: opacity 0.2s;
    }

    .console-clear:hover {
      opacity: 1;
    }

    .console-log {
      background-color: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.03);
      border-radius: 4px;
      height: 150px;
      overflow-y: auto;
      font-family: var(--vscode-editor-font-family, "Courier New", Courier, monospace);
      font-size: 10px;
      padding: 6px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .log-item {
      line-height: 1.3;
      word-break: break-all;
    }

    .log-time {
      opacity: 0.4;
      margin-right: 4px;
    }

    .log-info {
      color: #9cdcfe;
    }

    .log-error {
      color: var(--danger-color);
    }

    .log-success {
      color: var(--success-color);
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>OCR for ALL</h2>
    <p>Universal Intelligent OCR Assistant</p>
  </div>

  <div class="section-card">
    <div class="status-row">
      <span class="section-title" style="margin:0;">Server Controls</span>
      <span id="status-badge" class="status-badge">Stopped</span>
    </div>
    <button id="btn-toggle-server" class="btn">Start OCR Server</button>
  </div>

  <div class="section-card">
    <div class="section-title">Manual Actions</div>
    <button id="btn-run-file" class="btn btn-secondary">Select & Run OCR on File</button>
  </div>

  <div class="section-card">
    <div class="section-title">Configuration</div>
    
    <div class="form-group">
      <label for="select-provider">AI Provider</label>
      <select id="select-provider">
        <option value="Gemini">Gemini</option>
        <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet</option>
        <option value="OpenAI GPT-4o">OpenAI GPT-4o</option>
        <option value="Custom OpenAI-Compatible">Custom OpenAI-Compatible</option>
      </select>
    </div>

    <div class="form-group">
      <label for="input-model">Model Name</label>
      <input type="text" id="input-model" placeholder="e.g. gemini-3.5-flash" />
    </div>

    <div class="form-group" id="endpoint-group" style="display:none;">
      <label for="input-endpoint">API Base Endpoint</label>
      <input type="text" id="input-endpoint" placeholder="https://api.openai.com/v1" />
    </div>

    <div class="form-group">
      <label for="input-key">API Key</label>
      <input type="password" id="input-key" placeholder="Enter API key" />
    </div>

    <div class="form-group">
      <label for="select-mode">Default OCR Mode</label>
      <select id="select-mode">
        <option value="STANDARD">Standard Text</option>
        <option value="MARKDOWN">Markdown Document</option>
        <option value="LATEX">LaTeX / Math Equations</option>
        <option value="TABLE">Table / Data Sheets</option>
        <option value="INVOICE_JSON">Structured Invoice (JSON)</option>
        <option value="AUTO_DETECT">Auto-Detect</option>
      </select>
    </div>

    <div class="form-group">
      <label for="input-port">Proxy Server Port</label>
      <input type="number" id="input-port" placeholder="50906" />
    </div>
  </div>

  <div class="section-card" style="margin-bottom:0;">
    <div class="console-header">
      <span class="section-title" style="margin:0;">Request Console</span>
      <span id="btn-clear-logs" class="console-clear">Clear</span>
    </div>
    <div id="console-log" class="console-log">
      <div class="log-item"><span class="log-time">--:--:--</span><span class="log-info">Console initialized.</span></div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    const btnToggleServer = document.getElementById('btn-toggle-server');
    const btnRunFile = document.getElementById('btn-run-file');
    const statusBadge = document.getElementById('status-badge');
    const btnClearLogs = document.getElementById('btn-clear-logs');
    const consoleLog = document.getElementById('console-log');

    const providerSelect = document.getElementById('select-provider');
    const modelInput = document.getElementById('input-model');
    const endpointGroup = document.getElementById('endpoint-group');
    const endpointInput = document.getElementById('input-endpoint');
    const keyInput = document.getElementById('input-key');
    const modeSelect = document.getElementById('select-mode');
    const portInput = document.getElementById('input-port');

    let serverRunning = false;

    // Toggle endpoint field visibility based on provider selection
    providerSelect.addEventListener('change', () => {
      if (providerSelect.value === 'Custom OpenAI-Compatible') {
        endpointGroup.style.display = 'block';
      } else {
        endpointGroup.style.display = 'none';
      }
      saveConfig();
    });

    // Save configurations back to VSCode settings
    function saveConfig() {
      vscode.postMessage({
        type: 'updateConfig',
        data: {
          provider: providerSelect.value,
          apiModel: modelInput.value,
          apiEndpoint: endpointInput.value,
          apiKey: keyInput.value,
          ocrMode: modeSelect.value,
          port: parseInt(portInput.value) || 50906
        }
      });
    }

    [modelInput, endpointInput, keyInput, modeSelect, portInput].forEach(el => {
      el.addEventListener('change', saveConfig);
    });

    btnToggleServer.addEventListener('click', () => {
      if (serverRunning) {
        vscode.postMessage({ type: 'stopServer' });
      } else {
        vscode.postMessage({ type: 'startServer' });
      }
    });

    btnRunFile.addEventListener('click', () => {
      vscode.postMessage({ type: 'runOcrOnFile' });
    });

    btnClearLogs.addEventListener('click', () => {
      consoleLog.innerHTML = '';
    });

    // Listen for extension messages
    window.addEventListener('message', event => {
      const message = event.data;
      switch (message.type) {
        case 'status':
          const status = message.data;
          serverRunning = status.running;
          
          if (serverRunning) {
            statusBadge.innerText = 'Running';
            statusBadge.className = 'status-badge running';
            btnToggleServer.innerText = 'Stop OCR Server';
            btnToggleServer.className = 'btn btn-danger';
          } else {
            statusBadge.innerText = 'Stopped';
            statusBadge.className = 'status-badge';
            btnToggleServer.innerText = 'Start OCR Server';
            btnToggleServer.className = 'btn';
          }

          // Load values
          providerSelect.value = status.config.provider;
          modelInput.value = status.config.apiModel;
          endpointInput.value = status.config.apiEndpoint;
          keyInput.value = status.config.apiKey;
          modeSelect.value = status.config.ocrMode;
          portInput.value = status.config.port;

          if (providerSelect.value === 'Custom OpenAI-Compatible') {
            endpointGroup.style.display = 'block';
          } else {
            endpointGroup.style.display = 'none';
          }
          break;

        case 'log':
          const log = message.data;
          const logDiv = document.createElement('div');
          logDiv.className = 'log-item';
          
          const timeSpan = document.createElement('span');
          timeSpan.className = 'log-time';
          timeSpan.innerText = log.timestamp;
          
          const textSpan = document.createElement('span');
          textSpan.className = 'log-' + log.type;
          textSpan.innerText = log.message;

          logDiv.appendChild(timeSpan);
          logDiv.appendChild(textSpan);
          consoleLog.appendChild(logDiv);
          
          // auto scroll
          consoleLog.scrollTop = consoleLog.scrollHeight;
          break;
      }
    });

    // Initial load
    vscode.postMessage({ type: 'requestStatus' });
  </script>
</body>
</html>`;
  }
}
