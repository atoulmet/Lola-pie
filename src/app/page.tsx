"use client";

import { useMemo, useState } from "react";
import CircleChart from "../components/CircleChart";

type SliceInput = {
  id: string;
  percent: string;
  amount: string;
  label: string;
};

const makeId = () => crypto.randomUUID();

const formatValue = (value: number) => {
  return Math.round(value).toString();
};


export default function Home() {
  const [slices, setSlices] = useState<SliceInput[]>([
    { id: makeId(), percent: "0", amount: "", label: "" },
  ]);
  const chartId = "circle-chart";
  const [baseColor, setBaseColor] = useState("#FF949E");
  const [showLabels, setShowLabels] = useState(true);

  const chartSlices = useMemo(
    () =>
      slices.map((slice) => ({
        percent: Number.parseFloat(slice.percent) || 0,
        label: slice.label,
      })),
    [slices]
  );

  const updateAmount = (id: string, value: string) => {
    setSlices((prev) => {
      const next = prev.map((slice) => (slice.id === id ? { ...slice, amount: value } : slice));
      const amounts = next.map((slice) => {
        const numeric = Number.parseFloat(slice.id === id ? value : slice.amount);
        return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
      });
      const total = amounts.reduce((sum, amount) => sum + amount, 0);
      if (total === 0) {
        return next.map((slice) => ({ ...slice, percent: "0" }));
      }
      return next.map((slice, index) => ({
        ...slice,
        percent: formatValue((amounts[index] / total) * 100),
      }));
    });
  };

  const updateLabel = (id: string, value: string) => {
    setSlices((prev) => prev.map((slice) => (slice.id === id ? { ...slice, label: value } : slice)));
  };

  const addSlice = () => {
    setSlices((prev) => [...prev, { id: makeId(), percent: "0", amount: "", label: "" }]);
  };

  const removeSlice = (id: string) => {
    setSlices((prev) => {
      const next = prev.filter((slice) => slice.id !== id);
      if (next.length === 0) return prev;
      const amounts = next.map((slice) => {
        const numeric = Number.parseFloat(slice.amount);
        return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
      });
      const total = amounts.reduce((sum, amount) => sum + amount, 0);
      if (total === 0) {
        return next.map((slice) => ({ ...slice, percent: "0" }));
      }
      return next.map((slice, index) => ({
        ...slice,
        percent: formatValue((amounts[index] / total) * 100),
      }));
    });
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
      const exportWidth = 900;
      const exportHeight = 400;
      const ratio = window.devicePixelRatio || 1;
      const canvas = document.createElement("canvas");
      canvas.width = exportWidth * ratio;
      canvas.height = exportHeight * ratio;
      canvas.style.width = `${exportWidth}px`;
      canvas.style.height = `${exportHeight}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        return;
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, exportWidth, exportHeight);
      ctx.drawImage(image, 0, 0, exportWidth, exportHeight);
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
        <h1 className="chart-title">Camembert Lolita on the Road</h1>
        <CircleChart slices={chartSlices} svgId={chartId} baseColor={baseColor} showLabels={showLabels} />
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
              <div style={{ display: "flex", flexDirection: "row", gap: "4px" }}>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={slice.amount}
                  placeholder="Montant"
                  onChange={(event) => updateAmount(slice.id, event.target.value)}
                />
                <span style={{ fontSize: "0.875rem", color: "#666" }}>
                  {slice.percent}%
                </span>
              </div>
              {slices.length > 1 ? (
                <button
                  type="button"
                  className="chart-remove"
                  onClick={() => removeSlice(slice.id)}
                >
                  &times;
                </button>
              ) : <span />}
            </label>
          ))}
          <label className="chart-color">
            <span>Color</span>
            <input
              type="color"
              value={baseColor}
              onChange={(event) => setBaseColor(event.target.value)}
            />
          </label>
          <label className="chart-toggle">
            <span>Labels</span>
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(event) => setShowLabels(event.target.checked)}
            />
          </label>
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

