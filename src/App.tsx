// src/App.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import styles from './App.module.css';

const App: React.FC = () => {
  const [textToSpeak, setTextToSpeak] = useState<string>('');
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [isAiResponding, setIsAiResponding] = useState<boolean>(false); // Loading state for AI
  const synth = window.speechSynthesis;

  // Ref to prevent multiple API calls for the same final transcript
  const lastProcessedTranscript = useRef<string | null>(null);

  const speak = useCallback((text: string) => {
    // ...(keep your existing refined speak function here)...
    if (!text || !synth) {
        console.warn("Speech synthesis not available or text is empty.");
        return;
    }
    if (synth.speaking) {
        console.log("Already speaking, cancelling previous utterance.");
        synth.cancel(); // Cancel previous before speaking new
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSynthesizing(true);
    utterance.onend = () => setIsSynthesizing(false);
    utterance.onerror = (event) => {
        console.error('SpeechSynthesis Error:', event);
        setIsSynthesizing(false);
    };
    console.log("Attempting to speak:", text);
    synth.speak(utterance);
  }, [synth]);

  // Define commands - Can keep simple ones, or rely solely on AI
  const commands = [
      // Keep basic control commands maybe? Or remove if AI handles them.
      {
          command: 'stop listening',
          callback: () => handleStopListening()
      },
      {
          command: 'reset transcript',
          callback: () => handleReset()
      },
      // Let AI handle 'hello', 'what time is it', etc.
  ];

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
    finalTranscript, // We'll use this to trigger the AI call
  } = useSpeechRecognition({ commands });


  // --- Function to call Netlify Function ---
  const getAiResponse = async (text: string) => {
      if (!text || text.trim() === '') {
          return; // Don't send empty transcripts
      }

      // Prevent re-processing the exact same final transcript segment
      if (lastProcessedTranscript.current === text) {
          console.log("Skipping duplicate final transcript:", text);
          return;
      }
      lastProcessedTranscript.current = text; // Mark as processed

      console.log("Sending to AI function:", text);
      setIsAiResponding(true); // Set loading state

      try {
          const response = await fetch('/.netlify/functions/getAiResponse', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ transcript: text }),
          });

          if (!response.ok) {
              // Try to parse error json from function response, provide fallback
              const errorBody = await response.json().catch(() => ({ error: "Failed to parse error response from function." }));
              // Construct error message including status code
              throw new Error(`Function Error (${response.status}): ${errorBody?.error || response.statusText}`);
          }

          const data = await response.json();
          if (data.response) {
              console.log("AI Response received:", data.response);
              speak(data.response); // Speak the AI's response
          } else {
              // This case might happen if function returns 200 OK but empty/wrong body structure
              throw new Error("Received success status but no valid response field from function.");
          }

      } catch (error) { // Catch block handles fetch errors or errors thrown above
          console.error("Error fetching AI response:", error); // Log the original error regardless

          // --- FIX APPLIED HERE ---
          let feedbackMessage = "Sorry, I encountered an unknown error trying to respond."; // Default message
          if (error instanceof Error) {
              // If it's an actual Error object, use its message
              // We already include status/details in the message when throwing !response.ok
              feedbackMessage = `Sorry, I encountered an error: ${error.message}`;
          } else {
              // Optional: Handle cases where something other than an Error was thrown
              console.log("Caught a non-Error value in getAiResponse:", error);
          }
          speak(feedbackMessage); // Give verbal error feedback safely
          // --- END OF FIX ---

      } finally {
          setIsAiResponding(false); // Clear loading state
      }
  };


  // --- Effect to trigger AI call on Final Transcript ---
  useEffect(() => {
      // Only trigger if not listening AND there's a new final transcript
      if (!listening && finalTranscript) {
          getAiResponse(finalTranscript);
          // Optionally reset transcript here if you want a clean slate after each command
          // resetTranscript();
      }
      // Note: finalTranscript reference changes even if content is same briefly,
      // hence the lastProcessedTranscript ref check inside getAiResponse
  }, [finalTranscript, listening]); // Trigger when finalTranscript updates and listening stops


  // --- Button Click Handlers ---
   const handleStartListening = () => {
       resetTranscript(); // Clear previous transcript before starting
       lastProcessedTranscript.current = null; // Reset processed flag
       if (!isMicrophoneAvailable) {
           speak("Cannot start listening, microphone is not available.");
           return;
       }
       // Stop any current speech before listening
       if (synth.speaking) {
           synth.cancel();
       }
       SpeechRecognition.startListening({ continuous: false, language: 'en-US' }); // continuous: false is often better for command-response
       // Speak feedback slightly delayed to avoid immediate self-recognition
       // setTimeout(() => speak("Listening"), 100); // Optional feedback
   };

   const handleStopListening = () => {
       SpeechRecognition.stopListening();
       // No need to speak here, useEffect on finalTranscript handles it when listening stops
       // speak("Listening stopped");
   };

   const handleReset = () => {
       resetTranscript();
       lastProcessedTranscript.current = null; // Reset processed flag
       speak("Transcript reset");
   };

   // --- Manual Speech Synthesis ---
   const handleTextToSpeakChange = (event: React.ChangeEvent<HTMLInputElement>) => {
       setTextToSpeak(event.target.value);
   };
   const handleSpeakInput = () => {
       speak(textToSpeak);
   }


  // --- Render Logic ---
  if (!browserSupportsSpeechRecognition) {
    return <div className={styles.container}>Browser doesn't support speech recognition.</div>;
  }

  return (
    <div className={styles.container}>
      <h1>React Voice Interface (AI Powered)</h1>
      {isAiResponding && <div className={styles.loading}>AI is thinking...</div>} {/* Loading Indicator */}

      {/* Speech Recognition Section */}
      <section className={styles.section}>
        <h2>Speech Recognition (Listen)</h2>
        <p className={styles.status}>Microphone: {listening ? 'Listening...' : 'Say something!'}</p>
        <p className={styles.status}>Mic Available: {isMicrophoneAvailable ? 'Yes' : 'No / Permission Denied'}</p>
        <div className={styles.buttonGroup}>
          <button className={`${styles.button} ${listening ? styles.buttonActive : ''}`} onClick={handleStartListening} disabled={listening}>
             {listening ? 'Listening...' : 'Start Listening'}
           </button>
           {/* Stop button might be less necessary with continuous: false */}
           <button className={styles.button} onClick={handleStopListening} disabled={!listening}>Stop Listening</button>
           <button className={styles.button} onClick={handleReset}>Reset Transcript</button>
        </div>
        <div className={styles.transcriptBox}>
            <h3>Transcript:</h3>
            <p>{transcript || "..."}</p>
            {/* Maybe show final transcript separately for debugging */}
            {/* <p><strong>Final:</strong> {finalTranscript || "..."}</p> */}
        </div>
      </section>

      <hr className={styles.divider} />

      {/* Speech Synthesis Section (Keep for manual input/testing) */}
      <section className={styles.section}>
        <h2>Speech Synthesis (Speak Manually)</h2>
        {/* ... keep your manual input field and button ... */}
         <div className={styles.inputGroup}>
            <input type="text" value={textToSpeak} onChange={handleTextToSpeakChange} placeholder="Enter text to speak" className={styles.textInput} disabled={isSynthesizing}/>
            <button className={`${styles.button} ${isSynthesizing ? styles.buttonActive : ''}`} onClick={handleSpeakInput} disabled={!textToSpeak.trim() || isSynthesizing}>
                {isSynthesizing ? 'Speaking...' : 'Speak Text'}
            </button>
        </div>
      </section>
    </div>
  );
};

export default App;