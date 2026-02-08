"use client";

import { useMemo, useState } from "react";

import CircleChart from "../components/CircleChart";
import { exportChartAsPng } from "../lib/exportChart";
import type { SliceFormData } from "../lib/types";

const makeId = () => crypto.randomUUID();

const formatValue = (value: number) => {
  return Math.round(value).toString();
};

const recalcPercents = (slices: SliceFormData[]): SliceFormData[] => {
  const amounts = slices.map((slice) => {
    const numeric = Number.parseFloat(slice.amount);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
  });
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  if (total === 0) {
    return slices.map((slice) => ({ ...slice, percent: "0" }));
  }
  return slices.map((slice, index) => ({
    ...slice,
    percent: formatValue((amounts[index] / total) * 100),
  }));
};

export default function Home() {
  const [slices, setSlices] = useState<SliceFormData[]>([
    { id: makeId(), percent: "0", amount: "", label: "" },
  ]);
  const chartId = "circle-chart";
  const [baseColor, setBaseColor] = useState("#FF949E");
  const [showLabels, setShowLabels] = useState(true);

  const chartSlices = useMemo(
    () =>
      slices.map((slice) => ({
        id: slice.id,
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
      return recalcPercents(next);
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
    setSlices((prev) =>
      recalcPercents([
        ...prev,
        { id: makeId(), percent: "0", amount: "", label: "" },
      ]),
    );
  };

  const removeSlice = (id: string) => {
    setSlices((prev) => {
      const next = prev.filter((slice) => slice.id !== id);
      if (next.length === 0) return prev;
      return recalcPercents(next);
    });
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
              <div className="toggle-track" data-checked={showLabels}>
                <div className="toggle-thumb" />
              </div>
            </label>
          </div>

          <hr className="border-[#f9dde1] my-4" />

          {/* Export button */}
          <button
            type="button"
            className="w-full py-2.5 px-3.5 rounded-[10px] border border-[#f2c1c9] bg-[#ffe3e7] text-[#8a5c63] font-semibold cursor-pointer hover:bg-[#ffd7dd] transition-colors duration-150"
            onClick={() => exportChartAsPng(chartId)}
          >
            Export PNG
          </button>
        </div>
      </div>
    </main>
  );
}
