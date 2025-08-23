"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function Issue() {
    const [issue, setIssue] = useState("");
    const [error, setError] = useState("");
    const [repoName, setRepoName] = useState("");
    const router = useRouter();
    const topK = 5;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIssue(e.target.value);

        setError(""); // Clear error on input change
        if (e.target.value.length > 100) {
            setError("Issue description must be less than 100 characters.");
        }
        if (e.target.value.length === 0) {
            setError("Issue description cannot be empty.");
        }
        if (e.target.value.length > 0 && e.target.value.length <= 100) {
            setError(""); // Clear error if input is valid
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        try {
            // Simulate issue submission
            const response = await axios.post("https://llm-poweredissue-resolver.onrender.com/api/solve-issue", { issue, repoName, topK });
            console.log("response:", response);
            console.log("Issue submitted successfully:", response.data);
            localStorage.setItem("solutionData", JSON.stringify(response.data));
            router.push("/solution");
        } catch (err) {
            setError("Failed to submit the issue. Please try again.");
            console.error("Issue submission error:", err);
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-[#0a0a0a] to-[#23272f] flex flex-col items-center justify-center px-4 py-12">
            <div className="max-w-md w-full bg-[#181c23] rounded-2xl shadow-xl border border-[#23272f] p-8 space-y-6">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white text-center mb-2">
                    Report an Issue
                </h1>
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {error && <div className="text-red-400 text-center text-sm">{error}</div>}
                    <div>
                        <label className="block text-gray-200 font-medium mb-1" htmlFor="issue">Issue</label>
                        <input
                            id="issue"
                            type="text"
                            name="issue"
                            value={issue}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 rounded-lg bg-[#23272f] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder=""
                        />
                    </div>
                    <div>
                        <label className="block text-gray-200 font-medium mb-1" htmlFor="repoName">Repository Name</label>
                        <input
                            id="repoName"
                            type="text"
                            name="repoName"
                            value={repoName}
                            onChange={(e) => setRepoName(e.target.value)}
                            required
                            className="w-full px-4 py-2 rounded-lg bg-[#23272f] border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder=""
                        />

                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                    >
                        Submit Issue
                    </button>
                </form>
                <p className="text-gray-400 text-sm text-center mt-4">
                    By submitting an issue, you agree to our <Link href="/terms" className="text-blue-500 hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-blue-500 hover:underline">Privacy Policy</Link>.
                </p>
            </div>
        </main>
    );


}