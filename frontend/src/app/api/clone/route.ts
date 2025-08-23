import { NextResponse } from "next/server";
import simpleGit from "simple-git";
import path from "path";
import fs from "fs";

export async function POST(req: Request) {
  try {
    const { repoUrl } = await req.json();
    if (!repoUrl || typeof repoUrl !== "string") {
      return NextResponse.json({ message: "Invalid repo URL." }, { status: 400 });
    }

    const repoName = repoUrl.split("/").pop()?.replace(".git", "") || "repo";
    const targetDir = path.join(process.cwd(), "cloned_repos", repoName);

    // Ensure the directory exists
    fs.mkdirSync(path.dirname(targetDir), { recursive: true });

    const git = simpleGit();
    await git.clone(repoUrl, targetDir);

    return NextResponse.json({ message: `Repo cloned to ${targetDir}` });
  } catch (err: any) {
    return NextResponse.json({ message: "Failed to clone repo.", error: err.message }, { status: 500 });
  }
}