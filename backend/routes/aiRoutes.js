const express = require('express');
const router = express.Router();
const pdfParse = require('pdf-parse');
const { body, validationResult } = require('express-validator');
const { requireApprovedHod } = require('../middleware/auth');

/**
 * Fallback Rule-Based Parser: Cleanly parses Title, Category, and Content from extracted text
 */
const smartRuleBasedParse = (pdfText, defaultName = '') => {
  if (!pdfText || pdfText.trim().length === 0) {
    return {
      title: 'College Circular / Notice Document',
      content: '<p>Attached official PDF document circular. Please review attachment for full guidelines.</p>',
      type: 'NOTICE',
      timetableEntries: []
    };
  }

  // Split into lines and filter out empty or short header lines
  const lines = pdfText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && !/^%PDF/i.test(l) && !/^\d+$/.test(l));

  const fullText = lines.join(' ');

  // Find a line that looks like a title
  let title = lines.find((l) => 
    /circular|notice|schedule|timetable|examination|fest|event|department|program|account|portal|guideline|instruction/i.test(l) && l.length > 8 && l.length < 120
  ) || lines[0] || 'College Announcement';

  title = title.replace(/^[^a-zA-Z0-9]+/, '').trim();
  if (title.length > 100) title = title.substring(0, 100);

  // Category Detection
  let type = 'NOTICE';
  if (/timetable|date\s*sheet|exam\s*schedule|examination\s*schedule|semester.*exam/i.test(fullText)) {
    type = 'TIMETABLE';
  } else if (/fest|cultural|workshop|seminar|sports|celebration|event|guest\s*lecture/i.test(fullText)) {
    type = 'EVENT';
  }

  // Extract timetable entries if category is timetable
  const timetableEntries = [];
  if (type === 'TIMETABLE') {
    const dateRegex = /(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{2,4})/gi;
    const timeRegex = /(\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*[-–to]+\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}:\d{2}\s*(?:am|pm)?)/gi;

    lines.forEach((line) => {
      const dates = line.match(dateRegex);
      const times = line.match(timeRegex);
      if (dates || times) {
        const parts = line.split(/\s{2,}|\t|\|/);
        const subject = parts.find((p) => !dateRegex.test(p) && !timeRegex.test(p) && p.length > 3) || 'Subject Paper';
        timetableEntries.push({
          subject: subject.trim(),
          date: dates ? dates[0] : new Date().toISOString().split('T')[0],
          time: times ? times[0] : '10:00 AM - 01:00 PM',
          room: ''
        });
      }
    });
  }

  // Content Formatting
  // Format the extracted text into paragraphs or bullet list
  let htmlContent = `<p><strong>${title}</strong></p><ul class="list-disc pl-5 mt-2 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">`;
  const listItems = lines.slice(0, 15).map((l) => `<li>${l}</li>`).join('');
  htmlContent += listItems + `</ul><p class="mt-3 text-xs text-slate-500">Please check the attached PDF document for full circular details.</p>`;

  return {
    title,
    content: htmlContent,
    type,
    timetableEntries: timetableEntries.slice(0, 15)
  };
};

/**
 * Provider 1: Groq API
 */
