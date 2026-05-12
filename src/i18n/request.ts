import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  // En Next 15, cookies() is synchronous or asynchronous? Next 15 requires await cookies()!
  // BUT next-intl getRequestConfig doesn't always support the Promise-based cookies unless handled carefully.
  // We'll use the Next.js `cookies` function.
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'es';

  return {
    locale,
    // Import the dictionary based on the locale
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
