/**
 * WhatsApp Service — Maytapi Integration
 *
 * Provides helper functions to interact with the Maytapi WhatsApp API.
 * Docs: https://maytapi.com/whatsapp-api-documentation
 *
 * Environment variables required (set in .env):
 *   VITE_MAYTAPI_PRODUCT_ID  — Your Maytapi Product ID
 *   VITE_MAYTAPI_TOKEN       — Your Maytapi API Token (x-maytapi-key)
 *   VITE_MAYTAPI_PHONE_ID    — Your linked WhatsApp phone ID
 */

// ─── Config ────────────────────────────────────────────────────────────────────

const PRODUCT_ID = import.meta.env.VITE_MAYTAPI_PRODUCT_ID;
const API_TOKEN  = import.meta.env.VITE_MAYTAPI_TOKEN;
const PHONE_ID   = import.meta.env.VITE_MAYTAPI_PHONE_ID;

const BASE_URL = `https://api.maytapi.com/api/${PRODUCT_ID}/${PHONE_ID}`;

/**
 * Validates that all required Maytapi environment variables are present.
 * Call this early (e.g. at app startup) to catch mis-configuration.
 *
 * @returns {{ valid: boolean, missing: string[] }}
 */
export function validateConfig() {
  const missing = [];
  if (!PRODUCT_ID) missing.push('VITE_MAYTAPI_PRODUCT_ID');
  if (!API_TOKEN)  missing.push('VITE_MAYTAPI_TOKEN');
  if (!PHONE_ID)   missing.push('VITE_MAYTAPI_PHONE_ID');

  return {
    valid: missing.length === 0,
    missing,
  };
}

// ─── Internal Helpers ──────────────────────────────────────────────────────────

/**
 * Generic Maytapi API request wrapper.
 *
 * @param {string}  endpoint  — path appended to BASE_URL (e.g. "/sendMessage")
 * @param {object}  body      — JSON payload
 * @param {string}  [method]  — HTTP method (default: "POST")
 * @returns {Promise<object>}  parsed JSON response
 */
async function apiRequest(endpoint, body = null, method = 'POST') {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-maytapi-key': API_TOKEN,
    },
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Maytapi API error ${response.status}: ${errorData.message || response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`[WhatsApp Service] ${endpoint} failed:`, error);
    throw error;
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Send a text message via WhatsApp.
 *
 * @param {string} phoneNumber — recipient in international format (e.g. "919876543210")
 * @param {string} message     — plain-text message body
 * @returns {Promise<object>}
 */
export async function sendTextMessage(phoneNumber, message) {
  return apiRequest('/sendMessage', {
    to_number: phoneNumber,
    type: 'text',
    message,
  });
}

/**
 * Send a media message (image, document, video, etc.) via WhatsApp.
 *
 * @param {string} phoneNumber — recipient in international format
 * @param {string} mediaUrl    — publicly accessible URL of the media file
 * @param {string} [caption]   — optional caption text
 * @param {string} [type]      — media type: "image" | "video" | "document" | "audio" (default: "image")
 * @returns {Promise<object>}
 */
export async function sendMediaMessage(phoneNumber, mediaUrl, caption = '', type = 'image') {
  return apiRequest('/sendMessage', {
    to_number: phoneNumber,
    type,
    message: mediaUrl,
    ...(caption && { text: caption }),
  });
}

/**
 * Send a message to a WhatsApp group.
 *
 * @param {string} groupId — WhatsApp group JID (e.g. "120363XXXX@g.us")
 * @param {string} message — plain-text message body
 * @returns {Promise<object>}
 */
export async function sendGroupMessage(groupId, message) {
  return apiRequest('/sendMessage', {
    to_number: groupId,
    type: 'text',
    message,
  });
}

/**
 * Retrieve the current status / QR code of the linked phone.
 *
 * @returns {Promise<object>}
 */
export async function getPhoneStatus() {
  return apiRequest('/status', null, 'GET');
}

/**
 * List all WhatsApp groups the linked account belongs to.
 *
 * @returns {Promise<object>}
 */
export async function getGroups() {
  return apiRequest('/getGroups', null, 'GET');
}

/**
 * Send a bulk notification to multiple phone numbers.
 *
 * @param {string[]} phoneNumbers — array of phone numbers in international format
 * @param {string}   message      — message body
 * @returns {Promise<object[]>}   — array of API responses (one per recipient)
 */
export async function sendBulkMessages(phoneNumbers, message) {
  const results = [];

  for (const phone of phoneNumbers) {
    try {
      const result = await sendTextMessage(phone, message);
      results.push({ phone, success: true, data: result });
    } catch (error) {
      results.push({ phone, success: false, error: error.message });
    }
    // Small delay to respect rate-limits
    await new Promise((r) => setTimeout(r, 300));
  }

  return results;
}

// Default export for convenience
export default {
  validateConfig,
  sendTextMessage,
  sendMediaMessage,
  sendGroupMessage,
  getPhoneStatus,
  getGroups,
  sendBulkMessages,
};
