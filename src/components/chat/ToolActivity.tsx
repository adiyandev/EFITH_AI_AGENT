import { Check, LoaderCircle } from "lucide-react";

type ToolActivityProps = {
  label: string;
  done?: boolean;
};

export function ToolActivity({ label, done = false }: ToolActivityProps) {
  return (
    <div className="tool-activity">
      {done ? <Check size={15} /> : <LoaderCircle className="spin" size={15} />}
      <span>{label}</span>
    </div>
  );
}
