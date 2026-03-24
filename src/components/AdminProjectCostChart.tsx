import { ProjectCostChartSeriesResponse } from "@/schemas/projectCosts";
import styled from "@emotion/styled";
import React, { FC, useMemo } from "react";

const COLORS = ["#1f5f8b", "#ff6b35", "#2d936c", "#9b5de5", "#c44536", "#0081a7"];

const currencyFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const AdminProjectCostChart: FC<{
  mode: "base" | "final";
  series: ProjectCostChartSeriesResponse[];
}> = ({ mode, series }) => {
  const normalizedSeries = useMemo(
    () =>
      series.filter((item) =>
        item.points.some((point) => (mode === "base" ? point.baseCost : point.finalCost) > 0)
      ),
    [mode, series]
  );

  const months = normalizedSeries[0]?.points.map((point) => point.month) ?? [];
  const maxValue = Math.max(
    0,
    ...normalizedSeries.flatMap((item) =>
      item.points.map((point) => (mode === "base" ? point.baseCost : point.finalCost))
    )
  );

  if (normalizedSeries.length === 0 || months.length === 0) {
    return <EmptyState>No hay series con coste para el rango seleccionado.</EmptyState>;
  }

  const width = 820;
  const height = 280;
  const paddingTop = 20;
  const paddingRight = 20;
  const paddingBottom = 42;
  const paddingLeft = 68;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;
  const yTicks = 4;

  return (
    <ChartWrapper>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Serie temporal de costes">
        {Array.from({ length: yTicks + 1 }, (_, index) => {
          const ratio = index / yTicks;
          const y = paddingTop + plotHeight * ratio;
          const tickValue = maxValue * (1 - ratio);
          return (
            <g key={index}>
              <GridLine x1={paddingLeft} x2={width - paddingRight} y1={y} y2={y} />
              <AxisLabel x={paddingLeft - 10} y={y + 4} textAnchor="end">
                {currencyFormatter.format(tickValue)}
              </AxisLabel>
            </g>
          );
        })}

        {months.map((month, index) => {
          const x =
            months.length === 1
              ? paddingLeft + plotWidth / 2
              : paddingLeft + (plotWidth * index) / (months.length - 1);
          return (
            <g key={month}>
              <AxisLabel x={x} y={height - 14} textAnchor="middle">
                {month}
              </AxisLabel>
            </g>
          );
        })}

        {normalizedSeries.map((item, index) => {
          const color = COLORS[index % COLORS.length];
          const points = item.points
            .map((point, pointIndex) => {
              const x =
                months.length === 1
                  ? paddingLeft + plotWidth / 2
                  : paddingLeft + (plotWidth * pointIndex) / (months.length - 1);
              const value = mode === "base" ? point.baseCost : point.finalCost;
              const ratio = maxValue === 0 ? 0 : value / maxValue;
              const y = paddingTop + plotHeight * (1 - ratio);
              return `${x},${y}`;
            })
            .join(" ");

          return (
            <g key={item.projectId}>
              <SeriesLine points={points} stroke={color} />
              {item.points.map((point, pointIndex) => {
                const x =
                  months.length === 1
                    ? paddingLeft + plotWidth / 2
                    : paddingLeft + (plotWidth * pointIndex) / (months.length - 1);
                const value = mode === "base" ? point.baseCost : point.finalCost;
                const ratio = maxValue === 0 ? 0 : value / maxValue;
                const y = paddingTop + plotHeight * (1 - ratio);
                return <Point key={`${item.projectId}-${point.month}`} cx={x} cy={y} fill={color} />;
              })}
            </g>
          );
        })}
      </svg>

      <Legend>
        {normalizedSeries.map((item, index) => (
          <LegendItem key={item.projectId}>
            <LegendSwatch style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            <span>{item.projectName}</span>
          </LegendItem>
        ))}
      </Legend>
    </ChartWrapper>
  );
};

const ChartWrapper = styled.div`
  width: 100%;
  overflow-x: auto;

  svg {
    width: 100%;
    min-width: 760px;
    height: auto;
    display: block;
    background: linear-gradient(180deg, #fafafa 0%, #ffffff 100%);
    border: 1px solid #e6e6e6;
    border-radius: 8px;
  }
`;

const GridLine = styled.line`
  stroke: #ececec;
  stroke-width: 1;
`;

const AxisLabel = styled.text`
  fill: #6d6e72;
  font-size: 11px;
`;

const SeriesLine = styled.polyline`
  fill: none;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
`;

const Point = styled.circle`
  r: 3.5;
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-top: 12px;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #4e4f53;
  font-size: 13px;
`;

const LegendSwatch = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
`;

const EmptyState = styled.div`
  padding: 18px;
  border-radius: 8px;
  border: 1px dashed #d8d8d8;
  color: #6d6e72;
  background: #fafafa;
  font-size: 14px;
`;

export default AdminProjectCostChart;
