const URL_REGEX = /(https?:\/\/[^\s]+)/g;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/;

// Splits on URLs and renders them as clickable links, leaving everything else as plain
// text. Trailing punctuation (end of a sentence, a closing paren, etc.) is kept out of the
// link so "see https://example.com." doesn't turn the period into part of the URL.
export function Linkify({ text }: { text: string }) {
  const parts = text.split(URL_REGEX);
  return (
    <>
      {parts.map((part, i) => {
        if (!/^https?:\/\//.test(part)) return <span key={i}>{part}</span>;
        const trailing = TRAILING_PUNCTUATION.exec(part)?.[0] ?? "";
        const href = trailing ? part.slice(0, -trailing.length) : part;
        return (
          <span key={i}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:no-underline"
            >
              {href}
            </a>
            {trailing}
          </span>
        );
      })}
    </>
  );
}
