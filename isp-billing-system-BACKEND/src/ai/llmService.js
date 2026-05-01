/**
 * llmService.js – LLaMA/Groq LLM Integration with System Data Grounding
 *
 * Uses Groq API (llama3-8b-8192) to provide AI chat assistance.
 * Before responding, grabs real customer context from MySQL via dataFetcher.
 * Maintains per-session conversation history (in-memory, 20-message rolling window).
 */

'use strict';

const https = require('https');
const { fetchCustomerContext } = require('./dataFetcher');

/* ──────────────────────────────────────────────────────────────
   Config
   ────────────────────────────────────────────────────────────── */

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL || 'llama3-8b-8192';
const GROQ_API_URL = 'api.groq.com';
const GROQ_API_PATH = '/openai/v1/chat/completions';
const MAX_CONTEXT_MESSAGES = 20; // rolling window per session
const MAX_TOKENS = 1024;

/* ──────────────────────────────────────────────────────────────
   In-memory session store
   sessions[sessionId] = { customerId, messages: [...], createdAt, updatedAt }
   ────────────────────────────────────────────────────────────── */

const sessions = new Map();

/* ──────────────────────────────────────────────────────────────
   HTTP helper (no axios dependency — plain Node https)
   ────────────────────────────────────────────────────────────── */

