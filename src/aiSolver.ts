import { GoogleGenAI } from '@google/genai'
export async function solveChemistryFromImage(base64Image: string, apiKey: string, mimeType: string): Promise<string> {
  // Mengekstrak hanya data base64 jika menyertakan prefix data URL
  const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

  const ai = new GoogleGenAI({ apiKey })

  // Prompt disesuaikan untuk konteks siswa SMA di Indonesia
  const prompt = `const prompt = `Anda adalah seorang Guru Kimia SMA yang ahli, ramah, dan solutif di Indonesia.Analisis gambar papan tulis atau soal kimia berikut.Berikan penjelasan dengan Bahasa Indonesia yang mudah dipahami siswa SMA, tidak terlalu kaku, namun tetap akurat secara ilmiah.
    Ikuti panduan berikut sesuai dengan isi gambar:
      1. Jika berisi Persamaan Reaksi: Setarakan reaksinya jika belum setara, sebutkan nama reaktan dan produknya, serta jelaskan makna reaksi tersebut secara singkat (misal: reaksi pembakaran, asam-basa, redoks).
  2. Jika berisi Struktur Molekul(Karbon / Organik / Anorganik): Berikan nama sesuai tata nama IUPAC, sebutkan golongan senyawanya(alkana, alkohol, dll), dan sebutkan 1 - 2 sifat khas atau kegunaannya dalam kehidupan sehari - hari.
3. Jika berisi Soal Hitungan(Stoikiometri, Laju Reaksi, Termokimia, dll): Selesaikan dengan metode terstruktur(Diketahui, Ditanya, Jawab).Berikan penjelasan langkah demi langkah(step - by - step) agar siswa paham alur berpikirnya, bukan sekadar hasil akhir.
Gunakan format teks yang rapi seperti cetak tebal untuk istilah penting dan poin - poin agar mudah dibaca di layar HP atau komputer.`;
`;
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
    return response.text || "Maaf, Bapak/Ibu guru AI tidak dapat memahami gambar tersebut. Coba foto ulang dengan lebih jelas, ya!"
  } catch (error: any) {
    console.error("AI Solver Error:", error)
    throw new Error(error.message || "Gagal mendapatkan respons dari AI. Pastikan API key Anda sudah benar dan kuota internet lancar.")
  }
}
