type SliceInput = {
  percent: number;
  color?: string;
  label?: string;
};

type CircleChartProps = {
  slices: SliceInput[];
  size?: number;
  innerRadius?: number;
  svgId?: string;
};

import { arc, pie, type PieArcDatum } from "d3-shape";

const DEFAULT_COLORS = ["#ff9aa7", "#ffc0ca", "#ffd3dc", "#ffb0bb"];

const formatPercent = (value: number) => `${Math.round(value)}%`;
const splitLabel = (label: string, maxChars: number) => {
  const words = label.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) {
      lines.push(current);
      current = word;
      continue;
    }
    // Single word too long: hard-split.
    for (let i = 0; i < word.length; i += maxChars) {
      lines.push(word.slice(i, i + maxChars));
    }
    current = "";
  }

  if (current) {
    lines.push(current);
  }

  return lines;
};

export default function CircleChart({
  slices,
  size = 320,
  innerRadius = 32,
  svgId,
}: CircleChartProps) {
  const total = slices.reduce((sum, slice) => sum + slice.percent, 0);
  const labelPadding = 90;
  const svgSize = size + labelPadding * 2;
  const center = labelPadding + size / 2;
  const outerRadius = size / 2 - 2;
  const separatorWidth = 0.1;
  const padAngle = 0.02;
  const cornerRadius = 4;
  const innerFillRadius = Math.max(innerRadius - 8, 0);

  const pieData: PieArcDatum<SliceInput>[] = pie<SliceInput>()
    .value((slice: SliceInput) => slice.percent)
    .sort(null)
    .padAngle(padAngle)(slices);

  const arcGenerator = arc<(typeof pieData)[number]>()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius)
    .cornerRadius(cornerRadius);

  const labelArc = arc<(typeof pieData)[number]>()
    .innerRadius(outerRadius + 34)
    .outerRadius(outerRadius + 34);

  return (
    <svg
      id={svgId}
      width={svgSize}
      height={svgSize}
      viewBox={`0 0 ${svgSize} ${svgSize}`}
      role="img"
    >
      <circle cx={center} cy={center} r={outerRadius + 8} fill="none" stroke="#f7c7cf" strokeWidth={5} />
      <g transform={`translate(${center} ${center})`}>
        {pieData.map((slice, index) => {
          const path = arcGenerator(slice);
          const [textX, textY] = arcGenerator.centroid(slice);
          const [labelX, labelY] = labelArc.centroid(slice);
          const labelText = slice.data.label?.trim() || `Slice ${index + 1}`;
          const labelLines = splitLabel(labelText, 14);
          return (
            <g key={`${slice.data.percent}-${index}`}>
              <path
                d={path ?? ""}
                fill={slice.data.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                stroke="#ffffff"
                strokeWidth={separatorWidth}
                strokeLinejoin="round"
              />
              <text
                x={textX}
                y={textY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#ffffff"
                fontSize={20}
                fontWeight={500}
              >
                {formatPercent(slice.data.percent)}
              </text>
              <text
                x={labelX}
                y={labelY}
                textAnchor={labelX >= 0 ? "start" : "end"}
                dominantBaseline="middle"
                fill="#f1a5b0"
                fontSize={22}
                fontWeight={400}
              >
                {labelLines.map((line, lineIndex) => (
                  <tspan
                    key={`${line}-${lineIndex}`}
                    x={labelX}
                    dy={lineIndex === 0 ? "0em" : "1.1em"}
                  >
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}
      </g>
      <circle cx={center} cy={center} r={innerFillRadius} fill="#ffd7dd" />
    </svg>
  );
}