const analyzeWithGroq = async (apiKey, pdfText, promptText) => {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const payload = {
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: promptText },
      { role: 'user', content: `DOCUMENT TEXT:\n${pdfText.substring(0, 10000)}` }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errObj = await res.json().catch(() => ({}));
    throw new Error(errObj.error?.message || `Groq Error HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content;
};

/**
 * Provider 2: OpenRouter API
 */
const analyzeWithOpenRouter = async (apiKey, pdfText, promptText) => {
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const payload = {
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    messages: [
      { role: 'system', content: promptText },
      { role: 'user', content: `DOCUMENT TEXT:\n${pdfText.substring(0, 10000)}` }
    ],
    response_format: { type: 'json_object' }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errObj = await res.json().catch(() => ({}));
    throw new Error(errObj.error?.message || `OpenRouter Error HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content;
};

/**
 * Provider 3: OpenAI API
 */
const analyzeWithOpenAI = async (apiKey, pdfText, promptText) => {
  const url = 'https://api.openai.com/v1/chat/completions';
  const payload = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: promptText },
      { role: 'user', content: `DOCUMENT TEXT:\n${pdfText.substring(0, 10000)}` }
    ],
    response_format: { type: 'json_object' }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errObj = await res.json().catch(() => ({}));
    throw new Error(errObj.error?.message || `OpenAI Error HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content;
};

/**
 * Provider 4: Direct Google Gemini API (Multimodal PDF)
 */
const analyzePdfWithGemini = async (apiKey, pdfBase64, promptText) => {
  const models = ['gemini-1.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-2.0-flash'];
  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: [
              { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
              { text: promptText }
            ]
          }
        ],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const rawMsg = errorData.error?.message || `HTTP ${res.status}: ${res.statusText}`;
        console.warn(`[Gemini PDF API Warning] Model ${model} returned error: ${rawMsg}`);
        lastError = rawMsg;
        continue;
      }

      const resData = await res.json();
      const candidateText = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (candidateText) {
        console.log(`[Gemini PDF Success] Generated response using model: ${model}`);
        return candidateText;
      }
    } catch (err) {
      lastError = err.message;
    }
  }

  throw new Error(lastError || 'Google Gemini API calls failed.');
};

/**
 * @route   POST /api/ai/generate-from-pdf
 * @desc    Extract text using standard pdf-parse and process via multi-provider AI or fallback
 * @access  Protected (Approved HOD)
 */
router.post(
  '/generate-from-pdf',
  requireApprovedHod,
  [
    body('pdfUrl').trim().notEmpty().withMessage('PDF URL is required.').isURL().withMessage('Valid PDF URL is required.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    try {
      const { pdfUrl } = req.body;

      console.log(`[AI PDF] Fetching document from: ${pdfUrl}`);
      const pdfResponse = await fetch(pdfUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GSC-Portal/1.0' }
      });

      if (!pdfResponse.ok) {
        return res.status(400).json({ success: false, error: `Failed to download PDF document.` });
      }

      const pdfArrayBuffer = await pdfResponse.arrayBuffer();
      const pdfBuffer = Buffer.from(pdfArrayBuffer);
      const pdfBase64 = pdfBuffer.toString('base64');

      // Extract clean text using standard pdf-parse library
      let extractedText = '';
      try {
        const parsed = await pdfParse(pdfBuffer);
        extractedText = parsed.text || '';
      } catch (parseErr) {
        console.warn('[pdf-parse library warning]:', parseErr.message);
      }

      console.log(`[AI PDF] Extracted text length: ${extractedText.length} characters.`);

      const systemPrompt = `
You are an expert college administration assistant for Ghanshyamdas Saraf College.
Analyze the document text and extract structured announcement information in JSON format:
{
  "title": "A clear title for the announcement (max 100 characters)",
  "content": "<p>HTML formatted summary of notice, instructions, or notes.</p>",
  "type": "NOTICE" or "EVENT" or "TIMETABLE",
  "timetableEntries": [
    {
      "subject": "Paper / Subject Name",
      "date": "YYYY-MM-DD",
      "time": "10:00 AM - 01:00 PM",
      "room": "Room No. / Hall"
    }
  ]
}
1. "type" MUST be "NOTICE", "EVENT", or "TIMETABLE".
2. If document is an exam schedule/timetable, set "type" to "TIMETABLE" and populate timetableEntries.
3. Output valid JSON ONLY.
`;

      let rawAiResponse = null;
      let usedProvider = '';

      // 1. Try Google Gemini API first if key present (supports binary PDF natively)
      if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith('AQ.')) {
        try {
          console.log('[AI PDF] Trying Google Gemini API...');
          rawAiResponse = await analyzePdfWithGemini(process.env.GEMINI_API_KEY.trim(), pdfBase64, systemPrompt);
          usedProvider = 'Google Gemini AI';
        } catch (e) {
          console.warn('[Gemini API Error]:', e.message);
        }
      }

      // 2. Try Groq API if key present
      if (!rawAiResponse && process.env.GROQ_API_KEY && extractedText) {
        try {
          console.log('[AI PDF] Trying Groq API...');
          rawAiResponse = await analyzeWithGroq(process.env.GROQ_API_KEY.trim(), extractedText, systemPrompt);
          usedProvider = 'Groq AI';
        } catch (e) {
          console.warn('[Groq API Error]:', e.message);
        }
      }

      // 3. Try OpenRouter API if key present
      if (!rawAiResponse && process.env.OPENROUTER_API_KEY && extractedText) {
        try {
          console.log('[AI PDF] Trying OpenRouter API...');
          rawAiResponse = await analyzeWithOpenRouter(process.env.OPENROUTER_API_KEY.trim(), extractedText, systemPrompt);
          usedProvider = 'OpenRouter AI';
        } catch (e) {
          console.warn('[OpenRouter API Error]:', e.message);
        }
      }

      // 4. Try OpenAI API if key present
      if (!rawAiResponse && process.env.OPENAI_API_KEY && extractedText) {
        try {
          console.log('[AI PDF] Trying OpenAI API...');
          rawAiResponse = await analyzeWithOpenAI(process.env.OPENAI_API_KEY.trim(), extractedText, systemPrompt);
          usedProvider = 'OpenAI';
        } catch (e) {
          console.warn('[OpenAI Error]:', e.message);
        }
      }

      let resultData;

      if (rawAiResponse) {
        let cleanJsonStr = rawAiResponse.trim();
        if (cleanJsonStr.startsWith('```json')) {
          cleanJsonStr = cleanJsonStr.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
        } else if (cleanJsonStr.startsWith('```')) {
          cleanJsonStr = cleanJsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        const parsedData = JSON.parse(cleanJsonStr);
        resultData = {
          title: parsedData.title || 'Steps to Link your ABC Account in Samarth Student Portal',
          content: parsedData.content || '',
          type: ['NOTICE', 'EVENT', 'TIMETABLE'].includes(parsedData.type) ? parsedData.type : 'NOTICE',
          timetableEntries: Array.isArray(parsedData.timetableEntries)
            ? parsedData.timetableEntries.map((e) => ({
                subject: String(e.subject || '').trim(),
                date: e.date && !isNaN(Date.parse(e.date)) ? new Date(e.date).toISOString().split('T')[0] : '',
                time: String(e.time || '').trim(),
                room: String(e.room || '').trim()
              }))
            : []
        };
      } else {
        console.log('[AI PDF] Falling back to Smart pdf-parse Parser...');
        resultData = smartRuleBasedParse(extractedText);
        usedProvider = 'Smart Parser';
      }

      res.json({
        success: true,
        message: `Successfully processed PDF via ${usedProvider}.`,
        data: resultData
      });

    } catch (err) {
      console.error('[POST /api/ai/generate-from-pdf Error]:', err.message);
      res.status(500).json({
        success: false,
        error: err.message || 'Server error while generating content from PDF.'
      });
    }
  }
);

module.exports = router;
