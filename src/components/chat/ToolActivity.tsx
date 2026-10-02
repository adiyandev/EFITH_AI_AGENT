import { Check, LoaderCircle } from "lucide-react";

type ToolActivityProps = {
  label: string;
  done?: boolean;
  durationMs?: number;
};

export function ToolActivity({ label, done = false }: ToolActivityProps) {
  return (
    <div className="tool-activity">
      {done ? <Check size={15} /> : <LoaderCircle className="spin" size={15} />}
      <span>{label}</span>
      {done && typeof durationMs === "number" && <span className="tool-duration">Worked for {(durationMs / 1000).toFixed(2)}s</span>}
    </div>
  );
}
