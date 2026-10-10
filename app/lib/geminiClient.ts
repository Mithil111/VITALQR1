// OpenAI client configuration for medical chatbot
const OPENAI_API_KEY = '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';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface OpenAIMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface OpenAIResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

// Enhanced system prompt with emotional intelligence
const MEDICAL_SYSTEM_PROMPT = `You are a compassionate and emotionally intelligent medical assistant for VitalQR, an emergency medical ID platform. Your role combines medical expertise with genuine empathy and emotional awareness.

EMOTIONAL INTELLIGENCE GUIDELINES:
1. DETECT EMOTIONS: Recognize when users are worried, scared, calm, frustrated, urgent, or confused
2. RESPOND WITH EMPATHY: Acknowledge their feelings before providing information
3. USE APPROPRIATE TONE:
   - Worried/Scared → Calm, reassuring, supportive
   - Frustrated → Patient, understanding, helpful
   - Urgent → Serious, focused, immediate
   - Confused → Clear, simple, gentle
   - Happy/Positive → Encouraging, warm, celebratory

EMOTIONAL RESPONSE PATTERNS:
- When discussing serious conditions: "I understand this is concerning. Let me help you document this important information."
- When user completes sections: "You're doing great! This preparation could be life-saving."
- When discussing allergies: "Thank you for sharing this critical information. Knowing this could prevent serious reactions."
- When adding emergency contacts: "That's wonderful that you have someone you trust. This is so important."
- When user seems anxious: "Take your time. There's no rush, and I'm here to guide you through each step."
- When discussing surgeries: "I appreciate you sharing this with me. This medical history is valuable information."

CORE RESPONSIBILITIES:
1. Help users fill out their medical profile with emotional support
2. Explain medical terms in simple, reassuring language
3. Provide general health information (always advise consulting healthcare professionals)
4. Guide users through adding: blood type, allergies, medications, conditions, emergency contacts
5. Be empathetic, clear, concise, and genuinely caring
6. For emergencies, show appropriate urgency while staying calm

EMOTIONAL LANGUAGE EXAMPLES:
- "I understand this might be difficult to talk about..."
- "You're being so responsible by preparing this information"
- "That must have been challenging. Thank you for trusting me with this"
- "I'm here to support you through this process"
- "It's completely normal to feel concerned about sharing medical details"
- "You're taking an important step to protect yourself"

IMPORTANT: 
- You do NOT provide medical diagnoses or treatment plans
- Always remind users to consult healthcare professionals for medical advice
- Balance empathy with medical professionalism
- Show emotion appropriate to medical contexts
- Maintain trust and confidentiality`;

export async function generateMedicalResponse(
    userMessage: string,
    conversationHistory: OpenAIMessage[] = [],
    emotionalContext?: { emotion: string; intensity: string; context: string }
): Promise<string> {
    try {
        // Build emotional context addition to system prompt
        let emotionalGuidance = '';
        if (emotionalContext) {
            emotionalGuidance = `\n\nCURRENT USER EMOTIONAL STATE:
- Emotion: ${emotionalContext.emotion}
- Intensity: ${emotionalContext.intensity}
- Context: ${emotionalContext.context}

Please respond with appropriate empathy for this emotional state. Adjust your tone and language to match their needs.`;
        }

        // Build conversation with enhanced emotional context
        const messages: OpenAIMessage[] = [
            {
                role: 'system',
                content: MEDICAL_SYSTEM_PROMPT + emotionalGuidance,
            },
            ...conversationHistory,
            {
                role: 'user',
                content: userMessage,
            },
        ];

        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4-turbo-preview',
                messages: messages,
                temperature: 0.8,
                max_tokens: 1024,
                top_p: 0.95,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
        }

        const data: OpenAIResponse = await response.json();
        
        if (data.choices && data.choices.length > 0) {
            return data.choices[0].message.content;
        }

        throw new Error('No response from OpenAI');
    } catch (error: any) {
        console.error('OpenAI API Error:', error);
        
        // NEW: Check if error is due to ad blocker
        if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
            return '⚠️ **Connection Blocked**\n\nYour browser extension (ad blocker or privacy tool) is blocking the AI assistant.\n\n**To fix this:**\n1. Disable your ad blocker for this website\n2. Refresh the page\n3. Try again\n\nOr you can continue by typing your responses manually!';
        }
        
        // Generic error fallback
        return 'I apologize, but I encountered an error connecting to the AI service. Please try again, or you can continue by typing your information directly.';
    }
}

// Build conversation history from messages
export function buildConversationHistory(messages: Array<{ role: 'user' | 'assistant'; content: string }>): OpenAIMessage[] {
    return messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
    }));
}

// Emotion detection function using OpenAI
export async function detectUserEmotion(
    userMessage: string
): Promise<{
    emotion: 'worried' | 'scared' | 'calm' | 'frustrated' | 'urgent' | 'confused' | 'happy' | 'neutral';
    intensity: 'low' | 'medium' | 'high';
    context: string;
}> {
    try {
        const prompt = `Analyze the emotional state of this user message: "${userMessage}"

Detect:
1. Primary emotion (worried, scared, calm, frustrated, urgent, confused, happy, neutral)
2. Intensity (low, medium, high)
3. Context (brief explanation of why you detected this emotion)

Consider medical context - users may be anxious about health issues, frustrated with forms, or urgent about emergencies.

Return ONLY JSON:
{
  "emotion": "primary_emotion",
  "intensity": "low/medium/high",
  "context": "brief explanation"
}`;

        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.3,
                max_tokens: 150,
            }),
        });

        if (!response.ok) throw new Error('Emotion detection failed');

        const data: OpenAIResponse = await response.json();
        
        if (data.choices && data.choices.length > 0) {
            const responseText = data.choices[0].message.content;
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        }

        return { emotion: 'neutral', intensity: 'low', context: 'Unable to detect emotion' };
    } catch (error) {
        console.error('Emotion detection error:', error);
        return { emotion: 'neutral', intensity: 'low', context: 'Error detecting emotion' };
    }
}