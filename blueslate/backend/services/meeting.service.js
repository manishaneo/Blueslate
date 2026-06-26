/**
 * meeting.service.js
 * 
 * Handles scheduling meetings and generating .ics invites.
 */
import prisma from '../prismaClient.js';
import nodemailer from 'nodemailer';

/**
 * Creates an ICS file content string
 */
function generateICS({ meetingId, start, end, summary, description, adminEmail, customerEmail, businessName }) {
    // Format dates as YYYYMMDDTHHMMSSZ
    const fmt = (date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const dtStamp = fmt(new Date());
    const dtStart = fmt(start);
    const dtEnd = fmt(end);

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//BlueSlate//${businessName}//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${meetingId}@blueslate.com
DTSTAMP:${dtStamp}
DTSTART:${dtStart}
DTEND:${dtEnd}
SUMMARY:${summary}
DESCRIPTION:${description}
ORGANIZER;CN="${businessName}":mailto:${adminEmail}
ATTENDEE;RSVP=TRUE;CN="Customer":mailto:${customerEmail}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
}

/**
 * Generates email transporter
 */
function getTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        }
    });
}

export async function scheduleMeeting({ requestId, businessId, customerEmail, customerPhone, scheduledAt, durationMinutes, notes, adminEmail, businessName }) {
    if (!scheduledAt || isNaN(new Date(scheduledAt).getTime())) {
        throw new Error("Invalid scheduledAt date.");
    }
    const start = new Date(scheduledAt);
    if (start < new Date()) {
        throw new Error("Meeting cannot be scheduled in the past.");
    }

    // 1. Save in database
    const meeting = await prisma.scheduledMeeting.create({
        data: {
            requestId,
            businessId,
            customerEmail,
            customerPhone,
            scheduledAt: start,
            duration: durationMinutes,
            notes,
            status: "SCHEDULED"
        }
    });

    const end = new Date(start.getTime() + durationMinutes * 60000);
    const summary = `Meeting with ${businessName}`;
    const description = notes || `Scheduled follow-up meeting.`;

    const icsContent = generateICS({
        meetingId: meeting.id,
        start,
        end,
        summary,
        description,
        adminEmail,
        customerEmail,
        businessName
    });

    // 2. Send email with .ics attachment
    if (process.env.SMTP_USER) {
        try {
            const transporter = getTransporter();
            await transporter.sendMail({
                from: `"${businessName}" <${adminEmail}>`,
                to: customerEmail,
                subject: `Meeting Invitation: ${businessName}`,
                text: `You have a meeting scheduled with ${businessName} on ${start.toLocaleString()}.\n\nNotes: ${notes || ''}\n\nPlease find the calendar invitation attached.`,
                icalEvent: {
                    filename: 'invite.ics',
                    method: 'request',
                    content: icsContent
                }
            });
            console.log(`[MEETING SERVICE] Sent email to ${customerEmail}`);
        } catch (error) {
            console.error(`[MEETING SERVICE] Failed to send email:`, error.message);
        }
    } else {
        console.warn(`[MEETING SERVICE] SMTP_USER not set. Skipping email send for meeting ${meeting.id}.`);
    }

    // 3. Create Timeline Event
    await prisma.requestActivity.create({
        data: {
            requestId,
            type: "SYSTEM",
            description: `Meeting scheduled for ${start.toLocaleString()} (${durationMinutes} mins)`
        }
    });

    return meeting;
}

export async function cancelMeeting(meetingId, requestId) {
    const meeting = await prisma.scheduledMeeting.findUnique({
        where: { id: meetingId }
    });

    if (!meeting) throw new Error("Meeting not found");

    const updated = await prisma.scheduledMeeting.update({
        where: { id: meetingId },
        data: { status: "CANCELLED" }
    });

    await prisma.requestActivity.create({
        data: {
            requestId,
            type: "SYSTEM",
            description: `Meeting on ${meeting.scheduledAt.toLocaleString()} was cancelled.`
        }
    });

    return updated;
}
