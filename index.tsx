import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

import './index.css';

// Fix: Per @google/genai guidelines, the API key must be read from process.env.API_KEY.
// This also resolves the TypeScript error regarding 'import.meta.env'.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function App() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setResponse('');
    setError('');

    try {
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      setResponse(result.text ?? '');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <header>
        <h1>Gemini Q&A</h1>
        <p>Ask any question and get an answer from the Gemini API.</p>
      </header>

      <form onSubmit={handleSubmit}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., Why is the sky blue?"
          aria-label="Question input"
          rows={3}
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? (
            <div className="spinner" aria-label="Loading"></div>
          ) : (
            'Ask Gemini'
          )}
        </button>
      </form>

      {error && <div className="response-box error-box" role="alert">{error}</div>}
      
      {response && !error && (
         <div className="response-box" aria-live="polite">
            <h2>Answer:</h2>
            <p>{response}</p>
        </div>
      )}
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);