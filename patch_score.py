import re

file_path = "src/components/ScoreDisplay.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Add states
states_injection = """  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(Boolean(document.fullscreenElement));
  
  const prevScoreRef = useRef(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [popups, setPopups] = useState<{ id: number, diff: number }[]>([]);
"""
content = content.replace("  const [isExpanded, setIsExpanded] = useState(false);\n  const [isFullscreen, setIsFullscreen] = useState<boolean>(Boolean(document.fullscreenElement));", states_injection)

# Modify effect
effect_injection = """  if (!stats) return null;

  useEffect(() => {
    if (stats.totalScore !== prevScoreRef.current) {
      if (stats.totalScore > prevScoreRef.current) {
         const diff = stats.totalScore - prevScoreRef.current;
         const id = Date.now() + Math.random();
         setPopups(prev => [...prev, { id, diff }]);
         setTimeout(() => {
            setPopups(prev => prev.filter(p => p.id !== id));
         }, 1500); // match animation duration
      }
      
      const start = prevScoreRef.current;
      const end = stats.totalScore;
      const duration = 1000;
      const startTime = performance.now();
      
      const updateCounter = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        if (elapsed < duration) {
           const progress = elapsed / duration;
           const easeOut = 1 - Math.pow(1 - progress, 3);
           setDisplayScore(Math.round(start + (end - start) * easeOut));
           requestAnimationFrame(updateCounter);
        } else {
           setDisplayScore(end);
        }
      };
      requestAnimationFrame(updateCounter);
      
      prevScoreRef.current = stats.totalScore;
    }
  }, [stats.totalScore]);
"""
content = content.replace("  if (!stats) return null;", effect_injection)

# Use displayScore and popups in the render tree
old_render = """              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight leading-none">
                  {stats.totalScore.toLocaleString('vi-VN')}
                </span>
                <span className="text-[10px] font-mono font-bold text-amber-300 uppercase">Điểm</span>
              </div>"""

new_render = """              <div className="flex items-baseline gap-1.5 relative">
                <span className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight leading-none relative">
                  {displayScore.toLocaleString('vi-VN')}
                  {popups.map(p => (
                    <span 
                      key={p.id} 
                      className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 text-sm sm:text-lg font-black font-mono text-yellow-200 animate-float-fade pointer-events-none drop-shadow-lg z-50 whitespace-nowrap"
                    >
                      +{p.diff}
                    </span>
                  ))}
                </span>
                <span className="text-[10px] font-mono font-bold text-amber-300 uppercase">Điểm</span>
              </div>"""

content = content.replace(old_render, new_render)

with open(file_path, "w") as f:
    f.write(content)
print("ScoreDisplay patched")
