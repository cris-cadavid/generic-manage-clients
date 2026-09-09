"use client";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { money } from "@/lib/es";

export type DayPoint = { label: string; full: string; total: number };

export default function RevenueChart({ data }: { data: DayPoint[] }) {
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#a8a29e" }} interval={1} />
          <Tooltip
            formatter={(v) => [money(Number(v ?? 0)), "Ingresos"]}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.full ?? ""}
            contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 12 }}
          />
          <Area type="monotone" dataKey="total" stroke="#d97706" strokeWidth={2.5} fill="url(#revFill)" dot={false} activeDot={{ r: 4 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
