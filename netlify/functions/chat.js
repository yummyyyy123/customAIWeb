const fetch = require("node-fetch");

exports.handler = async function(event, context) {
  try {
    console.log("Request body:", event.body); // Add logging to debug
    
    // Check if body exists
    if (!event.body) {
      console.log("No body provided in request");
      return {
        statusCode: 400,
        body: JSON.stringify({ response: "Error: No request body provided" })
      };
    }

    // Parse the request JSON with better error handling
    let requestData;
    try {
      requestData = JSON.parse(event.body);
    } catch (e) {
      console.log("Error parsing JSON:", e.message);
      return {
        statusCode: 400,
        body: JSON.stringify({ response: "Error: Invalid JSON in request body" })
      };
    }

    // Check for inputs
    const { inputs } = requestData;
    if (!inputs) {
      console.log("No inputs found in parsed data:", requestData);
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          response: "Error: No inputs provided in request body",
          expectedFormat: { "inputs": "Your text prompt here" }
        })
      };
    }

    // Check for API key
    if (!process.env.HF_API_KEY) {
      console.log("Missing HF_API_KEY in environment");
      return {
        statusCode: 500,
        body: JSON.stringify({ response: "Server configuration error: API key not configured" })
      };
    }

    //const HF_API_URL = "https://api-inference.huggingface.co/models/tiiuae/falcon-3b-base";
    const HF_API_URL = "https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct";


    // Make the request to Hugging Face
    console.log("Making request to Hugging Face API");
    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.HF_API_KEY}`
      },
      body: JSON.stringify({ inputs })
    });

    // Process the response
    if (!response.ok) {
      console.log("Hugging Face API error:", response.status, response.statusText);
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
    console.log("API response:", data);
    
    // Handle different response formats
    let reply;
    if (Array.isArray(data)) {
      reply = data[0]?.generated_text || "No text generated";
    } else if (typeof data === 'object') {
      reply = data.generated_text || "No text generated";
    } else {
      reply = "Unexpected response format";
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ response: reply })
    };

  } catch (err) {
    console.error("Error in function:", err);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        response: "Server error",
        error: err.message
      })
    };
  }

}
