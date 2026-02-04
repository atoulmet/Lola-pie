"use client";

import { useMemo, useState } from "react";
import CircleChart from "../components/CircleChart";

type SliceInput = {
  id: string;
  percent: string;
  label: string;
};

const makeId = () => crypto.randomUUID();

const formatValue = (value: number) => {
  return Math.round(value).toString();
};

const normalizeSlices = (rawSlices: SliceInput[], lockedId?: string) => {
  const sanitized = rawSlices.map((slice) => {
    const numeric = Number.parseFloat(slice.percent);
    return {
      ...slice,
      value: Number.isFinite(numeric) ? Math.max(0, numeric) : 0,
    };
  });

  const lockedSlice = lockedId ? sanitized.find((slice) => slice.id === lockedId) : undefined;
  const lockedValue = lockedSlice ? Math.min(100, lockedSlice.value) : 0;
  const targetTotal = Math.max(0, 100 - lockedValue);

  const adjustable = sanitized.filter((slice) => slice.id !== lockedId);
  const adjustableTotal = adjustable.reduce((sum, slice) => sum + slice.value, 0);

  if (!adjustable.length) {
    return sanitized.map((slice) => ({
      ...slice,
      percent: slice.id === lockedId ? slice.percent : "0",
    }));
  }

  if (adjustableTotal === 0) {
    return sanitized.map((slice) => ({
      ...slice,
      percent: slice.id === lockedId ? slice.percent : "0",
    }));
  }

  const scaled = adjustable.map((slice) => {
    const scaledValue = (slice.value / adjustableTotal) * targetTotal;
    const floored = Math.floor(scaledValue);
    return {
      id: slice.id,
      floored,
      fraction: scaledValue - floored,
    };
  });

  let remainder = targetTotal - scaled.reduce((sum, slice) => sum + slice.floored, 0);
  const byFraction = [...scaled].sort((a, b) => b.fraction - a.fraction);
  for (let i = 0; i < byFraction.length && remainder > 0; i += 1) {
    byFraction[i].floored += 1;
    remainder -= 1;
  }

  const finalMap = new Map(scaled.map((slice) => [slice.id, slice.floored]));
  for (const slice of byFraction) {
    finalMap.set(slice.id, slice.floored);
  }

  return sanitized.map((slice) => ({
    ...slice,
    percent: slice.id === lockedId ? slice.percent : formatValue(finalMap.get(slice.id) ?? 0),
  }));
};

export default function Home() {
  const [slices, setSlices] = useState<SliceInput[]>([
    { id: makeId(), percent: "100", label: "" },
  ]);
  const [lastEditedId, setLastEditedId] = useState<string | null>(null);
  const chartId = "circle-chart";

  const chartSlices = useMemo(
    () =>
      slices.map((slice) => ({
        percent: Number.parseFloat(slice.percent) || 0,
        label: slice.label,
      })),
    [slices]
  );

  const updatePercent = (id: string, value: string) => {
    setLastEditedId(id);
    setSlices((prev) => prev.map((slice) => (slice.id === id ? { ...slice, percent: value } : slice)));
  };

  const updateLabel = (id: string, value: string) => {
    setSlices((prev) => prev.map((slice) => (slice.id === id ? { ...slice, label: value } : slice)));
  };

  const normalizeOnBlur = () => {
    setSlices((prev) => normalizeSlices(prev, lastEditedId ?? undefined));
  };

  const addSlice = () => {
    setSlices((prev) => [...prev, { id: makeId(), percent: "10", label: "" }]);
  };

  const embedPlaypenSans = async (svg: SVGSVGElement) => {
    const fontCssUrl =
      "https://fonts.googleapis.com/css2?family=Playpen+Sans:wght@400;500;600;700&display=swap";
    const cssResponse = await fetch(fontCssUrl);
    const cssText = await cssResponse.text();

    const fontFaceBlocks = Array.from(cssText.matchAll(/@font-face\s*{[^}]+}/g)).map((match) => match[0]);
    if (fontFaceBlocks.length === 0) {
      return;
    }

    const fontEntries = fontFaceBlocks
      .map((block) => {
        const weightMatch = block.match(/font-weight:\s*(\d+)/);
        const urlMatch = block.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
        if (!weightMatch || !urlMatch) {
          return null;
        }
        return {
          weight: weightMatch[1],
          url: urlMatch[1],
        };
      })
      .filter((entry): entry is { weight: string; url: string } => Boolean(entry));

    if (fontEntries.length === 0) {
      return;
    }

    const uniqueUrls = Array.from(new Set(fontEntries.map((entry) => entry.url)));
    const fontBuffers = await Promise.all(
      uniqueUrls.map(async (url) => {
        const fontResponse = await fetch(url);
        const fontBuffer = await fontResponse.arrayBuffer();
        return { url, fontBuffer };
      })
    );
    const bufferToBase64 = (buffer: ArrayBuffer) => {
      const bytes = new Uint8Array(buffer);
      const chunkSize = 0x8000;
      let binary = "";
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      return btoa(binary);
    };

    const fontMap = new Map(fontBuffers.map(({ url, fontBuffer }) => [url, bufferToBase64(fontBuffer)]));

    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = `
      ${fontEntries
        .map(
          (entry) => `
      @font-face {
        font-family: 'Playpen Sans';
        font-style: normal;
        font-weight: ${entry.weight};
        src: url(data:font/woff2;base64,${fontMap.get(entry.url) ?? ""}) format('woff2');
      }`
        )
        .join("\n")}
      svg { font-family: 'Playpen Sans', sans-serif; }
    `;
    svg.prepend(style);
  };

  const exportChart = async () => {
    const svg = document.getElementById(chartId);
    if (!(svg instanceof SVGSVGElement)) {
      return;
    }
    const serializer = new XMLSerializer();
    const clonedSvg = svg.cloneNode(true) as SVGSVGElement;
    await embedPlaypenSans(clonedSvg);
    const source = serializer.serializeToString(clonedSvg);
    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = () => {
      const width = svg.width.baseVal.value || 600;
      const height = svg.height.baseVal.value || 600;
      const ratio = window.devicePixelRatio || 1;
      const canvas = document.createElement("canvas");
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        return;
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) {
          return;
        }
        const pngUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = "circle-chart.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(pngUrl);
      }, "image/png");
    };
    image.src = url;
  };

  return (
    <main>
      <div className="chart-wrap">
        <h1 className="chart-title">Circle chart preview</h1>
        <CircleChart slices={chartSlices} svgId={chartId} />
        <div className="chart-controls">
          {slices.map((slice, index) => (
            <label key={slice.id} className="chart-input">
              <span>Slice {index + 1}</span>
              <input
                type="text"
                value={slice.label}
                placeholder="Label"
                onChange={(event) => updateLabel(slice.id, event.target.value)}
              />
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="1"
                value={slice.percent}
                onChange={(event) => updatePercent(slice.id, event.target.value)}
                onBlur={normalizeOnBlur}
              />
              <span>%</span>
            </label>
          ))}
          <button type="button" className="chart-add" onClick={addSlice}>
            Add slice
          </button>
          <button type="button" className="chart-export" onClick={exportChart}>
            Export PNG
          </button>
        </div>
      </div>
    </main>
  );
}

