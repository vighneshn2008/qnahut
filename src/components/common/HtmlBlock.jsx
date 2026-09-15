import { useEffect, useRef } from 'react';

/**
 * Renders raw HTML (including inline/external <script> tags). Browsers do not
 * execute <script> content injected via innerHTML, so after React writes the
 * markup the script elements are re-created from scratch and replaced, which
 * forces the browser to evaluate them. Used by the 'html' question type.
 */
export default function HtmlBlock({ html, className, style }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.querySelectorAll('script').forEach((oldScript) => {
      const script = document.createElement('script');
      for (const attribute of oldScript.attributes) {
        script.setAttribute(attribute.name, attribute.value);
      }
      script.text = oldScript.textContent || '';
      oldScript.parentNode.replaceChild(script, oldScript);
    });
  }, [html]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}