// Gemini utility for Google Generative AI API
// WARNING: API key is hardcoded for development/testing only. Do not use in production.

export const GEMINI_API_KEY = 'AIzaSyAltA40J7VHlAuavtsVj7JxOB78xdHyvzw';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function enhanceNoteContentWithGemini(content: string): Promise<string | null> {
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key not set.');
    return null;
  }
  try {
    const prompt = `Format the following note content for beautiful display in a mobile app. Use markdown or HTML for titles, lists, blockquotes, code blocks, highlights, and images. Make it visually appealing and easy to read.\n\nContent:\n${content}`;
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      console.warn('Gemini API error:', data);
      return null;
    }
    // Gemini returns candidates[0].content.parts[0].text
    const enhanced = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!enhanced) {
      console.warn('Gemini API returned no content:', data);
    }
    return enhanced || null;
  } catch (e) {
    console.warn('Gemini enhancement failed:', e);
    return null;
  }
} 