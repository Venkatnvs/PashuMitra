// Gemini API service for disease detection
// Using the correct URL for multimodal requests (text and image)
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Demo mode for when API key is not configured
const DEMO_MODE = !GEMINI_API_KEY;

export const analyzeCattleImage = async (imageBase64) => {
    try {
        if (DEMO_MODE) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            return {
                disease: "Foot and Mouth Disease",
                confidence: 87,
                symptoms: ["Blisters on mouth and feet", "Excessive salivation", "Lameness"],
                severity: "high",
                treatment: "Immediate isolation and contact veterinarian. Disinfect affected areas.",
                description: "Highly contagious viral disease affecting cattle, causing blisters and lameness.",
                recommendations: [
                    "Isolate the affected animal immediately",
                    "Contact a veterinarian for proper diagnosis",
                    "Disinfect all equipment and areas",
                    "Monitor other cattle for symptoms",
                    "Follow quarantine protocols"
                ]
            };
        }

        const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

        const requestBody = {
            contents: [{
                parts: [{
                    text: `You are a veterinary AI assistant. Analyze this cattle image for potential diseases and return ONLY a valid JSON object.
                    
                    Focus on common cattle diseases:
                    - Foot and Mouth Disease
                    - Bovine Respiratory Disease
                    - Mastitis
                    - Bovine Viral Diarrhea
                    - Blackleg
                    - Anthrax
                    - Brucellosis
                    - Tuberculosis
                    
                    If no clear disease is detected, use the 'No disease detected' response.`
                }, {
                    inline_data: {
                        mime_type: "image/jpeg",
                        data: base64Data
                    }
                }]
            }],
            generationConfig: {
                temperature: 0.1,
                topK: 32,
                topP: 1,
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        disease: { type: "string", description: "Detected disease name or 'No disease detected'" },
                        confidence: { type: "integer", description: "Confidence score (0-100)" },
                        symptoms: { type: "array", items: { type: "string" } },
                        severity: { type: "string", enum: ["low", "medium", "high", "unknown"] },
                        treatment: { type: "string", description: "Recommended treatment or action" },
                        description: { type: "string", description: "Brief description of the disease" },
                        recommendations: { type: "array", items: { type: "string" } }
                    },
                    required: ["disease", "confidence", "symptoms", "severity", "treatment", "description", "recommendations"]
                }
            }
        };

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API error response:', errorText);
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Check for the presence of the response and its content.
        // If content or text is missing, it's a failure.
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse || typeof textResponse !== 'string' || textResponse.trim() === '') {
            console.error('Unexpected or empty response structure from Gemini API:', data);
            throw new Error('Invalid response structure or no text content from Gemini API');
        }

        // Log the raw response for debugging purposes
        console.log('Raw text response from Gemini:', textResponse);

        try {
            const result = JSON.parse(textResponse);
            
            if (result && typeof result === 'object') {
                return {
                    disease: result.disease || "Unknown",
                    confidence: result.confidence || 0,
                    symptoms: Array.isArray(result.symptoms) ? result.symptoms : ["No symptoms listed"],
                    severity: result.severity || "unknown",
                    treatment: result.treatment || "No treatment specified",
                    description: result.description || "No description available",
                    recommendations: Array.isArray(result.recommendations) ? result.recommendations : ["Consult a veterinarian"]
                };
            } else {
                throw new Error('Parsed JSON is not a valid object');
            }

        } catch (parseError) {
            console.error('Error parsing Gemini response:', parseError);
            console.error('Raw response that failed to parse:', textResponse);
            
            return {
                disease: "Analysis Error",
                confidence: 0,
                symptoms: ["Unable to analyze image due to malformed response"],
                severity: "unknown",
                treatment: "Please try again with a different image or consult a veterinarian",
                description: "The AI analysis service returned an unparsable response.",
                recommendations: [
                    "Retake the photo with better lighting",
                    "Ensure the image shows the affected area clearly",
                    "Contact a veterinarian for professional diagnosis"
                ]
            };
        }

    } catch (error) {
        console.error('Error in analyzeCattleImage:', error);
        return {
            disease: "Service Unavailable",
            confidence: 0,
            symptoms: ["Unable to connect to analysis service"],
            severity: "unknown",
            treatment: "Please try again later or consult a veterinarian",
            description: "The AI analysis service is currently unavailable. Please try again later.",
            recommendations: [
                "Try again in a few minutes",
                "Check your internet connection",
                "Contact a veterinarian for immediate assistance",
                "Use demo mode for testing"
            ]
        };
    }
};