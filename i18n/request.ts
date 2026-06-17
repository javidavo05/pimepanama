import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const locale = rawLocale === "en" ? "en" : "es";

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
