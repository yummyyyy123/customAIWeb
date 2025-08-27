const fetch = require("node-fetch");

exports.handler = async function(event, context) {
  try {
    // Log incoming request for debugging
    console.log("Request body:", event.body);

    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ response: "Error: No request body provided" })
      };
    }

    let requestData;
    try {
      requestData = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ response: "Error: Invalid JSON in request body" })
      };
    }

    const { prompt } = requestData;
    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          response: "Error: No prompt provided in request body",
          expectedFormat: { prompt: "Your text here" }
        })
      };
    }

    if (!process.env.HF_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ response: "Server error: HF_API_KEY not configured" })
      };
    }

    const HF_API_URL = "https://api-inference.huggingface.co/models/google/flan-t5-small";

    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.HF_API_KEY}`
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 100 } // short responses
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        statusCode: response.status,
        body: JSON.stringify({
          response: `Hugging Face API error: ${response.status} ${response.statusText}`,
          details: errorData
        })
      };
    }

    const data = await response.json();
    console.log("HF API raw response:", data);

    let reply = "I couldn't generate a response. Please try rephrasing your question.";

    // Handle different response formats
    if (Array.isArray(data) && data[0]?.generated_text) {
      reply = data[0].generated_text;
    } else if (data?.generated_text) {
      reply = data.generated_text;
    } else if (typeof data === "string") {
      reply = data;
    }

    // Remove prompt repetition if exists
    if (reply.startsWith(prompt)) {
      reply = reply.substring(prompt.length).trim();
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response: reply })
    };

  } catch (err) {
    console.error("Server error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response: "Server error occurred. Please try again.", error: err.message })
    };
  }
};
