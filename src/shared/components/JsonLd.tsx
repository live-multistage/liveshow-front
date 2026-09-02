// Emits a schema.org JSON-LD block. Server component — the object is
// serialized at render time and never hydrated on the client. Pass one object
// or an array (rendered as a @graph-style list of scripts).
interface Props {
  data: Record<string, unknown> | Record<string, unknown>[];
}

export function JsonLd({ data }: Props) {
  const blocks = Array.isArray(data) ? data : [data];
  return (
    <>
      {blocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          // JSON.stringify output is safe here: no user-controlled key escapes
          // the string context, and we strip the one sequence (`</`) that could
          // break out of the <script> element.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(block).replace(/</g, '\\u003c'),
          }}
        />
      ))}
    </>
  );
}
