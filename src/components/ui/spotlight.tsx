import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

type SpotlightProps = {
  className?: string;
};

export function Spotlight({ className }: SpotlightProps) {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, ease: "easeOut" }}
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      <div className="absolute -top-40 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(255,102,0,0.2)_0%,_rgba(10,18,46,0.06)_45%,_transparent_70%)] blur-3xl dark:bg-[radial-gradient(circle,_rgba(255,106,0,0.22)_0%,_rgba(135,206,255,0.12)_42%,_transparent_68%)]" />
      <div className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(17,32,79,0.16)_0%,_transparent_70%)] blur-2xl dark:bg-[radial-gradient(circle,_rgba(17,145,255,0.12)_0%,_transparent_72%)]" />
    </motion.div>
  );
}
