import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export function WelcomeScreen() {
  return (
    <motion.div
      className="welcome"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="efith-mark">
        <Sparkles size={24} />
      </div>
      <h1>What can I help with?</h1>
      <p>Your personal AI assistant.</p>
    </motion.div>
  );
}
