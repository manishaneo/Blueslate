import { useState, useRef, useEffect, useCallback } from "react";

export function useSpeechRecognition(onTranscript) {
    const [listening, setListening] = useState(false);
    const [error, setError]         = useState(null);
    const recognitionRef = useRef(null);
    const callbackRef    = useRef(onTranscript);

    useEffect(() => { callbackRef.current = onTranscript; });

    const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

    useEffect(() => {
        if (!supported) return;
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new SR();
        rec.continuous     = false;
        rec.interimResults = false;
        rec.lang           = "en-US";

        rec.onresult = (e) => {
            const transcript = Array.from(e.results)
                .map((r) => r[0].transcript)
                .join(" ")
                .trim();
            if (transcript) callbackRef.current(transcript);
        };

        rec.onerror = (e) => {
            if (e.error === "not-allowed") {
                setError("Microphone access denied. Check browser permissions.");
            } else if (e.error === "no-speech") {
                setError(null);
            } else {
                setError(`Recognition error: ${e.error}.`);
            }
            setListening(false);
        };

        rec.onend = () => setListening(false);

        recognitionRef.current = rec;
        return () => { rec.abort(); };
    }, [supported]);

    const toggle = useCallback(() => {
        const rec = recognitionRef.current;
        if (!rec) return;
        if (listening) {
            rec.stop();
        } else {
            setError(null);
            try {
                rec.start();
                setListening(true);
            } catch {
                setError("Could not start microphone.");
            }
        }
    }, [listening]);

    const start = useCallback(() => {
        const rec = recognitionRef.current;
        if (!rec) return;
        setError(null);
        try {
            rec.start();
            setListening(true);
        } catch {
            // already started — ignore
        }
    }, []);

    const stop = useCallback(() => {
        const rec = recognitionRef.current;
        if (!rec) return;
        rec.stop();
    }, []);

    return { listening, supported, error, toggle, start, stop };
}

export function useSpeechSynthesis() {
    const [speakingIndex, setSpeakingIndex] = useState(null);
    const supported = !!window.speechSynthesis;

    useEffect(() => {
        return () => { if (supported) window.speechSynthesis.cancel(); };
    }, [supported]);

    const speak = useCallback((index, text) => {
        if (!supported) return;
        if (speakingIndex === index) {
            window.speechSynthesis.cancel();
            setSpeakingIndex(null);
            return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend   = () => setSpeakingIndex(null);
        utterance.onerror = () => setSpeakingIndex(null);
        window.speechSynthesis.speak(utterance);
        setSpeakingIndex(index);
    }, [speakingIndex, supported]);

    return { speakingIndex, supported, speak };
}