function groqRequest(payload) {
  return new Promise((resolve, reject) => {
    if (!GROQ_API_KEY) {
      return reject(new Error('GROQ_API_KEY is not configured in .env'));
    }

    const body = JSON.stringify(payload);
    const options = {
      hostname: GROQ_API_URL,
      port: 443,
      path: GROQ_API_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message || 'Groq API error'));
          resolve(parsed);
        } catch (e) {
          reject(new Error('Failed to parse Groq response'));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/* ──────────────────────────────────────────────────────────────
   System prompt builder (grounded with real customer data)
   ────────────────────────────────────────────────────────────── */

function buildSystemPrompt(context) {
  if (!context) {
    return `You are a helpful ISP billing support assistant for an Internet Service Provider in Kenya.
You assist customers with questions about their internet subscriptions, bills, data usage, and service plans.
Be professional, concise, and empathetic.`;
  }

  const { customer, subscription, recentInvoices, openTickets, churnRisk, recentPayments } = context;

  const subInfo = subscription
    ? `
ACTIVE SUBSCRIPTION:
  - Plan: ${subscription.plan}${subscription.planSpeed ? ` (${subscription.planSpeed})` : ''}
  - Monthly Cost: KES ${subscription.planPrice || 'N/A'}
  - Data Used: ${(subscription.dataUsedMB / 1024).toFixed(2)} GB
  - Data Remaining: ${(subscription.dataRemainingMB / 1024).toFixed(2)} GB
  - Start Date: ${new Date(subscription.startDate).toDateString()}
  - End Date (Expires): ${new Date(subscription.endDate).toDateString()}
  - Auto-Renew: ${subscription.autoRenew ? 'Yes' : 'No'}
  - Status: ${subscription.status}`
    : '\nSUBSCRIPTION: No active subscription found.';

  const invoiceInfo = recentInvoices.length > 0
    ? '\nRECENT INVOICES:\n' + recentInvoices.map((inv, i) =>
        `  ${i + 1}. #${inv.invoiceNumber} — KES ${parseFloat(inv.totalAmount).toFixed(2)} | Status: ${inv.status} | Due: ${new Date(inv.dueDate).toDateString()} | Paid: ${inv.paidAt ? new Date(inv.paidAt).toDateString() : 'Not paid'}`
      ).join('\n')
    : '\nRECENT INVOICES: None found.';

  const ticketInfo = openTickets.length > 0
    ? '\nOPEN SUPPORT TICKETS:\n' + openTickets.map((t, i) =>
        `  ${i + 1}. [${t.priority?.toUpperCase()}] ${t.subject} — Status: ${t.status}`
      ).join('\n')
    : '\nOPEN SUPPORT TICKETS: None.';

  const churnInfo = churnRisk
    ? `\nCHURN RISK SCORE: ${(churnRisk.score * 100).toFixed(1)}% (${churnRisk.riskLevel})${churnRisk.reasons.length ? '\n  Signals: ' + churnRisk.reasons.join('; ') : ''}`
    : '';

  const paymentInfo = recentPayments.length > 0
    ? '\nRECENT PAYMENTS:\n' + recentPayments.map((p, i) =>
        `  ${i + 1}. KES ${parseFloat(p.amount).toFixed(2)} via ${p.method} — ${new Date(p.completedAt).toDateString()}${p.mpesaReceipt ? ` (Receipt: ${p.mpesaReceipt})` : ''}`
      ).join('\n')
    : '\nRECENT PAYMENTS: None found.';

  return `You are a helpful ISP billing support assistant for an Internet Service Provider in Kenya.
You have access to REAL-TIME data for the customer you are speaking with. Use this data to answer their questions accurately.
Be professional, concise, empathetic, and always cite specific figures from the data below.

=== CUSTOMER DATA ===
CUSTOMER: ${customer.name}
  Email: ${customer.email} | Phone: ${customer.phone}
  Member Since: ${new Date(customer.memberSince).toDateString()}
  Account Status: ${customer.isActive ? 'Active' : 'Suspended'}
${subInfo}
${invoiceInfo}
${ticketInfo}
${paymentInfo}
${churnInfo}
====================

IMPORTANT INSTRUCTIONS:
- Only discuss information related to this customer's actual data above.
- If asked about billing amounts, always quote figures from the invoices.
- If asked "why is my bill high", analyse the invoice amounts vs plan pricing and data usage.
- Never make up data — if unsure, say "I don't have that information available right now."
- For complaints or issues, show empathy and offer to escalate if needed.
- Always respond in English.`;
}

/* ──────────────────────────────────────────────────────────────
   Session management
   ────────────────────────────────────────────────────────────── */

function getOrCreateSession(sessionId, customerId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      customerId,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  const session = sessions.get(sessionId);
  session.updatedAt = new Date().toISOString();
  return session;
}

function pruneSession(session) {
  // Keep last MAX_CONTEXT_MESSAGES to prevent token overflow
  if (session.messages.length > MAX_CONTEXT_MESSAGES) {
    session.messages = session.messages.slice(-MAX_CONTEXT_MESSAGES);
  }
}

/* ──────────────────────────────────────────────────────────────
   Main chat function
   ────────────────────────────────────────────────────────────── */

/**
 * Send a message and receive a grounded AI response.
 * @param {string} sessionId  – unique chat session ID (e.g., `${customerId}_${Date.now()}`)
 * @param {string} customerId – UUID of the customer
 * @param {string} message    – user message
 * @returns {{ reply, sessionId, usage }}
 */
async function chat(sessionId, customerId, message) {
  // 1. Fetch real-time customer context
  const context = await fetchCustomerContext(customerId);

  // 2. Build system prompt grounded in real data
  const systemPrompt = buildSystemPrompt(context);

  // 3. Get/create session
  const session = getOrCreateSession(sessionId, customerId);
  session.messages.push({ role: 'user', content: message });
  pruneSession(session);

  // 4. Build message array for Groq
  const messagesPayload = [
    { role: 'system', content: systemPrompt },
    ...session.messages
  ];

  // 5. Call Groq API
  const response = await groqRequest({
    model: LLM_MODEL,
    messages: messagesPayload,
    max_tokens: MAX_TOKENS,
    temperature: 0.7,
    top_p: 0.9
  });

  const reply = response.choices?.[0]?.message?.content?.trim() || 'I apologize, I could not generate a response at this time.';
  const usage = response.usage || {};

  // 6. Persist assistant reply in session
  session.messages.push({ role: 'assistant', content: reply });

  return {
    reply,
    sessionId,
    usage: {
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0
    },
    customer: context ? { name: context.customer.name, id: customerId } : null
  };
}

/* ──────────────────────────────────────────────────────────────
   Dashboard summary generation (Module 5)
   ────────────────────────────────────────────────────────────── */

/**
 * Generate a plain-English AI summary of dashboard metrics.
 * @param {object} dashboardData – structured metrics object
 * @returns {string} LLM-generated summary
 */
async function generateDashboardSummary(dashboardData) {
  const prompt = `You are an AI analytics assistant for an Internet Service Provider in Kenya.
Analyse the following dashboard data and write a concise (3-5 sentences) plain-English executive summary 
for the admin. Highlight key trends, risks, and any immediate actions needed.

DASHBOARD DATA:
${JSON.stringify(dashboardData, null, 2)}

Write the summary now:`;

  const response = await groqRequest({
    model: LLM_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 512,
    temperature: 0.5
  });

  return response.choices?.[0]?.message?.content?.trim()
    || 'Dashboard summary unavailable at this time.';
}

/* ──────────────────────────────────────────────────────────────
   Session utilities
   ────────────────────────────────────────────────────────────── */

function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

function clearSession(sessionId) {
  sessions.delete(sessionId);
}

function getActiveSessions() {
  return Array.from(sessions.entries()).map(([id, s]) => ({
    sessionId: id,
    customerId: s.customerId,
    messageCount: s.messages.length,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt
  }));
}

module.exports = {
  chat,
  generateDashboardSummary,
  getSession,
  clearSession,
  getActiveSessions,
  buildSystemPrompt // exported for testing
};
