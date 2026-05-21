"use server";

import fs from "fs/promises";
import path from "path";

export async function getAvatars() {
  try {
    const avatarsDir = path.join(process.cwd(), "public", "avatars");
    const files = await fs.readdir(avatarsDir);
    // Filter only image files
    return files.filter(file => /\.(png|jpe?g|gif|svg|webp)$/i.test(file));
  } catch (error) {
    console.error("Failed to read avatars directory:", error);
    return [];
  }
}
