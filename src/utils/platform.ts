export type Platform =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "twitter"
  | "generic";

export const PLATFORMS: Record<Platform, { name: string; color: string }> = {
  youtube: { name: "YouTube", color: "#FF0000" },
  tiktok: { name: "TikTok", color: "#00f2ff" },
  instagram: { name: "Instagram", color: "#E1306C" },
  twitter: { name: "Twitter / X", color: "#1DA1F2" },
  generic: { name: "Media Link", color: "#8B5CF6" },
};

export const detectPlatform = (url: string): Platform => {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("tiktok.com")) return "tiktok";
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("twitter.com") || url.includes("x.com")) return "twitter";
  return "generic";
};
