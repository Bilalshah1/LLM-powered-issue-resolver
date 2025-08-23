"use client";
import { useState } from "react";



export default function ConnectPage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Cloning...");
    try {
      const res = await fetch("https://llm-poweredissue-resolver.onrender.com/api/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });
      const data = await res.json();
      setStatus(data.message || "Done!");
    } catch (err) {
      setStatus("Error cloning repo.");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-900">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-xl shadow-md flex flex-col gap-6 items-center">
        <h1 className="text-2xl font-bold text-white">Clone a GitHub Repo</h1>
        <input
          type="text"
          value={repoUrl}
          onChange={e => setRepoUrl(e.target.value)}
          placeholder="Enter GitHub repo URL"
          className="px-4 py-2 rounded w-80"
          required
        />
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold"
        >
          Clone Repo
        </button>
        {status && <div className="text-white">{status}</div>}
      </form>
    </main>
  );
}