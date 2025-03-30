// netlify/functions/getAiResponse.ts
import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import OpenAI from 'openai';

// Initialize OpenAI client securely using environment variable
// IMPORTANT: Do NOT hardcode the API key here!
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // 1. Check prerequisites
  if (!openai) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "OpenAI API key not configured." }),
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405, // Method Not Allowed
      body: JSON.stringify({ error: "Please use the POST method." }),
      headers: { Allow: "POST" },
    };
  }

  // 2. Get transcript from request body
  let transcript = "";
  try {
    if (!event.body) {
      throw new Error("Request body is missing.");
    }
    const body = JSON.parse(event.body);
    transcript = body.transcript;
    if (!transcript || typeof transcript !== 'string' || transcript.trim() === '') {
      throw new Error("Transcript is missing or invalid in request body.");
    }
  } catch (error) {
    console.error("Error parsing request body:", error);
    return {
      statusCode: 400, // Bad Request
      body: JSON.stringify({ error: "Invalid request body. Expecting JSON with a 'transcript' field.", details: error.message }),
    };
  }

  // 3. Construct the prompt and call OpenAI
  try {
    // Get current date/time/location for context (using provided context)
    // In a real scenario, you might pass this from the frontend or determine it differently
    const location = "Dayton, Ohio, United States";
    const now = new Date(); // Consider time zones more carefully if needed
    const time = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' });
    const today = now.toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const systemContext = `You are a helpful voice assistant embedded in a web application. Respond concisely and conversationally. Current location is ${location}. Today is ${today}. The time is ${time}.`;

    console.log(`Sending to OpenAI. Context: ${systemContext}. Transcript: ${transcript}`);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Or "gpt-4" if preferred/available
      messages: [
        { role: "system", content: systemContext },
        { role: "user", content: transcript },
      ],
      max_tokens: 100, // Adjust as needed for response length
      temperature: 0.7, // Adjust for creativity vs consistency
    });

    const aiResponse = completion.choices[0]?.message?.content?.trim();

    if (!aiResponse) {
      throw new Error("Received an empty response from OpenAI.");
    }

    console.log("Received from OpenAI:", aiResponse);

    // 4. Return the AI response
    // --- FIX APPLIED HERE ---
    // Explicitly define the headers object with the required type
    const responseHeaders: { [header: string]: string | number | boolean } = {
        'Content-Type': 'application/json',
    };

    return { // Return the successfully processed response
      statusCode: 200,
      body: JSON.stringify({ response: aiResponse }),
      // Use the explicitly typed headers object here
      headers: responseHeaders,
    };
    // --- END OF FIX ---

  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    let errorMessage = "Failed to get response from AI.";
    // Check if error is an AxiosError or similar structure from OpenAI client
    // Error structure might vary based on OpenAI library version
    if (error.response) {
        console.error("OpenAI Error Status:", error.response.status);
        console.error("OpenAI Error Data:", error.response.data);
        // Attempt to get a more specific message if available
        errorMessage = `OpenAI API Error: ${error.response.data?.error?.message || error.message}`;
    } else if (error instanceof Error) { // Standard JavaScript error
        errorMessage = error.message;
    }
    // Fallback error message already set

    return {
      statusCode: 500, // Internal Server Error
      body: JSON.stringify({ error: errorMessage }),
    };
  }
};

export { handler };