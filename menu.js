require("dotenv").config();
const fs = require("fs");
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

const { textController } = require("./controller/textController");
const { voiceController } = require("./controller/voiceController");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const botUsername = process.env.BOT_USERNAME;

// Function to check if the bot is tagged and extract the message
function isBotMentioned(msg) {
  if (!msg.entities) return null;

  const mention = msg.entities.find(
    (entity) =>
      entity.type === "mention" &&
      msg.text.substring(entity.offset, entity.offset + entity.length) ===
        `@${botUsername}`
  );

  return mention;
}

// Main function to handle messages
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username || msg.from.first_name;

  // Check for bot mention and get position
  const mention = isBotMentioned(msg);
  if (!msg.text || !mention) return;

  // Extract the text after the mention, allowing for the mention to be anywhere
  const inputText = msg.text.replace(`@${botUsername}`, "").trim();

  if (!inputText) {
    bot.sendMessage(chatId, "Please provide some text for generation.", {
      reply_to_message_id: msg.message_id,
    });
    return;
  }

  try {
    // Generate text response
    const { text: generatedText, isBhaaCounter } = await textController(
      inputText
    );
    const personalizedText = `\n${generatedText}`;

    const messageOptions = { parse_mode: "Markdown" };
    if (!isBhaaCounter) {
      messageOptions.reply_to_message_id = msg.message_id;
    }
    // await bot.sendMessage(chatId, personalizedText, messageOptions);

    // Generate voice response
    const audioUrl = await voiceController(
      "weight_vrx7j407cxk45jenkrd769h9b",
      personalizedText
    );

    // Download the audio file from the URL
    const response = await axios({
      url: audioUrl,
      method: "GET",
      responseType: "stream",
    });

    // Send the audio as a voice message
    await bot.sendVoice(chatId, response.data, {
      reply_to_message_id: msg.message_id,
      caption: personalizedText,
    });

    console.log(`Audio sent from URL: ${audioUrl}`);
  } catch (error) {
    bot.sendMessage(
      chatId,
      "Sorry, there was an error generating the response.",
      {
        reply_to_message_id: msg.message_id,
      }
    );
    console.error("Error:", error);
  }
});
