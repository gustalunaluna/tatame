import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Isolado num arquivo próprio de propósito: o recharts sozinho pesa ~390 kB.
 * Em `metas.tsx` ele é carregado sob demanda (React.lazy), então a tela abre
 * na hora e o gráfico entra depois, em vez de a página inteira esperar por ele.
 */
export default function GraficoEvolucao({
  dados,
}: {
  dados: { date: string; média: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={dados}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10 }}
          stroke="var(--muted-foreground)"
        />
        <YAxis
          domain={[0, 5]}
          tick={{ fontSize: 10 }}
          stroke="var(--muted-foreground)"
          width={20}
        />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="média"
          stroke="var(--primary)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
