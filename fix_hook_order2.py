import re

file_path = "src/components/ScoreDisplay.tsx"
with open(file_path, "r") as f:
    content = f.read()

old_effect = """  useEffect(() => {
    if (stats?.totalScore !== undefined && stats.totalScore !== prevScoreRef.current) {
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
  }, [stats?.totalScore]);"""

new_effect = """  useEffect(() => {
    if (stats && stats.totalScore !== prevScoreRef.current) {
      // First load behavior: jump straight to score if prevScore is 0 and we haven't rendered yet
      // Actually counting up from 0 on first load is a fun effect!
      
      const endScore = stats.totalScore;
      
      if (endScore > prevScoreRef.current && prevScoreRef.current > 0) {
         const diff = endScore - prevScoreRef.current;
         const id = Date.now() + Math.random();
         setPopups(prev => [...prev, { id, diff }]);
         setTimeout(() => {
            setPopups(prev => prev.filter(p => p.id !== id));
         }, 1500);
      }
      
      const start = prevScoreRef.current;
      const end = endScore;
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
      
      prevScoreRef.current = endScore;
    }
  }, [stats?.totalScore]);"""

content = content.replace(old_effect, new_effect)

with open(file_path, "w") as f:
    f.write(content)
print("Effect fixed")
