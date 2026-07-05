import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface RequestBody {
  symptoms: string;
  profile?: {
    name?: string;
    age?: number;
    gender?: string;
    blood_group?: string;
    medical_conditions?: string;
    phone?: string;
    address?: string;
  };
}

// Fallback algorithm when Gemini API Key is missing or request fails
function localAnalyze(symptoms: string, profile?: RequestBody["profile"]) {
  const normalized = symptoms.toLowerCase();
  
  let risk_level: "Low" | "Medium" | "High" = "Low";
  let assessment = "";
  let recommendations: string[] = [];
  let need_emergency = false;

  // High risk keywords
  const highRiskKeywords = [
    "chest pain", "heart", "stroke", "breathing", "breath", "arm hurts", 
    "left arm", "unconscious", "blackout", "passed out", "bleeding", 
    "choking", "paralysis", "seizure", "fit", "fall", "collapse", 
    "crushing", "slipped", "injury"
  ];

  // Medium risk keywords
  const mediumRiskKeywords = [
    "dizzy", "dizziness", "sweat", "sweating", "fever", "vomit", 
    "vomiting", "nausea", "stomach", "fracture", "burn", "allergic", 
    "rash", "pain", "headache", "migraine"
  ];

  const hasHighKeyword = highRiskKeywords.some(k => normalized.includes(k));
  const hasMediumKeyword = mediumRiskKeywords.some(k => normalized.includes(k));

  if (hasHighKeyword) {
    risk_level = "High";
    need_emergency = true;
    assessment = "The symptoms described (such as potential chest pain, breathing difficulties, falls, or severe injuries) indicate a potential emergency. Immediate medical attention is recommended.";
    recommendations = [
      "Remain as calm and still as possible.",
      "Sit or lie down in a safe position to prevent falling.",
      "Trigger the Emergency SOS now to alert your registered emergency contacts.",
      "If you are alone, try to unlock your front door so emergency responders can access your home.",
      "Call emergency services (911/112/local emergency) immediately."
    ];
  } else if (hasMediumKeyword) {
    risk_level = "Medium";
    assessment = "Your symptoms suggest a moderate level of risk. While not immediately life-threatening, it is important to monitor them closely and seek medical guidance.";
    recommendations = [
      "Rest in a comfortable and safe environment.",
      "Stay hydrated if you are not experiencing severe nausea.",
      "Contact your primary care physician or visit a nearby walk-in clinic.",
      "Have someone check on you. If symptoms worsen, escalate to emergency services."
    ];
  } else {
    risk_level = "Low";
    assessment = "Based on the description, this situation appears to be low risk. Rest, observe your symptoms, and seek advice if they persist.";
    recommendations = [
      "Rest and avoid strenuous activities.",
      "Keep a close log of your symptoms (write down when they started).",
      "Consult a pharmacist or call a non-emergency health line for advice.",
      "If you develop chest pain, shortness of breath, or dizziness, seek immediate help."
    ];
  }

  // Adjust for elderly patient safety (Escalate Medium to High if age > 65)
  if (profile) {
    if (profile.age && profile.age > 65 && risk_level === "Medium") {
      risk_level = "High";
      need_emergency = true;
      assessment = `Note: Escalated due to age factors. ${assessment} For older adults, moderate symptoms like dizziness or pain should be treated with higher caution. SOS alert is recommended.`;
      recommendations.unshift("Alert your trusted contacts immediately because of potential risk escalation.");
    }
    if (profile.medical_conditions) {
      assessment += ` Note: Pre-existing conditions (${profile.medical_conditions}) may interact with these symptoms. Inform any attending medical staff.`;
    }
  }

  return {
    risk_level,
    assessment,
    recommendations,
    need_emergency,
    is_mock: true
  };
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { symptoms, profile } = body;

    if (!symptoms || symptoms.trim() === "") {
      return NextResponse.json(
        { error: "Symptom description is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Return local rule-based analysis if API key is not present
      const localResult = localAnalyze(symptoms, profile);
      return NextResponse.json(localResult);
    }

    // Build the prompt for Gemini
    const profileContext = profile
      ? `Patient Profile:\n- Age: ${profile.age || "N/A"}\n- Gender: ${profile.gender || "N/A"}\n- Blood Group: ${profile.blood_group || "N/A"}\n- Medical Conditions: ${profile.medical_conditions || "None declared"}`
      : "Patient Profile: No health profile details registered.";

    const promptText = `
${profileContext}

Symptom Description:
"${symptoms}"

Please perform an initial medical triage. Categorize the situation, provide an empathetic assessment, list immediate safety recommendations, and flag if emergency assistance (SOS) should be initiated.
`;

    // Fetch call to Gemini 2.5 Flash
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: promptText
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              risk_level: {
                type: "STRING",
                enum: ["Low", "Medium", "High"]
              },
              assessment: {
                type: "STRING",
                description: "A clear, empathetic, elderly-friendly summary of the medical analysis. Warn the user that this is an AI triage tool and not a final diagnosis."
              },
              recommendations: {
                type: "ARRAY",
                items: {
                  type: "STRING"
                },
                description: "List of 3-5 immediate, clear action items for the user."
              },
              need_emergency: {
                type: "BOOLEAN",
                description: "True if symptoms suggest a medical emergency requiring contact with emergency services or family."
              }
            },
            required: ["risk_level", "assessment", "recommendations", "need_emergency"]
          }
        },
        systemInstruction: {
          parts: [
            {
              text: `You are an AI healthcare emergency assistant. Your role is triage, not diagnosis.
Categorize risk levels:
- High: Severe chest pain, shortness of breath, stroke symptoms (facial drooping, arm weakness, speech difficulty), sudden confusion, heavy bleeding, loss of consciousness, severe trauma. Set need_emergency to true.
- Medium: Persistent high fever, moderate pain, severe dizziness, vomiting without blood, minor injuries, severe allergic reactions without airway blockage.
- Low: Common cold, minor scrapes, mild headache, normal fatigue.

Be extremely cautious. When in doubt or if patient age is high (>65) or has severe existing conditions, lean towards Higher risk and set need_emergency to true.
Write instructions clearly, in simple sentences suitable for an elderly person under stress.
DO NOT formulate a diagnosis (e.g. do NOT write 'You are having a heart attack'). Instead write 'These symptoms could indicate a serious cardiovascular issue'.`
            }
          ]
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn("Gemini API returned error, falling back to local analysis:", errorText);
      const localResult = localAnalyze(symptoms, profile);
      return NextResponse.json(localResult);
    }

    const resData = await response.json();
    const responseText = resData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error("Empty response from Gemini");
    }

    const parsedResult = JSON.parse(responseText);
    return NextResponse.json({
      ...parsedResult,
      is_mock: false
    });
  } catch (error) {
    console.error("Error in symptom analysis route:", error);
    // If anything fails, fall back to safe local analysis
    try {
      const body = await req.json().catch(() => ({}));
      const localResult = localAnalyze(body.symptoms || "", body.profile);
      return NextResponse.json(localResult);
    } catch {
      return NextResponse.json({
        risk_level: "High",
        assessment: "An error occurred during symptom analysis. Due to safety concerns, please treat this as a potentially high-risk situation.",
        recommendations: [
          "Seek emergency care or call 911/112 if you feel unwell.",
          "Alert someone nearby immediately.",
          "Rest and sit down."
        ],
        need_emergency: true,
        is_mock: true
      });
    }
  }
}
