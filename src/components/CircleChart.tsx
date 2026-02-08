import { arc, pie, type PieArcDatum } from "d3-shape";

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
  baseColor?: string;
  showLabels?: boolean;
};

const getSliceColor = (baseColor: string, index: number) => {
  const opacity = Math.max(1 - index * 0.1, 0.1);
  return `color-mix(in srgb, ${baseColor} ${Math.round(opacity * 100)}%, transparent)`;
};

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
  size = 300,
  innerRadius = 24,
  svgId,
  baseColor = "#FF949E",
  showLabels = true,
}: CircleChartProps) {
  const svgWidth = 900;
  const svgHeight = 400;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;
  const outerRadius = size / 2 - 8;
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
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      role="img"
    >
      <circle cx={centerX} cy={centerY} r={outerRadius + 8} fill="none" stroke={`color-mix(in srgb, ${baseColor} 40%, white)`} strokeWidth={5} />
      <g transform={`translate(${centerX} ${centerY})`}>
        {pieData.map((slice, index) => {
          const path = arcGenerator(slice);
          const [textX, textY] = arcGenerator.centroid(slice);
          const [labelX, labelY] = labelArc.centroid(slice);
          const labelText = slice.data.label?.trim() || `Slice ${index + 1}`;
          const labelLines = splitLabel(labelText, 14);
          const color = slice.data.color ?? getSliceColor(baseColor, index);
          return (
            <g key={`${slice.data.percent}-${index}`}>
              <path
                d={path ?? ""}
                fill={color}
                stroke="#ffffff"
                strokeWidth={separatorWidth}
                strokeLinejoin="round"
              />
              {showLabels && (
                <text
                  x={textX}
                  y={textY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#ffffff"
                  fontSize={24}
                  fontWeight={400}
                >
                  {formatPercent(slice.data.percent)}
                </text>
              )}
              {showLabels && (
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor={labelX >= 0 ? "start" : "end"}
                  dominantBaseline="middle"
                  fill={color}
                  fontSize={24}
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
              )}
            </g>
          );
        })}
      </g>
      <circle cx={centerX} cy={centerY} r={innerFillRadius} fill={`color-mix(in srgb, ${baseColor} 30%, white)`} />
    </svg>
  );
}