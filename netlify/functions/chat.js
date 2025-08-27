const fetch = require("node-fetch");

exports.handler = async function(event, context) {
  try {
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ response: "No request body provided" }) };
    }

    let requestData;
    try {
      requestData = JSON.parse(event.body);
    } catch (e) {
      return { statusCode: 400, body: JSON.stringify({ response: "Invalid JSON" }) };
    }

    const { prompt } = requestData;
    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ response: "No prompt provided" }) };
    }

    if (!process.env.HF_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ response: "HF_API_KEY not set" }) };
    }

    const HF_API_URL = "https://api-inference.huggingface.co/models/facebook/distilbart-cnn-6-6";

    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.HF_API_KEY}`
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 150 }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        statusCode: response.status,
        body: JSON.stringify({ response: `HF API error: ${response.status} ${response.statusText}`, details: errorData })
      };
    }

    const data = await response.json();
    console.log("HF API response:", data);

    // Handle response
    let reply = "I couldn't generate a response. Try rephrasing your question.";
    if (Array.isArray(data) && data[0]?.summary_text) {
      reply = data[0].summary_text;
    } else if (data?.summary_text) {
      reply = data.summary_text;
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response: reply })
    };

  } catch (err) {
    console.error("Server error:", err);
    return { statusCode: 500, body: JSON.stringify({ response: "Server error occurred", error: err.message }) };
  }
};
