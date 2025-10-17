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
            
            // Random demo responses for testing
            const demoResponses = [
                {
                    disease: "No disease detected",
                    confidence: 95,
                    symptoms: ["Normal posture", "Clear eyes", "Healthy coat condition"],
                    severity: "none",
                    treatment: "No treatment needed - animal appears healthy",
                    description: "The cattle appears to be in good health with no visible signs of disease or distress.",
                    recommendations: [
                        "Continue regular health monitoring",
                        "Maintain proper nutrition and care",
                        "Schedule routine veterinary checkups"
                    ]
                },
                {
                    disease: "Bovine Respiratory Disease",
                    confidence: 78,
                    symptoms: ["Nasal discharge", "Labored breathing", "Lethargic appearance"],
                    severity: "medium",
                    treatment: "Isolate animal and contact veterinarian immediately for antibiotic treatment",
                    description: "Signs of respiratory infection observed, likely bacterial pneumonia requiring prompt treatment.",
                    recommendations: [
                        "Isolate the affected animal from the herd",
                        "Contact a veterinarian for proper diagnosis and treatment",
                        "Improve ventilation in housing areas",
                        "Monitor other cattle for similar symptoms",
                        "Consider vaccination program for respiratory diseases"
                    ]
                },
                {
                    disease: "Mastitis",
                    confidence: 82,
                    symptoms: ["Swollen udder", "Redness around teats", "Abnormal milk consistency"],
                    severity: "high",
                    treatment: "Immediate veterinary attention required for antibiotic treatment and pain management",
                    description: "Inflammation of the mammary gland detected, likely bacterial mastitis requiring urgent treatment.",
                    recommendations: [
                        "Contact veterinarian immediately",
                        "Apply cold compresses to reduce swelling",
                        "Ensure clean milking practices",
                        "Consider milking frequency adjustments",
                        "Monitor for fever and systemic symptoms"
                    ]
                }
            ];
            
            // Return a random demo response
            return demoResponses[Math.floor(Math.random() * demoResponses.length)];
        }

        const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

        const requestBody = {
            contents: [{
                parts: [{
                    text: `You are an expert veterinary AI assistant specializing in cattle health. Analyze this cattle image carefully for potential diseases and health conditions.

CRITICAL ANALYSIS GUIDELINES:
1. Examine the entire image systematically - look at the animal's posture, skin condition, eyes, nose, mouth, limbs, and overall appearance
2. Look for visible symptoms like lesions, swelling, discharge, abnormal behavior, or physical deformities
3. Consider the animal's body condition, coat quality, and alertness
4. Be conservative in diagnosis - only identify diseases if there are clear, visible symptoms

COMMON CATTLE DISEASES TO LOOK FOR:
- Foot and Mouth Disease: Blisters on mouth, feet, teats; excessive salivation; lameness
- Bovine Respiratory Disease: Nasal discharge, coughing, labored breathing, lethargy
- Mastitis: Swollen, red, or painful udder; abnormal milk; fever
- Bovine Viral Diarrhea: Diarrhea, fever, nasal discharge, mouth ulcers
- Blackleg: Swelling in muscles, lameness, fever, depression
- Anthrax: Sudden death, bloody discharge from body openings
- Brucellosis: Abortion, retained placenta, infertility
- Tuberculosis: Chronic cough, weight loss, enlarged lymph nodes
- Lumpy Skin Disease: Nodules on skin, fever, reduced milk production
- Ringworm: Circular, scaly patches on skin
- Pink Eye: Red, swollen, watery eyes; corneal ulcers
- Hoof problems: Lameness, overgrown hooves, foot rot

RESPONSE REQUIREMENTS:
- If no clear disease symptoms are visible, respond with "No disease detected"
- Only diagnose if you can clearly identify specific symptoms
- Provide realistic confidence scores based on symptom visibility
- Include practical, actionable recommendations
- Be specific about symptoms you observe

Return ONLY a valid JSON object with your analysis.`
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
                        disease: { 
                            type: "string", 
                            description: "Detected disease name, 'No disease detected', or 'Healthy animal' if no issues found",
                            examples: ["Foot and Mouth Disease", "Bovine Respiratory Disease", "Mastitis", "No disease detected", "Healthy animal"]
                        },
                        confidence: { 
                            type: "integer", 
                            description: "Confidence score (0-100) based on symptom visibility and clarity",
                            minimum: 0,
                            maximum: 100
                        },
                        symptoms: { 
                            type: "array", 
                            items: { type: "string" },
                            description: "Specific visible symptoms observed in the image"
                        },
                        severity: { 
                            type: "string", 
                            enum: ["low", "medium", "high", "unknown", "none"],
                            description: "Severity level based on visible symptoms"
                        },
                        treatment: { 
                            type: "string", 
                            description: "Immediate recommended action or treatment. Use 'No treatment needed' for healthy animals"
                        },
                        description: { 
                            type: "string", 
                            description: "Brief description of what was observed in the image"
                        },
                        recommendations: { 
                            type: "array", 
                            items: { type: "string" },
                            description: "Specific actionable recommendations for the farmer"
                        }
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