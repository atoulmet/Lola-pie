const FONT_CSS_URL =
  "https://fonts.googleapis.com/css2?family=Playpen+Sans:wght@400;500;600;700&display=swap";

const bufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

export async function embedPlaypenSans(svg: SVGSVGElement) {
  const cssResponse = await fetch(FONT_CSS_URL);
  const cssText = await cssResponse.text();

  const fontFaceBlocks = Array.from(
    cssText.matchAll(/@font-face\s*{[^}]+}/g),
  ).map((match) => match[0]);
  if (fontFaceBlocks.length === 0) {
    return;
  }

  const fontEntries = fontFaceBlocks
    .map((block) => {
      const weightMatch = block.match(/font-weight:\s*(\d+)/);
      const urlMatch = block.match(
        /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/,
      );
      if (!weightMatch || !urlMatch) {
        return null;
      }
      return {
        weight: weightMatch[1],
        url: urlMatch[1],
      };
    })
    .filter((entry): entry is { weight: string; url: string } =>
      Boolean(entry),
    );

  if (fontEntries.length === 0) {
    return;
  }

  const uniqueUrls = Array.from(
    new Set(fontEntries.map((entry) => entry.url)),
  );
  const fontBuffers = await Promise.all(
    uniqueUrls.map(async (url) => {
      const fontResponse = await fetch(url);
      const fontBuffer = await fontResponse.arrayBuffer();
      return { url, fontBuffer };
    }),
  );

  const fontMap = new Map(
    fontBuffers.map(({ url, fontBuffer }) => [
      url,
      bufferToBase64(fontBuffer),
    ]),
  );

  const style = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "style",
  );
  style.textContent = `
    ${fontEntries
      .map(
        (entry) => `
    @font-face {
      font-family: 'Playpen Sans';
      font-style: normal;
      font-weight: ${entry.weight};
      src: url(data:font/woff2;base64,${fontMap.get(entry.url) ?? ""}) format('woff2');
    }`,
      )
      .join("\n")}
    svg { font-family: 'Playpen Sans', sans-serif; }
  `;
  svg.prepend(style);
}
