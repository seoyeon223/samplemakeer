import { useEffect, useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";

import { login } from "../../shopify.server";
import { translations, type Locale } from "../../i18n/translations";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  const acceptLanguage = request.headers.get("Accept-Language") || "";
  const initialLocale: Locale = acceptLanguage.toLowerCase().startsWith("ko") ? "ko" : "en";

  return { showForm: Boolean(login), initialLocale };
};

export default function App() {
  const { showForm, initialLocale } = useLoaderData<typeof loader>();
  const [locale, setLocale] = useState<Locale>(initialLocale);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("gwp_locale");
      if (saved === "ko" || saved === "en") setLocale(saved);
    } catch {
      // ignore
    }
  }, []);

  const t = translations[locale].landing;

  const changeLocale = (next: Locale) => {
    setLocale(next);
    try {
      window.localStorage.setItem("gwp_locale", next);
    } catch {
      // ignore
    }
  };

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => changeLocale("ko")}
            style={{ fontWeight: locale === "ko" ? 700 : 400 }}
          >
            한국어
          </button>
          <button
            type="button"
            onClick={() => changeLocale("en")}
            style={{ fontWeight: locale === "en" ? 700 : 400 }}
          >
            English
          </button>
        </div>
        <h1 className={styles.heading}>{t.heading}</h1>
        <p className={styles.text}>{t.tagline}</p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>{t.shopLabel}</span>
              <input className={styles.input} type="text" name="shop" />
              <span>{t.shopExample}</span>
            </label>
            <button className={styles.button} type="submit">
              {t.login}
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>{t.feature1Title}</strong>. {t.feature1Body}
          </li>
          <li>
            <strong>{t.feature2Title}</strong>. {t.feature2Body}
          </li>
          <li>
            <strong>{t.feature3Title}</strong>. {t.feature3Body}
          </li>
        </ul>
      </div>
    </div>
  );
}
