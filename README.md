# OCR for ALL

Universal OCR Assistant for Visual Studio Code and Open VSX.

**OCR for ALL** is a VSCode extension that integrates advanced vision models (Gemini, Claude, OpenAI, and custom OpenAI-compatible endpoints) to help you convert handwritten notes, math equations, tables, blurry scans, and structured documents (invoices, receipts, POs) directly into your editor, all while maintaining active document context to achieve 150% accuracy.

It is designed to run completely standalone inside VSCode, or as a local network proxy server so external OCR clients (iPad, Android tablets, mobile apps, scanner rigs) can send images over the local network and have text auto-inserted right at your active cursor.

---

## ✨ Features

### 🖼️ AI-Powered OCR Engine
* **Multiple OCR Modes**: Supports standard text extraction, clean Markdown restructuring, handwritten LaTeX math, markdown tables, and structured invoice parsing.
* **Context-Aware Translation**: The OCR results consider the surrounding context of your active document (lines before/after cursor) to resolve terms, variables, naming styles, and code structures.
* **Self-Correction & Math Validation**: In structured JSON mode, it validates calculations, balances GST rates (Intrastate/Interstate), handles rounding offsets, and generates word equivalents.
* **Automatic Insertion**: Extracted content is automatically inserted at your cursor position instantly.
* **Streaming Support**: Real-time streaming completions.

### 🎨 Premium Sidebar Interface
* **Intuitive Control Panel**: Easily configure API settings, providers, and default parsing modes.
* **Server Control**: Start and stop the local OCR proxy server with a single click.
* **Visual Status Indicators**: Real-time server status badge (Running/Stopped) and IP/port information.
* **Request Logger Console**: Scrolling log viewer capturing API calls, completed transcriptions, and warnings.

### 🔌 Network Discovery
* **mDNS Service Advertisement**: The proxy server automatically registers on your local network via mDNS, making it discoverable for remote mobile and tablet OCR clients.
* **Cross-Platform**: Tested on Windows, macOS, and Linux.

---

## 🎯 Supported OCR Modes

1. **Standard Text (`STANDARD`)**: Direct high-fidelity OCR, extracting text while preserving original line breaks.
2. **Markdown Document (`MARKDOWN`)**: Transcribes and structures text as clean, organized Markdown.
3. **LaTeX Math (`LATEX`)**: Converts handwritten math equations, symbols, and formulas into LaTeX notation.
4. **Table / Data Sheets (`TABLE`)**: Extracts printed tables into Github Flavored Markdown (GFM) tables.
5. **Structured Invoices (`INVOICE_JSON`)**: Extracts bills, receipts, or invoices into structured JSON, applying algebraic checks, Indian numbering words, and GST state checks.
6. **Auto-Detect (`AUTO_DETECT`)**: Intelligently analyzes the document type and formats output accordingly.

---

## 📦 Installation

### Install manually via VSIX:
1. Download the packaged `.vsix` file.
2. Open VSCode.
3. Go to Extensions (`Ctrl+Shift+X` or `Cmd+Shift+X`).
4. Click the `...` menu in the top right and select **Install from VSIX...**.
5. Select the `ocr-for-all-1.0.0.vsix` file.

---

## 🚀 Getting Started

### 1. Configure Settings
Open the **OCR for ALL** tab in the VSCode left Activity Bar to open the dashboard panel:
* **AI Provider**: Choose between **Gemini**, **Claude 3.5 Sonnet**, **OpenAI GPT-4o**, or **Custom OpenAI-Compatible**.
* **Model Name**: Model to use (default: `gemini-3.5-flash`).
* **API Key**: Input your API key.
* **Proxy Server Port**: Default is `50906`.

You can also configure these in your VSCode `settings.json`:
```json
{
  "ocr-for-all.provider": "Gemini",
  "ocr-for-all.apiModel": "gemini-3.5-flash",
  "ocr-for-all.apiKey": "your-api-key-here",
  "ocr-for-all.ocrMode": "STANDARD",
  "ocr-for-all.port": 50906
}
```

### 2. Run OCR on a Local File
Click the **Select & Run OCR on File** button in the sidebar or run `OCR for ALL: Run OCR on File...` from the command palette. Select any image (PNG, JPG, WEBP) or PDF file. The extension will read the file, run it through the configured AI model with context, and insert it at your cursor!

### 3. Connect a Remote Client (Proxy Server)
Click the **Start OCR Server** button in the sidebar. The server will bind to port `50906` and broadcast over mDNS as `OCR for ALL VSCode @ <hostname>`.
Connect your tablet/mobile client to this port and send vision API completion payloads. The results will stream back and auto-insert into your active file.

---

## 🔧 Architecture

```
┌─────────────────┐
│   OCR Client    │ (Mobile/Tablet/Web App)
│  (Send Image)   │
└────────┬────────┘
         │ HTTP POST
         │ /v1/chat/completions
         ▼
┌─────────────────┐
│  OCR for ALL    │
│  VSCode Ext     │
│  Port: 50906    │
└────────┬────────┘
         │
         ├─► mDNS Advertisement
         │   (Service Discovery)
         │
         ├─► Context Extraction
         │   (Lines around active cursor)
         │
         ├─► GST Math Validation
         │   (Post-processing corrections)
         │
         ├─► AI Provider API Call
         │   (Gemini, Claude, or OpenAI)
         │
         └─► Insert at Cursor
             (In active document)
```

---

## 🌐 API Endpoints

### Health Check
`GET /health`
Returns the status, port, selected provider, model, mode, and host platform.

### OCR Completions Endpoint
`POST /v1/chat/completions`  
`POST /chat/completions`

Accepts standard OpenAI chat completions format. Send the base64 image data inside the `image_url` property of the user messages content:
```json
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Parse this table"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/png;base64,iVBORw0KGgo..."
          }
        }
      ]
    }
  ],
  "stream": true
}
```

---

## 🛠️ Development & Packaging

### Prerequisites
* Node.js 18+
* VSCode 1.80.0+

### Build & Package
```bash
# Clone the repository and navigate
cd /Users/anjanagarwal/Desktop/Extension

# Install dependencies
npm install

# Compile the typescript code
npm run compile

# Package extension into .vsix for Open VSX / VSCode Marketplace
npx vsce package
```

### Publish to Open VSX
```bash
# Login/Publish using ovsx CLI
npx ovsx publish ocr-for-all-1.0.0.vsix -p <your-open-vsx-access-token>
```

---

## 📝 Commands

Access commands via Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):
* `OCR for ALL: Start Server` - Start the local OCR proxy server
* `OCR for ALL: Stop Server` - Stop the local OCR proxy server
* `OCR for ALL: Run OCR on File...` - Pick a file from disk to run OCR directly

---

## 📄 License
Licensed under the [MIT License](LICENSE).
