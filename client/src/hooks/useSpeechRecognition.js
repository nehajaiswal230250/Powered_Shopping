import { useEffect, useRef, useState } from "react";

export const useSpeechRecognition = ({ onFinalResult, continuous = false }) => {
  const recognitionRef = useRef(null);
  const permissionStreamRef = useRef(null);
  const onFinalResultRef = useRef(onFinalResult);
  const shouldListenRef = useRef(false);
  const networkRetryRef = useRef(0);
  const [supported, setSupported] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    onFinalResultRef.current = onFinalResult;
  }, [onFinalResult]);

  useEffect(() => {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "::1";
    if (!window.isSecureContext && !isLocalhost) {
      setSupported(false);
      setError("Voice input needs HTTPS, or open the app on localhost during development.");
      return undefined;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return undefined;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = continuous;

    recognition.onstart = () => {
      networkRetryRef.current = 0;
      setError("");
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setInterimText(interimTranscript.trim());

      if (finalTranscript.trim()) {
        setInterimText("");
        onFinalResultRef.current(finalTranscript.trim());
      }
    };

    recognition.onerror = (event) => {
      const errorCode = event.error;
      if (event.error === "no-speech") {
        setError("I couldn't hear you clearly. Try speaking closer to the mic.");
      } else if (event.error === "audio-capture") {
        setError("Microphone device is unavailable.");
      } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone access denied. Please allow permissions and retry.");
        shouldListenRef.current = false;
      } else if (event.error === "network") {
        if (networkRetryRef.current < 2 && shouldListenRef.current) {
          networkRetryRef.current += 1;
          setError("Browser speech service is temporarily unavailable. Retrying...");
          setTimeout(() => {
            try {
              recognition.start();
            } catch {
              setError("Browser speech service is unavailable. Use the fallback recorder or type your command.");
            }
          }, 350);
          return;
        }
        setError("Browser speech service is unavailable. Use the fallback recorder or type your command.");
      } else if (event.error === "language-not-supported") {
        setError("Selected speech language is not supported on this device.");
      } else if (event.error === "aborted") {
        setError("Voice input was interrupted. Tap start and try again.");
      } else {
        setError(`Voice recognition error (${errorCode || "unknown"}). Please try again.`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText("");

      if (continuous && shouldListenRef.current) {
        try {
          recognition.start();
        } catch {
          setTimeout(() => {
            try {
              recognition.start();
            } catch {
              setError("Continuous listening paused. Tap start mic again.");
            }
          }, 150);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      if (permissionStreamRef.current) {
        permissionStreamRef.current.getTracks().forEach((track) => track.stop());
        permissionStreamRef.current = null;
      }
      try {
        recognition.stop();
      } catch {
        // Ignore lifecycle race while effect unmounts/re-initializes.
      }
    };
  }, [continuous]);

  const ensureMicrophoneAccess = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser cannot access the microphone.");
    }

    if (permissionStreamRef.current) {
      return permissionStreamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    permissionStreamRef.current = stream;
    return stream;
  };

  const startListening = async () => {
    if (recognitionRef.current && !isListening) {
      shouldListenRef.current = true;
      setError("");
      try {
        await ensureMicrophoneAccess();
        recognitionRef.current.start();
      } catch (err) {
        const errorName = err?.name || "";
        if (errorName === "NotAllowedError" || errorName === "SecurityError") {
          setError("Microphone permission was blocked. Allow mic access in the browser and retry.");
        } else if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
          setError("No microphone was found on this device.");
        } else if (errorName === "NotReadableError" || errorName === "TrackStartError") {
          setError("Microphone is busy in another app or browser tab.");
        } else {
          setError("Microphone is busy. Stop other recording apps/tabs and retry.");
        }
        shouldListenRef.current = false;
      }
    }
  };

  const stopListening = () => {
    shouldListenRef.current = false;
    if (permissionStreamRef.current) {
      permissionStreamRef.current.getTracks().forEach((track) => track.stop());
      permissionStreamRef.current = null;
    }
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        setError("Unable to stop microphone cleanly. Please try again.");
      }
    }
  };

  return {
    supported,
    isListening,
    interimText,
    error,
    startListening,
    stopListening
  };
};
