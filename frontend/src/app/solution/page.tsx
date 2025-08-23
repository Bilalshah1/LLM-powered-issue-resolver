'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Solution() {
    const [solution, setSolution] = useState<string | null>(null);
    const [context, setContext] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        // Retrieve solution data from localStorage (set after submitting the issue)
        const solutionData = localStorage.getItem("solutionData");
        if (solutionData) {
            const parsed = JSON.parse(solutionData);
            setSolution(parsed.solution);
            setContext(parsed.contextUsed || []);
        } else {
            setError("No solution found. Please submit an issue first.");
        }
    }, []);

    return (
        <main className="min-h-screen bg-gradient-to-br from-[#0a0a0a] to-[#23272f] flex flex-col items-center justify-center px-4 py-12">
            <div className="bg-[#18181b] rounded-lg shadow-lg p-8 max-w-2xl w-full">
                <h1 className="text-2xl font-bold mb-4 text-white">Proposed Solution</h1>
                {error && <div className="text-red-500 mb-4">{error}</div>}
                {solution ? (
                    <>
                        <div className="mb-6 text-white whitespace-pre-line">{solution}</div>
                        {context.length > 0 && (
                            <div>
                                <h2 className="text-lg font-semibold mb-2 text-white">Context Used:</h2>
                                <ul className="list-disc pl-5 text-gray-300">
                                    {context.map((ctx, idx) => (
                                        <li key={idx}>
                                            <span className="font-mono text-xs">{ctx.filePath}</span>
                                            <div className="text-xs">{ctx.chunkText?.slice(0, 200)}...</div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                ) : (
                    !error && <div className="text-gray-400">Loading solution...</div>
                )}
                <button
                    className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    onClick={() => router.push("/issue")}
                >
                    Propose Another Issue
                </button>
            </div>
        </main>
    );
}