// This is a Vercel serverless function that acts as a backend for a WeChat Official Account.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import { parseStringPromise, Builder } from 'xml2js';

// --- CONFIGURATION ---
// These values MUST be set as Environment Variables in your deployment platform (e.g., Vercel).
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const WECHAT_TOKEN = process.env.WECHAT_TOKEN; // This is a custom token you define.

if (!GEMINI_API_KEY || !WECHAT_TOKEN) {
  throw new Error("Missing required environment variables: GEMINI_API_KEY and WECHAT_TOKEN");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// --- MAIN HANDLER ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    await handleVerification(req, res);
  } else if (req.method === 'POST') {
    await handleMessage(req, res);
  } else {
    res.status(405).send('Method Not Allowed');
  }
}

// --- WECHAT SERVER VERIFICATION (GET) ---
async function handleVerification(req: VercelRequest, res: VercelResponse) {
  const { signature, timestamp, nonce, echostr } = req.query;

  if (!signature || !timestamp || !nonce || !echostr) {
    return res.status(400).send('Missing verification parameters.');
  }

  const token = WECHAT_TOKEN!;
  const list = [token, timestamp, nonce].sort();
  const sha1 = crypto.createHash('sha1').update(list.join('')).digest('hex');

  if (sha1 === signature) {
    res.status(200).send(echostr);
  } else {
    res.status(403).send('Verification failed.');
  }
}

// --- WECHAT MESSAGE HANDLING (POST) ---
async function handleMessage(req: VercelRequest, res: VercelResponse) {
  try {
    const xmlData = await getRawBody(req);
    const parsedXml = await parseStringPromise(xmlData);
    
    const message = parsedXml.xml;
    const msgType = message.MsgType[0];

    // We only handle text messages for now
    if (msgType !== 'text') {
      await sendReply(res, message, 'Sorry, I can only understand text messages for now.');
      return;
    }

    const userPrompt = message.Content[0];
    const fromUser = message.FromUserName[0];
    const toUser = message.ToUserName[0];

    console.log(`Received prompt from ${fromUser}: ${userPrompt}`);

    // Call Gemini API
    const geminiResponse = await getGeminiResponse(userPrompt);

    // Send the response back to the user
    await sendReply(res, { FromUserName: [toUser], ToUserName: [fromUser] }, geminiResponse);

  } catch (error) {
    console.error('Error handling message:', error);
    // In case of an error, we should still try to send a response to WeChat to avoid timeouts.
    // The `res.send('')` sends an empty success response.
    res.status(200).send(''); 
  }
}

// --- HELPER FUNCTIONS ---

// Function to get the raw body from the request, as Vercel parses JSON by default
function getRawBody(req: VercelRequest): Promise<string> {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });
        req.on('end', () => {
            resolve(body);
        });
        req.on('error', (err) => {
            reject(err);
        });
    });
}

// Calls the Gemini API and returns the text response
async function getGeminiResponse(prompt: string): Promise<string> {
  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return result.text ?? "I'm not sure how to respond to that.";
  } catch (err) {
    console.error("Gemini API Error:", err);
    return "Sorry, I'm having trouble thinking right now. Please try again later.";
  }
}

// Constructs and sends an XML reply to WeChat
async function sendReply(res: VercelResponse, originalMessage: any, content: string) {
  const responsePayload = {
    xml: {
      ToUserName: originalMessage.ToUserName[0],
      FromUserName: originalMessage.FromUserName[0],
      CreateTime: Math.floor(Date.now() / 1000),
      MsgType: 'text',
      Content: content,
    },
  };

  const builder = new Builder({ cdata: true });
  const xmlResponse = builder.buildObject(responsePayload);
  
  res.setHeader('Content-Type', 'application/xml');
  res.status(200).send(xmlResponse);
}
