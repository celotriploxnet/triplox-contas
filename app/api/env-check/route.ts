import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    has_RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    has_FROM_EMAIL: !!process.env.FROM_EMAIL,
    has_MAIL_TO: !!process.env.MAIL_TO,
  });
}