import { embedPlaypenSans } from "./embedFont";

export async function exportChartAsPng(chartId: string) {
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
}
