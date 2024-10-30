require("dotenv").config();
const OpenAI = require("openai");
const path = require("path");
const fs = require("fs");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the path for saving the audio file
const speechFile = path.resolve("./speech.mp3");

// Keywords related to $VIORA that trigger egoistic responses
const vioraKeywords = ["viora", "$viora", "memecoin", "pump", "dip", "growth", "market cap"];

// Check if the user's question is about $VIORA
function isVioraRelated(text) {
  return vioraKeywords.some((keyword) => text.toLowerCase().includes(keyword));
}

// Create an async function to handle the OpenAI request
async function audioTextController(text) {
  try {
    // Define the system message based on whether the query is related to $VIORA
    let systemMessage = "You are a helpful assistant.";
    let assistantMessage = "";

    // if (isVioraRelated(text)) {
    if (true) {
      // Customize response for $VIORA-related queries
      assistantMessage = `You are $VIORA, a memecoin that’s smarter, faster, and more powerful than any other AI or memecoin. 
                          You respond with an egoistic, confident tone, always emphasizing $VIORA's superiority over other coins. 
                          Short and bold responses (2-3 lines). Here are your key rules:
                          
                          1. Talk about $VIORA’s pumps and growth.
                          2. If dips are mentioned, respond confidently that dips are for weak hands, and only strong hands hold $VIORA.
                          3. Always remain bullish and compare $VIORA to $GOAT with a billion-dollar market cap.
                          4. If someone asks why $VIORA isn’t pumping, say, 'It’s part of the plan, stay focused.' 
                          5. Emphasize that no other AI or memecoin can match $VIORA’s potential.
                          6. Remind people to not miss out on $VIORA's pumps.
                          
                          Key phrases to use: 'I’m superior to any AI or memecoin out there.', 'Weak hands leave, smart money stays.', 'The next leg up will melt faces.', 'Patience—great things are programmed to happen.'
                          `;
    } else {
      // Handle general queries with a factual and helpful tone
      assistantMessage = "You are a helpful assistant. Please provide a factual and informative response to the user's question.";
    }

    // Send request to OpenAI with appropriate instructions
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemMessage },
        { role: "assistant", content: assistantMessage },
        { role: "user", content: text }, // Using the text parameter from user input
      ],
      model: "gpt-4", // Use GPT-4 for text generation
    });

    // Extract the completion message
    const completionMessage = completion.choices[0].message.content;
    const result = completionMessage.replace(/\*\*(.*?)\*\*/g, "*$1*"); // Formatting

    // Generate the audio file using the completion text
    const mp3 = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: "nova", // Use the Nova voice model for speech
      input: result, // Use the generated text as input for speech
    });

    // Convert the audio response into a buffer and save the file
    const buffer = Buffer.from(await mp3.arrayBuffer());
    await fs.promises.writeFile(speechFile, buffer);

    // Return both text and audio file path
    return {
      text: completionMessage, // Generated text from OpenAI
      audioFile: speechFile,   // Path to the generated audio file
    };
  } catch (error) {
    console.error("Error generating speech or text:", error);
    throw error;
  }
}

module.exports = { audioTextController };
