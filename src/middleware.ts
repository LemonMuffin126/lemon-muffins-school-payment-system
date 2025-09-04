import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Since we're handling auth state on the client side now,
  // we'll keep middleware minimal and rely on client-side redirects
  // This avoids dependency on auth-helpers-nextjs which may not be available
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};