import crypto      from "crypto";
import bcrypt       from "bcryptjs";
import prisma       from "../prismaClient.js";
import { AppError } from "../middleware/AppError.js";
import { sendPasswordResetEmail } from "./email.service.js";

const TOKEN_TTL_MS  = 60 * 60 * 1000; // 1 hour
const SALT_ROUNDS   = 12;

function sha256(raw) {
    return crypto.createHash("sha256").update(raw).digest("hex");
}

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
// Always returns void — callers must return the same 200 regardless of outcome
// to prevent user enumeration.

export async function requestPasswordReset(email) {
    const user = await prisma.user.findUnique({
        where:  { email },
        select: { id: true, deletedAt: true },
    });

    // Silent no-op for unknown / soft-deleted accounts — anti-enumeration
    if (!user || user.deletedAt !== null) return;

    // Invalidate any existing token for this user before issuing a new one
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const rawToken = crypto.randomBytes(32).toString("hex"); // 64-char hex
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
    });

    const base     = (process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const resetUrl = `${base}/reset-password?token=${rawToken}`;

    // Swallow email delivery errors — the token is already persisted.
    // Letting SMTP exceptions propagate would return 500 only for registered
    // addresses, leaking user existence to an observer.
    try {
        await sendPasswordResetEmail(email, resetUrl);
    } catch (emailErr) {
        console.error("[PASSWORD RESET] Email delivery failed:", emailErr.message);
    }
}

// ── POST /api/auth/reset-password ─────────────────────────────────────────────

export async function resetPassword(rawToken, newPassword) {
    const tokenHash = sha256(rawToken);

    const record = await prisma.passwordResetToken.findUnique({
        where:  { tokenHash },
        select: { id: true, userId: true, expiresAt: true },
    });

    if (!record || record.expiresAt < new Date()) {
        throw new AppError("This reset link is invalid or has expired.", 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Atomic: update password + delete all reset tokens for the user
    await prisma.$transaction([
        prisma.user.update({
            where: { id: record.userId },
            data:  { passwordHash },
        }),
        prisma.passwordResetToken.deleteMany({
            where: { userId: record.userId },
        }),
    ]);
}
