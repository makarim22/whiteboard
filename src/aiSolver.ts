import { GoogleGenAI } from '@google/genai'

export async function solveChemistryFromImage(base64Image: string, apiKey: string, mimeType: string): Promise<string> {
  // Extract just the base64 data if it includes the data URL prefix
  const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
  
  const ai = new GoogleGenAI({ apiKey })
  
  const prompt = "You are an expert Chemistry Teacher. Analyze this whiteboard drawing. If it contains a chemical equation, balance it and explain it. If it's a molecular structure, name it and describe its properties. If it's a general chemistry problem, solve it step-by-step. Keep the explanation concise, clear, and easy to read for a student."

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Data
              }
            }
          ]
        }
      ]
    })

    return response.text || "Maaf, saya tidak dapat memahami gambar tersebut."
  } catch (error: any) {
    console.error("AI Solver Error:", error)
    throw new Error(error.message || "Gagal mendapatkan respons dari AI. Periksa API key Anda.")
  }
}
