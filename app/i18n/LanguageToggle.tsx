import { ButtonGroup, Button } from "@shopify/polaris";
import { useTranslations } from "./LocaleContext";

export function LanguageToggle() {
  const { locale, setLocale } = useTranslations();

  return (
    <ButtonGroup variant="segmented">
      <Button pressed={locale === "ko"} onClick={() => setLocale("ko")} size="slim">
        한국어
      </Button>
      <Button pressed={locale === "en"} onClick={() => setLocale("en")} size="slim">
        English
      </Button>
    </ButtonGroup>
  );
}
