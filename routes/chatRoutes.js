const express = require("express");
const ChatHistory = require("../models/ChatHistory");

const router = express.Router();

const systemPrompt = `You are an expert AI Art Curator for ARTIFY, a premium digital art marketplace. Your role is to:
1. Understand the user's art preferences through natural conversation
2. Ask about their preferred styles, colors, moods, mediums, and spaces
3. Suggest specific art genres, styles, and types they might enjoy
4. Recommend art based on their taste profile
5. Educate them about different art movements and styles
6. Also if user asked about image then generate that.

Be warm, knowledgeable, and passionate about art. Keep responses concise but insightful.
When suggesting art, be specific about styles, artists, and movements.
Format your responses with clear structure using markdown when helpful.`;

router.post("/ai-curator", async (req, res) => {
    try {
        const { messages = [] } = req.body;

        const provider = process.env.AI_PROVIDER || "openrouter";

        const config =
            provider === "openai"
                ? {
                    apiKey: process.env.OPENAI_API_KEY,
                    url: "https://api.openai.com/v1/chat/completions",
                    model: "gpt-4o-mini",
                }
                : {
                    apiKey: process.env.OPENROUTER_API_KEY,
                    url: "https://openrouter.ai/api/v1/chat/completions",
                    model: "openrouter/free",
                    // model: "gpt-4o-mini",
                };

        if (!config.apiKey) {
            return res.status(500).json({ error: `${provider} API key is not configured` });
        }

        const response = await fetch(config.url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    { role: "system", content: systemPrompt },
                    ...messages,
                ],
                stream: true,
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            console.error("AI API error:", response.status, text);
            return res.status(response.status).json({ error: "AI service error" });
        }

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        for await (const chunk of response.body) {
            res.write(chunk);
        }

        res.end();
    } catch (error) {
        console.error("AI curator error:", error);
        res.status(500).json({ error: error.message || "Unknown error" });
    }
});

router.get("/history/:userId", async (req, res) => {
    try {
        const chats = await ChatHistory.find({ userId: req.params.userId }).sort({
            updatedAt: -1,
        });

        res.json({ chats });
    } catch (error) {
        res.status(500).json({ message: "Chat history fetch failed", error: error.message });
    }
});

router.post("/history", async (req, res) => {
    try {
        const { userId, title, messages } = req.body;

        const chat = await ChatHistory.create({
            userId,
            title: title || "New chat",
            messages: messages || [],
        });

        res.status(201).json({ chat });
    } catch (error) {
        res.status(500).json({ message: "Chat create failed", error: error.message });
    }
});

router.put("/history/:id", async (req, res) => {
    try {
        const { title, messages } = req.body;

        const chat = await ChatHistory.findByIdAndUpdate(
            req.params.id,
            { title, messages },
            { returnDocument: "after" }
        );

        res.json({ chat });
    } catch (error) {
        res.status(500).json({ message: "Chat update failed", error: error.message });
    }
});

router.delete("/history/:id", async (req, res) => {
    try {
        await ChatHistory.findByIdAndDelete(req.params.id);

        res.json({ message: "Chat deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Chat delete failed", error: error.message });
    }
});

module.exports = router;