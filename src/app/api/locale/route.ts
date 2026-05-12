import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const { locale } = await request.json();

  if (['en', 'es'].includes(locale)) {
    const cookieStore = await cookies();
    cookieStore.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
}
