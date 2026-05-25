# OCR for ALL: Ultimate AI Image to Text & Document Parser

[![Open VSX](https://img.shields.io/open-vsx/v/ocr-for-all/ocr-for-all.svg?color=brightgreen&style=flat-square)](https://open-vsx.org/extension/ocr-for-all/ocr-for-all)
[![Downloads](https://img.shields.io/open-vsx/dt/ocr-for-all/ocr-for-all.svg?color=orange&style=flat-square)](https://open-vsx.org/extension/ocr-for-all/ocr-for-all)
[![License](https://img.shields.io/github/license/vajrainternationalexports-byte/OCR.svg?color=blue&style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-blueviolet.svg?style=flat-square)](https://github.com/vajrainternationalexports-byte/OCR)

> **Ultra High Enrichment AI OCR — Powered by Gemini · Claude 3.5 Sonnet · OpenAI GPT-4o**
>
> **OCR for ALL** is the ultimate VSCode extension that converts *any* visual document, image, or scan into clean, structured text, Markdown, LaTeX, or JSON — directly at your cursor inside your editor.

---

## 🚀 Why OCR for ALL? (The AI Advantage)

Traditional OCR engines (like Tesseract) simply map pixels to characters, resulting in broken lines, spelling mistakes, and messy formatting. 

**OCR for ALL** uses advanced AI vision models (Gemini, Claude, GPT-4o) that **read, reason, and understand context**. 
* 💎 **Ultra High Enrichment**: The AI corrects spelling ambiguities, validates mathematical calculations, formats tables properly, and writes clean Markdown.
* 🧠 **Context-Aware OCR**: It reads the code/text surrounding your active cursor to automatically match your naming conventions, programming language, variables, and indentation style.
* 📶 **Local Network OCR Gateway**: Runs a local server broadcasting via mDNS so you can snap a photo with your mobile or iPad and watch the transcribed text appear at your cursor in real time.

---

## ✨ Features & Core Capabilities

| Input Type | Best OCR Mode | Output Format | Ideal Use Cases |
| :--- | :--- | :--- | :--- |
| 🖼️ **Screenshots & Snaps** | `STANDARD` | Raw / Clean Text | Code snippets, error logs, quick notes |
| 📄 **Scanned Documents** | `MARKDOWN` | Structured Markdown | E-books, research papers, READMEs, articles |
| ✍️ **Handwritten Formulas** | `LATEX` | LaTeX Math Notation | Math homework, academic papers, scientific notes |
| 📊 **Printed Tables / Sheets** | `TABLE` | GitHub-Flavored Table | Spreadsheets, CSVs, financial ledgers |
| 🧾 **Invoices, Bills & Receipts** | `INVOICE_JSON` | Structured/Validated JSON | Procurement, sales logs, expense tracking |
| 🌫️ **Blurry / Low-quality Scans** | `AUTO_DETECT` | Enriched Clean Output | Faded documents, low-contrast photos, hazy scans |

---

## 🎯 Deep Dive: Supported Modes

### 1. Standard Text OCR (`STANDARD`)
Extracts text with high fidelity, keeping original line breaks while eliminating scanning artifacts.

### 2. Markdown Document Structuring (`MARKDOWN`)
Converts scanned articles, PDFs, and screenshots into clean, semantic Markdown document trees, including headers (`#`, `##`), bold text, blockquotes, and lists.

### 3. Handwritten LaTeX Math OCR (`LATEX`)
Perfect for students, researchers, and engineers. Draw or snapshot any complex algebraic formula, calculus equation, or matrix, and the extension instantly inserts the exact, compile-ready LaTeX math notation (e.g. `\int_{a}^{b} f(x) \, dx`).

### 4. Image to Markdown Tables (`TABLE`)
Strips out the borders and extracts structured tabular data from images directly into standard Markdown tables (`| Col 1 | Col 2 |`).

### 5. Smart Invoice & Bill Parser (`INVOICE_JSON`)
Specifically optimized for accounting and logistics:
* Extracts supplier name, date, invoice numbers, line items, quantities, and GST rates.
* **Auto-Correction Engine**: Runs algebraic checks on line items, cross-checks Intrastate vs Interstate GST rates, handles rounding offsets, and generates word equivalents of totals automatically.

### 6. Auto-Detect (`AUTO_DETECT`)
Let the AI determine the type of document automatically and format the response optimally.

---

## 🔌 Local Network Proxy & Discovery

Transform your VSCode into an OCR terminal for your physical devices:
* **mDNS Advertising**: The extension advertises a local service `_ocr-for-all._tcp` using multicast DNS.
* **Mobile / Tablet Integration**: Snap images using your phone, iPad, or remote scanner rig, send them to the local server, and see the text instantly typed onto your active VSCode screen.
* **Cross-Platform Support**: Works seamlessly on macOS, Windows, and Linux.

---

## 📦 Installation & Setup

### Install via Open VSX Registry (Recommended)
Search for `OCR for ALL` in your VSCode Extensions tab (`Cmd+Shift+X` or `Ctrl+Shift+X`) and click **Install**.

### Install manually via VSIX
1. Download the latest `.vsix` release from the [GitHub Releases Page](https://github.com/vajrainternationalexports-byte/OCR/releases).
2. Open VSCode, click the three dots (`...`) in the Extensions view, and select **Install from VSIX...**.
3. Select the downloaded `.vsix` file.

---

## 🚀 Getting Started in 3 Steps

### 1. Configure the AI Provider
Open the **OCR for ALL** tab in the VSCode Activity Bar (looks like an eye icon `$(eye)`).
* Choose your provider: **Gemini**, **Claude 3.5 Sonnet**, **OpenAI GPT-4o**, or a **Custom OpenAI-Compatible** endpoint.
* Enter your API Key.
* *(Optional)* Customize the default OCR mode and the context radius.

Alternatively, edit your global `settings.json`:
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
* Open the command palette (`Cmd+Shift+P` / `Ctrl+Shift+P`).
* Select **OCR for ALL: Run OCR on File...**
* Choose any image (PNG, JPEG, WEBP) or PDF. The extension processes the document and inserts the results at your active cursor.

### 3. Start the Local Network Server
* Click **Start OCR Server** in the sidebar panel.
* The server will run on port `50906` and advertise itself to your local network.
* Send standard OpenAI-format POST requests to `http://localhost:50906/v1/chat/completions` (see API spec below).

---

## 🔧 Architecture & Flow

```
┌──────────────────────────┐
│   Remote OCR Client      │ (iPad, iPhone, Android, Scanner)
│   (Upload Base64 Image)  │
└────────────┬─────────────┘
             │ HTTP POST (Port: 50906)
             ▼
┌──────────────────────────┐
│   OCR for ALL Proxy      │
│   (Runs inside VSCode)   │
└────────────┬─────────────┘
             ├─► mDNS Service Discovery (Local network broadcast)
             │
             ├─► Active Editor Context Lookup (Grabs surrounding code)
             │
             ├─► GST Math & Rounding Correction (Algorithmic validation)
             │
             ├─► Multi-Model Vision API Call (Gemini, Claude, or OpenAI)
             │
             ▼
┌──────────────────────────┐
│   Active Cursor Location │
│   (Types text instantly) │
└──────────────────────────┘
```

---

## 🌐 API Specification (For Custom Clients)

You can send standard OpenAI-format completions payloads to integrate your own scanner app:

### Health Check
`GET /health`  
Returns metadata on server status, port, active provider, model, and host OS.

### Chat Completions
`POST /v1/chat/completions` or `POST /chat/completions`
```json
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Convert this table to Markdown"
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

## 💡 Frequently Asked Search Queries (FAQ & Use Cases)

#### Q: How do I convert a blurry screenshot of code into actual text?
**A:** Open VSCode, select the **OCR for ALL** command, and pick your screenshot. The AI will look at your active file context, intelligently correct any fuzzy characters (like confusing `1` and `l` or `0` and `O`), match your current language syntax, and type it in.

#### Q: Can I copy equations from a textbook scan directly into LaTeX?
**A:** Yes! Select `LATEX` mode in the sidebar, capture the equation image, and OCR for ALL will output structured, compile-ready LaTeX math code.

#### Q: How do I export table images into VSCode markdown files?
**A:** Set the default OCR mode to `TABLE`. Once you capture or select the table image, the AI parses all columns and rows and constructs a clean, formatted Markdown table instantly.

#### Q: Does my API key leave my machine?
**A:** No. All API calls to Gemini, Claude, or OpenAI are executed directly from your local VSCode instance to the respective LLM servers. Your API key is stored securely in your local VSCode configuration.

---

## 🛠️ Contributing & Local Development

We welcome pull requests and feature suggestions!

```bash
# Clone the repository
git clone https://github.com/vajrainternationalexports-byte/OCR.git
cd OCR

# Install dependencies
npm install

# Compile the project
npm run compile

# Package the extension locally
npx vsce package
```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
