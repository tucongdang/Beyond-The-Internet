import re

file_path = "src/components/ScoreDisplay.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Remove the early return from its current position
content = content.replace("  if (!stats) return null;", "")

# Add it after all hooks
effect_block = """      prevScoreRef.current = stats.totalScore;
    }
  }, [stats?.totalScore]);

  if (!stats) return null;"""
content = content.replace("""      prevScoreRef.current = stats.totalScore;
    }
  }, [stats.totalScore]);""", effect_block)

# Fix the hook dependency to use stats?.totalScore
content = content.replace("  }, [stats.totalScore]);", "  }, [stats?.totalScore]);")
content = content.replace("if (stats.totalScore !==", "if (stats?.totalScore !== undefined && stats.totalScore !==")

with open(file_path, "w") as f:
    f.write(content)
print("Hook order fixed")
