# My Voice App - AI-Powered Voice Interface

This is a React application that provides a voice-controlled interface powered by AI. It uses the browser's speech recognition to capture user voice input, sends it to an AI backend (via a Netlify function connected to OpenAI), displays the AI's response, and speaks it back using speech synthesis.

*(Screenshot placeholder: Consider adding a screenshot or GIF of the app in action here!)*

## Features

* **Voice-to-Text:** Listens to your microphone and transcribes speech in real-time.
* **AI Interaction:** Sends your transcribed speech to an AI (via Netlify Function using OpenAI API) upon pausing.
* **AI Response Display:** Shows the text response received from the AI.
* **Text-to-Speech:** Speaks the AI's response aloud using the browser's synthesis engine.
* **Manual Input:** Allows typing text manually and having the application speak it.
* **Status Indicators:** Provides visual feedback for microphone status (listening/idle, available/unavailable), and when the AI is processing a response.
* **Basic Voice Commands:** Includes "stop listening" and "reset transcript".

## Technology Stack

* **Frontend:** React, TypeScript
* **Build Tool:** Vite (Assumed - please verify)
* **Speech Recognition:** Web Speech API via `react-speech-recognition`
* **Speech Synthesis:** Web Speech API (`window.speechSynthesis`)
* **AI Backend:** OpenAI API (accessed via Netlify Functions)
* **Hosting & Functions:** Netlify
* **Styling:** CSS Modules

## Getting Started

### Prerequisites

* **Node.js & npm (or yarn):** Make sure you have Node.js installed. You can download it from [nodejs.org](https://nodejs.org/).
* **Browser:** A modern browser that supports the Web Speech API (e.g., Chrome, Edge).
* **Microphone:** A working microphone connected to your computer and browser permission granted for its use.
* **OpenAI API Key:** You need an API key from [OpenAI](https://openai.com/api/).
* **Netlify Account:** Required for deploying the Netlify function (and the app itself). You can sign up at [netlify.com](https://www.netlify.com/).

### Installation & Local Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/uniqueux13/my-voice-app.git](https://github.com/uniqueux13/my-voice-app.git)
    cd my-voice-app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or if you use yarn:
    # yarn install
    ```

3.  **Set up Environment Variables:**
    * You need to configure your OpenAI API key for the Netlify function. For local development using Netlify Dev, create a `.env` file in the root of the project:
        ```env
        # .env
        OPENAI_API_KEY=your_openai_api_key_here
        ```
    * **Important:** Ensure the Netlify function (`netlify/functions/getAiResponse.js` or `.ts` - *You'll need to create this function based on the frontend call*) reads this environment variable.

4.  **Run Locally with Netlify Dev:**
    To test the full application including the serverless function interaction locally, use the Netlify CLI:
    ```bash
    npm install -g netlify-cli # Install Netlify CLI globally if you haven't already
    netlify dev             # Starts the Vite dev server and Netlify Functions emulator
    ```
    This command typically runs your Vite development server (like `npm run dev`) and makes the Netlify function available at the correct endpoint (`/.netlify/functions/getAiResponse`). Access the app in your browser at the URL provided by `netlify dev` (usually `http://localhost:8888`).

### Netlify Function (`getAiResponse`)

* You need to create the Netlify function referenced in `App.tsx` (`Workspace('/.netlify/functions/getAiResponse', ...)`).
* This function should:
    * Be located in the `netlify/functions` directory (e.g., `netlify/functions/getAiResponse.ts`).
    * Receive the `transcript` in the request body.
    * Read the `OPENAI_API_KEY` from environment variables.
    * Make a request to the OpenAI API (e.g., Chat Completions endpoint) using the transcript.
    * Return the AI's response in a JSON object like `{ "response": "The AI's answer here" }`.
* **Example Structure (conceptual):**
    ```typescript
    // netlify/functions/getAiResponse.ts (Simplified Example)
    import { Handler, HandlerEvent } from '@netlify/functions';
    import OpenAI from 'openai';

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const handler: Handler = async (event: HandlerEvent) => {
      if (event.httpMethod !== 'POST' || !event.body) {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
      }

      try {
        const { transcript } = JSON.parse(event.body);

        if (!transcript) {
          return { statusCode: 400, body: JSON.stringify({ error: 'Transcript required' }) };
        }

        // Make call to OpenAI (adjust model and parameters as needed)
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo", // Or your preferred model
          messages: [{ role: "user", content: transcript }],
        });

        const aiResponse = completion.choices[0]?.message?.content || "Sorry, I couldn't get a response.";

        return {
          statusCode: 200,
          body: JSON.stringify({ response: aiResponse }),
        };

      } catch (error: any) {
        console.error("Error calling OpenAI:", error);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: `Failed to get AI response: ${error.message || 'Unknown error'}` }),
        };
      }
    };

    export { handler };
    ```
    *(Note: This example uses the `openai` v4+ library. Ensure you install it: `npm install openai`)*

## Usage

1.  Start the application locally using `netlify dev`.
2.  Open the provided URL in a compatible browser (Chrome/Edge recommended).
3.  Grant microphone access if prompted.
4.  Click the "Start Listening" button.
5.  Speak clearly. Your speech will be transcribed in the "Transcript" box.
6.  Pause speaking. The app will automatically send the transcript to the AI.
7.  Wait for the AI response, which will appear in the "AI Response" box and be spoken aloud.
8.  You can also type text into the "Speech Synthesis" input field and click "Speak Text" to hear it read aloud.

## Deployment

1.  Push your code to your GitHub repository.
2.  Connect your GitHub repository to a new site on [Netlify](https://app.netlify.com/start).
3.  Configure the build settings (Netlify usually detects Vite settings automatically):
    * **Build command:** `npm run build` (or `yarn build`)
    * **Publish directory:** `dist` (Vite's default)
4.  **Crucially:** Add your `OPENAI_API_KEY` as an environment variable in the Netlify site's settings (under **Site configuration > Build & deploy > Environment > Environment variables**).
5.  Deploy the site. Netlify will build your app and deploy the function from the `netlify/functions` directory.





