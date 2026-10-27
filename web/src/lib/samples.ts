import type { SlideSpec } from "@/lib/slides"

// What the Brand page previews with: one of each layout, in the brand colours.
export const SAMPLE_SPEC: SlideSpec = {
  format: "post_portrait",
  title: "Sample set",
  alt: "Sample slides in the brand palette.",
  slides: [
    { layout: "cover", eyebrow: "Mindset", title: "Ask, believe, receive", body: "Three small shifts that changed how I plan my week." },
    { layout: "statement", title: "Your attention is the invitation", body: "What you keep looking at, you keep making room for. Start by noticing what you already return to." },
    {
      layout: "list",
      title: "A calm morning, in 4 steps",
      items: ["Drink water before your phone", "Write one line of gratitude", "Name the one thing that matters today", "Take five slow breaths"],
    },
    { layout: "quote", title: "I am already becoming the person I asked for.", body: "A line I repeat on slow mornings" },
    { layout: "cta", title: "Save this for tomorrow morning", body: "Then tell me which step you will try first.", action: "Comment CALM" },
  ],
}
