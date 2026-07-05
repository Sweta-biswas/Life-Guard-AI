import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { chatId, name, patientName, lat, lon, conditions } = body;

    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      console.warn("[TELEGRAM BOT] Token missing. Skipping alert dispatch. Chat ID:", chatId);
      return NextResponse.json(
        { 
          success: false, 
          message: "Telegram Bot Token is missing in server environment variables. Alert simulation logged." 
        },
        { status: 200 }
      );
    }

    // Format a high-fidelity Markdown emergency message
    let messageText = `🚨 *URGENT MEDICAL EMERGENCY* 🚨\n\n`;
    messageText += `*${patientName}* needs immediate medical help!\n\n`;
    
    if (lat && lon && lat !== 0 && lon !== 0) {
      messageText += `📍 *Current Location:* \n`;
      messageText += `Latitude: \`${lat.toFixed(6)}\`\n`;
      messageText += `Longitude: \`${lon.toFixed(6)}\`\n\n`;
      messageText += `🔗 *Google Maps Navigation:* \n`;
      messageText += `https://maps.google.com/?q=${lat},${lon}\n\n`;
    } else {
      messageText += `📍 Location access was denied or unavailable.\n\n`;
    }

    if (conditions) {
      messageText += `⚠️ *Medical Conditions listed:* \n`;
      messageText += `_${conditions}_\n\n`;
    }

    messageText += `⏱️ _Please contact them or call emergency services immediately._`;

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: "Markdown",
        disable_web_page_preview: false
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[TELEGRAM BOT] API responded with error:", errText);
      throw new Error(`Telegram API returned status ${response.status}`);
    }

    const resData = await response.json();
    return NextResponse.json({
      success: true,
      data: resData
    });

  } catch (error: any) {
    console.error("Error sending Telegram message:", error);
    return NextResponse.json(
      { error: "Failed to dispatch Telegram message", details: error?.message },
      { status: 500 }
    );
  }
}
