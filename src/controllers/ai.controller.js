const fetch = globalThis.fetch;

async function suggestImprovements(req, res) {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(501).json({ error: 'Gemini AI service is not configured on this server.' });
    }

    // Call Gemini API REST endpoint
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are an expert writing mentor and editor at The Nebula House, a premium writing community.
Analyze the following text (it may contain HTML tags, preserve tags where appropriate or return suggestions in plain/HTML format as needed) and provide optimization suggestions.

Your output must be a valid JSON object only, with no markdown formatting tags (no \`\`\`json block wrapper, just raw JSON).
The JSON object must have exactly the following structure:
{
  "readabilityScore": 85, // number from 0 to 100
  "improvedText": "The corrected or optimized text with improved grammar, style, and flow. Preserve any HTML paragraph (<p>) or styling tags (<strong>, <em>, <a>) if the input contains them.",
  "suggestions": [
    {
      "original": "original text snippet",
      "replacement": "improved text snippet",
      "reason": "explanation of why the change was made (e.g. grammar, vocabulary enhancement, readability, tone)"
    }
  ]
}

Here is the user's text:
"${text}"`
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Gemini API Error details:', data);
      throw new Error(data.error?.message || 'Failed to generate recommendations from Gemini API');
    }

    const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!contentText) {
      throw new Error('Empty response from AI engine');
    }

    // Parse returned JSON from Gemini
    const result = JSON.parse(contentText.trim());
    res.json(result);
  } catch (err) {
    console.error('AI Assistance error:', err);
    res.status(500).json({ error: err.message || 'Server error during AI writing analysis' });
  }
}

module.exports = { suggestImprovements };
