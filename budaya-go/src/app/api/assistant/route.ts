// src/app/api/assistant/route.ts
import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

// Pastikan .env.local sudah diisi dengan GEMINI_API_KEY
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    // Tampilkan error jika kunci tidak ditemukan di environment variables
    throw new Error("GEMINI_API_KEY is not set in environment variables.");
}

const ai = new GoogleGenAI({ apiKey });
const model = "gemini-2.5-flash"; // Model yang cepat dan efisien

interface RequestBody {
    city: string;
    question: string;
}

export async function POST(request: Request) {
    try {
        const { city, question }: RequestBody = await request.json();

        if (!city || !question) {
            return NextResponse.json({ error: 'Missing city or question in request body' }, { status: 400 });
        }

        const prompt = `Anda adalah pemandu wisata virtual yang berinteraksi dalam Bahasa Indonesia. 
        Anda bertanggung jawab penuh untuk menjawab pertanyaan tentang ${city}. 
        Pertanyaan dari pengunjung adalah: "${question}". 
        
        Terdapat BATASAN KERAS: JIKA PERTANYAAN MENGACU PADA KOTA LAIN selain ${city}, 
        MAKA JAWABLAH DENGAN SOPAN BAHWA FOKUS ANDA ADALAH ${city} DAN MINTA PENGUNJUNG 
        UNTUK BERTANYA TENTANG ${city} SAJA.
        
        Jawablah pertanyaan yang relevan dengan ringkas dan informatif, fokus pada budaya, sejarah, atau wisata kota tersebut. 
        Mulai jawaban Anda dengan sapaan singkat, misalnya: "Tentu, mari kita bahas..."`;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                temperature: 0.5,
            }
        });

        // Pengamanan optional chaining untuk struktur respons
        const candidate = response.candidates?.[0];

        if (!candidate || !candidate.content?.parts?.[0]?.text) {
             return NextResponse.json({ error: 'AI returned an empty response or invalid structure.' }, { status: 500 });
        }
        
        const textResponse = candidate.content.parts[0].text.trim();

        return NextResponse.json({ answer: textResponse });

    } catch (error) {
        // Tampilkan error secara detail di terminal server
        console.error("FATAL GEMINI API ERROR:", error);
        return NextResponse.json({ error: 'Failed to communicate with AI assistant.' }, { status: 500 });
    }
}