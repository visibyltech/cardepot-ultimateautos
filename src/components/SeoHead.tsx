import { useEffect } from 'react';

interface SeoHeadProps {
  title: string;
  description: string;
  jsonLd?: Record<string, any> | null;
}

export function SeoHead({ title, description, jsonLd }: SeoHeadProps) {
  useEffect(() => {
    document.title = title;
    const setMeta = (selector: string, content: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute('content', content);
    };
    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', description);

    const existingScript = document.getElementById('dynamic-jsonld');
    if (existingScript) existingScript.remove();

    if (jsonLd) {
      const script = document.createElement('script');
      script.id = 'dynamic-jsonld';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      const script = document.getElementById('dynamic-jsonld');
      if (script) script.remove();
    };
  }, [title, description, jsonLd]);

  return null;
}
