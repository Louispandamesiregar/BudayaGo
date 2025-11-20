import React, { useState, useEffect } from 'react';

interface CityAssistantProps {
  selectedCity: string;
  onClose: () => void;
}

// FUNGSI HELPER: Membersihkan karakter Markdown yang mengganggu TTS
const cleanMarkdown = (text: string): string => {
    return text.replace(/\*/g, '').replace(/#/g, '');
};

// Definisikan tipe untuk Webkit Speech Recognition agar TypeScript tidak error
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

// --- KONSTANTA UNTUK LOGIKA COBA ULANG ---
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // Delay 1 detik (1000ms)

// Fungsi untuk menunggu
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
// ----------------------------------------


export default function CityAssistant({ selectedCity, onClose }: CityAssistantProps) {
  const [status, setStatus] = useState('Tekan mikrofon untuk bertanya...');
  const [userTranscript, setUserTranscript] = useState('');
  const [robotResponse, setRobotResponse] = useState('');
  const [isListening, setIsListening] = useState(false);

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsListening(false);
      setStatus('Interaksi dihentikan.');
    }
  };

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      stopSpeaking();
      const cleanedText = cleanMarkdown(text);
      const utterance = new SpeechSynthesisUtterance(cleanedText);
      utterance.lang = 'id-ID';
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn("Browser tidak mendukung Web Speech Synthesis API (TTS).");
    }
  };

  // --- FUNGSI 2: PANGGILAN AI SESUNGGUHNYA (DENGAN LOGIKA COBA ULANG) ---
  const handleQuestion = async (question: string) => {
    setStatus('Mengirim pertanyaan ke Pemandu AI...');
    setRobotResponse('');
    stopSpeaking();

    let lastError: any = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        setStatus(`Mengirim pertanyaan ke Pemandu AI... (Percobaan ${attempt}/${MAX_RETRIES})`);
        const apiResponse = await fetch('/api/assistant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ city: selectedCity, question }),
        });

        if (!apiResponse.ok) {
          // Melempar error agar tertangkap di blok catch dan memicu percobaan ulang
          throw new Error(`Server merespons dengan status ${apiResponse.status}.`);
        }

        // Jika berhasil, keluar dari loop dan fungsi
        const data = await apiResponse.json();
        const answer = data.answer;

        setRobotResponse(answer);
        speakResponse(answer);
        setStatus('Interaksi selesai. Tekan mikrofon lagi untuk bertanya.');
        return; 

      } catch (error) {
        console.error(`AI Assistant Error pada percobaan ${attempt}:`, error);
        lastError = error;

        if (attempt < MAX_RETRIES) {
          // Tunggu sebelum mencoba lagi
          await delay(RETRY_DELAY);
        }
      }
    }

    // Jika semua percobaan gagal
    console.error(`Semua ${MAX_RETRIES} percobaan API gagal.`, lastError);
    const errorMessage = "Maaf, terjadi kesalahan saat menghubungi AI setelah beberapa kali percobaan. Coba lagi nanti.";
    setRobotResponse(errorMessage);
    speakResponse(errorMessage);
    setStatus('Terjadi kesalahan.');
  };
  // ------------------------------------------------------------------------

  const startListening = () => {
    const Recognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!Recognition) {
      setStatus('Maaf, browser Anda tidak mendukung Speech Recognition API.');
      return;
    }

    try {
        const recognition = new Recognition();
        recognition.lang = 'id-ID';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.start();
        setIsListening(true);
        setStatus('Mendengarkan... Silakan ajukan pertanyaan Anda.');

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setUserTranscript(transcript);
            setIsListening(false);
            handleQuestion(transcript);
        };
        recognition.onerror = (event: any) => {
            console.error(event.error);
            setIsListening(false);
            setStatus(`Error: Gagal mengenali suara. ${event.error}.`);
        };

        recognition.onend = () => {
            if (isListening) {
                setIsListening(false);
            }
        };
    } catch (error) {
        console.error("Gagal memulai Speech Recognition:", error);
        setStatus('Terjadi kesalahan saat mencoba fitur suara.');
        setIsListening(false);
    }
  };

  return (

      <div
        className="hologram-assistant-container w-96 rounded-lg bg-gray-900 bg-opacity-80 p-4 text-white border border-cyan-500/50"
        style={{ backdropFilter: 'blur(10px)' }}
      >
        <div className="flex items-start justify-between sticky top-0 bg-gray-900 bg-opacity-90 z-10 p-1 -m-1">
          <h2 className="text-xl font-bold text-cyan-300">Pemandu AI: {selectedCity}</h2>
          <button onClick={onClose} className="leading-none text-gray-400 hover:text-white">&times;</button>
        </div>
        
        <div className="mt-4 text-center">
            <div className="flex justify-center mb-4">
                <button
                    onClick={startListening}
                    disabled={isListening}
                    className={`p-3 rounded-full transition-colors ${
                      isListening
                        ? 'bg-red-700 text-white animate-pulse'
                        : 'bg-cyan-600 hover:bg-cyan-500'
                    }`}
                >
                    {isListening ? '🔴 Bicara Sekarang...' : '🎤 Klik dan Bicara'}
                </button>

                <button
                    onClick={stopSpeaking}
                    className="ml-4 p-3 bg-gray-600 rounded-full hover:bg-gray-500 transition-colors"
                >
                    ⏹️ Stop
                </button>
            </div>

            <p className="text-sm text-gray-400 mt-2 italic">{status}</p>
            {userTranscript && (
                <div className="mt-4 p-3 bg-gray-700 rounded-md text-left">
                    <p className="font-semibold text-gray-200">Anda:</p>
                    <p className="text-sm text-gray-100">{userTranscript}</p>
                </div>
            )}
            {robotResponse && (
                <div
                    className="mt-4 p-3 bg-gray-700 rounded-md text-left"
                    style={{ maxHeight: '18rem', overflowY: 'auto' }}
                >
                    <p className="font-semibold text-cyan-300">Jawaban AI:</p>
                    <p className="text-sm text-gray-100">{robotResponse}</p>
                </div>
            )}

        </div>

        {/* Tombol kembali diletakkan di luar area scroll konten, tapi masih di dalam modal */}
        <button
            onClick={onClose}
            className="mt-6 text-xs text-gray-400 hover:text-white underline"
        >
            &larr; Kembali ke Daftar Kota
        </button>
      </div>
  );
}