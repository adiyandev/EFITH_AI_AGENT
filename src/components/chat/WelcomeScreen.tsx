import { motion } from "framer-motion";
import { CalendarDays, Code2, Globe2 } from "lucide-react";

const suggestions = [
  { icon: Globe2, title: "Search the web", text: "Find the latest information", prompt: "Search the web for the latest news and useful updates." },
  { icon: Code2, title: "Help with code", text: "Debug, build, or improve something", prompt: "Help me improve some code." },
  { icon: CalendarDays, title: "Plan my day", text: "Organize tasks and priorities", prompt: "Help me plan my day." },
];

type WelcomeScreenProps = {
  onSuggestion?: (prompt: string) => void;
};

export function WelcomeScreen({ onSuggestion }: WelcomeScreenProps) {
  return (
    <motion.div
      className="welcome"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="welcome-glow" aria-hidden="true" />
      <div className="efith-mark">
        <img src="/EFITH_AI_AGENT/EFITH%20logo.png" alt="EFITH" />
      </div>
      <div className="welcome-eyebrow">EFITH AI</div>
      <h1>What are we working on?</h1>
      <p>A sharp, capable assistant for ideas, work, research, and everything in between.</p>

      <div className="welcome-suggestions">
        {suggestions.map(({ icon: Icon, title, text, prompt }, index) => (
          <motion.button
            key={title}
            className="suggestion-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * (index + 1), duration: 0.28 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => onSuggestion?.(prompt)}
          >
            <span className="suggestion-icon"><Icon size={16} /></span>
            <span className="suggestion-copy">
              <strong>{title}</strong>
              <small>{text}</small>
            </span>
            <span className="suggestion-arrow">↗</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
