// File: /netlify/functions/chat.js

exports.handler = async function(event, context) {
  try {
    // Make sure your request is POST
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method Not Allowed" }),
      };
    }

    // Parse the incoming request body
    const { prompt } = JSON.parse(event.body);

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing 'prompt' in request body" }),
      };
    }

    // Call Hugging Face Inference API
    const response = await fetch(
      "https://api-inference.huggingface.co/models/facebook/distilbart-cnn-6-6",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.HF_API_KEY}`,
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { max_new_tokens: 150 },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: errText }),
      };
    }

    const data = await response.json();

    // The Hugging Face text generation output is usually in data[0].summary_text or data[0].generated_text
    const resultText = data[0]?.summary_text || data[0]?.generated_text || "No output";

    return {
      statusCode: 200,
      body: JSON.stringify({ result: resultText }),
    };

  } catch (error) {
    console.error("Netlify Function Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
