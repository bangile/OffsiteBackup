import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { lastDayOfMonth, isFriday, subDays, format, isSameDay } from "date-fns";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper to find the last Friday of a given date's month
  function getLastFridayOfMonth(date: Date): Date {
    let d = lastDayOfMonth(date);
    while (!isFriday(d)) {
      d = subDays(d, 1);
    }
    return d;
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/config", (req, res) => {
    const today = new Date();
    const lastFriday = getLastFridayOfMonth(today);
    res.json({
      today: format(today, "yyyy-MM-dd"),
      lastFriday: format(lastFriday, "yyyy-MM-dd"),
      isReminderDay: isSameDay(today, lastFriday)
    });
  });

  app.post("/api/reminders/trigger", (req, res) => {
    // In a real app, this would send an actual email via Resend/SendGrid
    // Here we'll simulate success and log it
    console.log("SIMULATED EMAIL: Monthly reminder sent to team - Bring offsite backup hard drives to office!");
    res.json({ 
      success: true, 
      message: "Reminder simulation triggered. Check server logs.",
      timestamp: new Date().toISOString()
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Check for reminder every hour
  setInterval(() => {
    const now = new Date();
    const lastFriday = getLastFridayOfMonth(now);
    // If it's the last Friday and it's 9 AM, send reminder
    if (isSameDay(now, lastFriday) && now.getHours() === 9) {
      console.log("CRON JOB: Automatically sending monthly backup reminder...");
      // triggerEmailFunction();
    }
  }, 1000 * 60 * 60);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
