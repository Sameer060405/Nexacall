/**
 * SMS via Twilio REST API — no npm package required.
 *
 * Set these in backend/.env to activate:
 *   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
 *   TWILIO_AUTH_TOKEN=your_auth_token
 *   TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
 *
 * If credentials are absent, calls are logged and skipped (safe for dev).
 */
export async function sendSMS(to, body) {
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
        console.warn(`[SMS] Twilio not configured — skipping SMS to ${to}`);
        console.info(`[SMS] Would have sent: "${body}"`);
        return { skipped: true };
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const creds = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${creds}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: TWILIO_PHONE_NUMBER, Body: body }).toString(),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`Twilio ${response.status}: ${err.message}`);
    }

    const result = await response.json();
    console.info(`[SMS] Sent to ${to} — SID: ${result.sid}`);
    return result;
}

/**
 * Wrapper used by contact.controller → sendContactInvite.
 * Returns { success, simulated?, sid?, error? } — never throws.
 */
export async function sendSMSInvite(to, body) {
    try {
        const result = await sendSMS(to, body);
        if (result.skipped) return { success: true, simulated: true };
        return { success: true, sid: result.sid };
    } catch (err) {
        console.error('[SMS] sendSMSInvite error:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Send meeting invite SMS to a list of phone contacts.
 * Runs all sends concurrently; failures are logged individually so one
 * bad number doesn't abort the rest.
 */
export async function sendMeetingInvites(phoneContacts, meeting) {
    if (!Array.isArray(phoneContacts) || phoneContacts.length === 0) return;

    const frontendUrl = process.env.FRONTEND_URL || 'https://nexacall.vercel.app';
    const meetingLink = `${frontendUrl}/meeting/${meeting.meetingCode}`;
    const time = new Date(meeting.startTime).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

    const message =
        `You're invited to a meeting: ${meeting.title}\n` +
        `Time: ${time}\n` +
        `Join: ${meetingLink}`;

    const results = await Promise.allSettled(
        phoneContacts.map((c) => sendSMS(c.phone, message))
    );

    results.forEach((r, i) => {
        if (r.status === 'rejected') {
            console.error(`[SMS] Failed for ${phoneContacts[i].phone}:`, r.reason?.message);
        }
    });
}
