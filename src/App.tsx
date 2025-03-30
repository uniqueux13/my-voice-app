// src/App.tsx
// AI-Powered Voice Interface for React
// Current Context: Saturday, March 29, 2025 - Dayton, Ohio, United States

import React, { useState, useEffect, useCallback, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import styles from './App.module.css'; // Assuming your CSS module is named this

const App: React.FC = () => {
  // State for manual text-to-speech input
  const [textToSpeak, setTextToSpeak] = useState<string>('');
  // State to track if speech synthesis is active
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  // State to track if waiting for AI response from Netlify function
  const [isAiResponding, setIsAiResponding] = useState<boolean>(false);
  // State to store and display the latest AI response text
  const [aiResponseText, setAiResponseText] = useState<string>(''); // State for AI response text

  // Reference to the browser's speech synthesis engine
  const synth = window.speechSynthesis;
  // Ref to track the last processed final transcript to prevent duplicate API calls
  const lastProcessedTranscript = useRef<string | null>(null);

  /**
   * Speaks the provided text using the browser's speech synthesis.
   * Cancels any ongoing speech before starting.
   */
  const speak = useCallback((text: string) => {
    if (!text || !synth) {
      console.warn("Speech synthesis not available or text is empty.");
      return;
    }
    // Cancel ongoing speech to prevent overlap/queuing issues
    if (synth.speaking) {
      console.log("Already speaking, cancelling previous utterance.");
      synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSynthesizing(true);
    utterance.onend = () => setIsSynthesizing(false);
    utterance.onerror = (event) => {
      console.error('SpeechSynthesis Error:', event);
      setIsSynthesizing(false); // Ensure state is reset on error
    };
    console.log("Attempting to speak:", text);
    // Short delay might sometimes help if cancel() doesn't register immediately, but often not needed
    // setTimeout(() => synth.speak(utterance), 50);
    synth.speak(utterance);
  }, [synth]); // Depends only on synth availability

  // Define simple voice commands (can be expanded or removed if AI handles all)
  const commands = [
    {
      command: 'stop listening',
      callback: () => handleStopListening(),
    },
    {
      command: 'reset transcript',
      callback: () => handleReset(),
    },
  ];

  // Hook for speech recognition setup
  const {
    transcript, // Live transcript
    listening, // Boolean indicating if microphone is active
    resetTranscript, // Function to clear the transcript
    browserSupportsSpeechRecognition, // Boolean check
    isMicrophoneAvailable, // Boolean check for mic access
    finalTranscript, // Transcript segment after user stops speaking
  } = useSpeechRecognition({ commands });

  /**
   * Fetches response from the AI backend (Netlify Function).
   * Sends the provided text (transcript) and handles the response.
   */
  const getAiResponse = async (text: string) => {
    // Basic validation
    if (!text || text.trim() === '') {
      return;
    }

    // Prevent sending the exact same finalized text segment multiple times
    if (lastProcessedTranscript.current === text) {
      console.log("Skipping duplicate final transcript:", text);
      return;
    }
    lastProcessedTranscript.current = text; // Mark this text as processed

    console.log("Sending to AI function:", text);
    setIsAiResponding(true); // Show loading state
    // setAiResponseText(''); // Optionally clear previous response display immediately

    try {
      // Call the Netlify function endpoint
      const response = await fetch('/.netlify/functions/getAiResponse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript: text }), // Send transcript in JSON body
      });

      // Handle HTTP errors from the function
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: "Failed to parse error response from function." }));
        throw new Error(`Function Error (${response.status}): ${errorBody?.error || response.statusText}`);
      }

      // Parse the successful JSON response from the function
      const data = await response.json();

      // Check if the expected response field exists
      if (data.response) {
        console.log("AI Response received:", data.response);
        setAiResponseText(data.response); // <<<<<<< Update state with AI response text
        speak(data.response); // Speak the response
      } else {
        throw new Error("Received success status but no valid response field from function.");
      }

    } catch (error) { // Catch fetch errors or errors thrown above
      console.error("Error fetching AI response:", error);

      // Safely create feedback message using type guard
      let feedbackMessage = "Sorry, I encountered an unknown error trying to respond.";
      if (error instanceof Error) {
        feedbackMessage = `Sorry, I encountered an error: ${error.message}`;
      } else {
        console.log("Caught a non-Error value in getAiResponse:", error);
      }
      setAiResponseText(''); // Clear display text on error
      speak(feedbackMessage); // Give verbal error feedback safely

    } finally {
      setIsAiResponding(false); // Hide loading state regardless of success/failure
    }
  };

  /**
   * Effect Hook: Triggers the call to the AI function
   * when listening stops and a new final transcript is available.
   */
  useEffect(() => {
    if (!listening && finalTranscript) {
      getAiResponse(finalTranscript);
      // Optionally reset the transcript visually after processing
      // resetTranscript();
    }
    // Dependencies: Run when listening status or finalTranscript changes
  }, [finalTranscript, listening]);

  // --- UI Action Handlers ---

  /**
   * Starts the speech recognition process.
   * Clears previous transcripts/responses and handles microphone checks.
   */
  const handleStartListening = () => {
    resetTranscript(); // Clear visual transcript
    lastProcessedTranscript.current = null; // Allow processing next final transcript
    setAiResponseText(''); // Clear previous AI response display
    if (!isMicrophoneAvailable) {
      speak("Cannot start listening, microphone is not available.");
      return;
    }
    // Stop any current speech before starting to listen
    if (synth.speaking) {
      synth.cancel();
    }
    // Start listening - continuous: false stops automatically after a pause
    SpeechRecognition.startListening({ continuous: false, language: 'en-US' });
  };

  /**
   * Manually stops the speech recognition.
   * (Often not needed if continuous: false is used).
   */
  const handleStopListening = () => {
    SpeechRecognition.stopListening();
  };

  /**
   * Resets the transcript display and related state.
   */
  const handleReset = () => {
    resetTranscript();
    lastProcessedTranscript.current = null; // Allow processing next final transcript
    setAiResponseText(''); // Clear AI response display
    speak("Transcript reset"); // Provide feedback
  };

  // --- Manual Text Input Handlers ---

  const handleTextToSpeakChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTextToSpeak(event.target.value);
  };

  const handleSpeakInput = () => {
    speak(textToSpeak); // Speak text from the input field
  };

  // --- Render Logic ---

  // Display message if browser doesn't support speech recognition
  if (!browserSupportsSpeechRecognition) {
    return <div className={styles.container}>Browser doesn't support speech recognition. Please try Chrome or Edge.</div>;
  }

  // Main component render
  return (
    <div className={styles.container}>
      <h1>React Voice Interface (AI Powered)</h1>

      {/* Optional global loading indicator separate from response box */}
      {/* {isAiResponding && <div className={styles.loading}>Thinking...</div>} */}

      {/* --- Speech Recognition Section --- */}
      <section className={styles.section}>
        <h2>Speech Recognition (Listen)</h2>
        <p className={styles.status}>Microphone: {listening ? 'Listening...' : 'Click Start or Say Command'}</p>
        <p className={styles.status}>Mic Available: {isMicrophoneAvailable ? 'Yes' : 'No / Permission Denied'}</p>
        <div className={styles.buttonGroup}>
          {/* Start Listening Button */}
          <button
             className={`${styles.button} ${listening ? styles.buttonActive : ''}`}
             onClick={handleStartListening}
             disabled={listening}
             title={listening ? "Currently listening" : "Start listening for voice input"}
           >
             {listening ? 'Listening...' : 'Start Listening'}
           </button>
           {/* Stop Listening Button (optional if continuous: false) */}
           <button
             className={styles.button}
             onClick={handleStopListening}
             disabled={!listening}
             title="Manually stop listening"
            >
             Stop Listening
            </button>
           {/* Reset Transcript Button */}
           <button
             className={styles.button}
             onClick={handleReset}
             title="Clear the transcript and last AI response"
            >
             Reset Transcript
            </button>
        </div>
        {/* Transcript Display Box */}
        <div className={styles.transcriptBox}>
            <h3>Transcript:</h3>
            <p>{transcript || "..."}</p>
        </div>

        {/* --- AI Response Display Section --- */}
        {/* Show this box if AI is responding OR if there's text to display */}
        {(isAiResponding || aiResponseText) && (
            <div className={styles.aiResponseBox}>
                <h3>AI Response:</h3>
                {isAiResponding ? (
                    // Display loading indicator while waiting
                    <p><i>AI is thinking...</i></p>
                ) : (
                    // Display the response text once received
                    <p>{aiResponseText}</p>
                )}
            </div>
        )}
        {/* --- End of AI Response Section --- */}

      </section>

      <hr className={styles.divider} />

      {/* --- Manual Speech Synthesis Section --- */}
      <section className={styles.section}>
        <h2>Speech Synthesis (Speak Manually)</h2>
        <div className={styles.inputGroup}>
          {/* Input field for text */}
          <input
            type="text"
            value={textToSpeak}
            onChange={handleTextToSpeakChange}
            placeholder="Enter text for the app to speak"
            className={styles.textInput}
            disabled={isSynthesizing} // Disable input while speaking
          />
          {/* Speak Button */}
          <button
            className={`${styles.button} ${isSynthesizing ? styles.buttonActive : ''}`}
            onClick={handleSpeakInput}
            disabled={!textToSpeak.trim() || isSynthesizing} // Disable if no text or already speaking
            title="Speak the text entered above"
          >
            {isSynthesizing ? 'Speaking...' : 'Speak Text'}
          </button>
        </div>
      </section>
    </div>
  );
};

export default App;