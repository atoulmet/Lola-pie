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
    [slices],
  );

  const updateAmount = (id: string, value: string) => {
    setSlices((prev) => {
      const next = prev.map((slice) =>
        slice.id === id ? { ...slice, amount: value } : slice,
      );
      const amounts = next.map((slice) => {
        const numeric = Number.parseFloat(
          slice.id === id ? value : slice.amount,
        );
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
    setSlices((prev) =>
      prev.map((slice) =>
        slice.id === id ? { ...slice, label: value } : slice,
      ),
    );
  };

  const addSlice = () => {
    setSlices((prev) => [
      ...prev,
      { id: makeId(), percent: "0", amount: "", label: "" },
    ]);
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
    const bufferToBase64 = (buffer: ArrayBuffer) => {
      const bytes = new Uint8Array(buffer);
      const chunkSize = 0x8000;
      let binary = "";
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      return btoa(binary);
    };

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
    <main className="bg-[#fff7f8] min-h-screen grid place-items-center py-12 px-6">
      <div className="max-w-[560px] w-full">
        <h1 className="text-center text-2xl mb-8 text-[#f1a5b0] font-medium">
          Camembert Lolita on the Road
        </h1>

        <div className="flex justify-center [&_svg]:max-w-full [&_svg]:h-auto">
          <CircleChart
            slices={chartSlices}
            svgId={chartId}
            baseColor={baseColor}
            showLabels={showLabels}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#f9dde1] p-5 mt-8">
          {/* Slices section */}
          <div className="grid gap-4">
            {slices.map((slice, index) => (
              <div
                key={slice.id}
                className="grid grid-cols-[1fr_1.4fr_120px_24px] items-center gap-2 text-sm text-[#8a5c63] border-b border-[#f9dde1] pb-3 last:border-0 last:pb-0"
              >
                <span>Slice {index + 1}</span>
                <input
                  type="text"
                  value={slice.label}
                  placeholder="Label"
                  onChange={(event) =>
                    updateLabel(slice.id, event.target.value)
                  }
                />
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    value={slice.amount}
                    placeholder="Montant"
                    onChange={(event) =>
                      updateAmount(slice.id, event.target.value)
                    }
                  />
                  <span className="text-xs bg-[#fff1f4] text-[#8a5c63] rounded-full px-2 py-0.5 tabular-nums">
                    {slice.percent}%
                  </span>
                </div>
                {slices.length > 1 ? (
                  <button
                    type="button"
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-transparent border-none text-[#c47a82] text-lg cursor-pointer p-0 leading-none hover:bg-[#fde8eb] hover:text-[#8a3a42] transition-colors duration-150"
                    onClick={() => removeSlice(slice.id)}
                  >
                    &times;
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))}
          </div>

          {/* Add slice button */}
          <button
            type="button"
            className="mt-4 w-full py-2.5 px-3.5 rounded-[10px] border border-dashed border-[#f2c1c9] bg-transparent text-[#8a5c63] font-semibold cursor-pointer hover:bg-[#fff1f4] transition-colors duration-150"
            onClick={addSlice}
          >
            Add slice
          </button>

          <hr className="border-[#f9dde1] my-4" />

          {/* Settings row */}
          <div className="flex items-center justify-center gap-6">
            <label className="flex items-center gap-2 text-sm text-[#8a5c63]">
              <span>Color</span>
              <input
                type="color"
                className="w-9 h-9 border border-[#f2c1c9] rounded-lg p-0.5 cursor-pointer bg-transparent"
                value={baseColor}
                onChange={(event) => setBaseColor(event.target.value)}
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-[#8a5c63] cursor-pointer">
              <span>Labels</span>
              <input
                type="checkbox"
                className="sr-only"
                checked={showLabels}
                onChange={(event) => setShowLabels(event.target.checked)}
              />
              <div
                className="toggle-track"
                data-checked={showLabels}
              >
                <div className="toggle-thumb" />
              </div>
            </label>
          </div>

          <hr className="border-[#f9dde1] my-4" />

          {/* Export button */}
          <button
            type="button"
            className="w-full py-2.5 px-3.5 rounded-[10px] border border-[#f2c1c9] bg-[#ffe3e7] text-[#8a5c63] font-semibold cursor-pointer hover:bg-[#ffd7dd] transition-colors duration-150"
            onClick={exportChart}
          >
            Export PNG
          </button>
        </div>
      </div>
    </main>
  );
}
