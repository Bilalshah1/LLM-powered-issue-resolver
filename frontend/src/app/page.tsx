import Link from "next/link";
import Image from "next/image";
import Navbar from "./Components/Navbar";
import About from "./about/page";
export default function Home() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-[#0a0a0a] to-[#23272f] text-white flex flex-col items-center justify-center px-4 py-12 font-sans">
        <div className="max-w-2xl w-full text-center space-y-8">
          <div className="flex flex-col items-center gap-2">
            <span className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Opensource issue resolver
            </span>
            <span className="text-lg md:text-xl text-gray-300 font-medium">
              Codebase-Aware GitHub Issue Resolver
            </span>
          </div>
          <div className="flex flex-col md:flex-row gap-4 justify-center items-center mt-6">
            <Link
              href="/signup"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-full shadow-lg text-lg transition-all duration-200"
            >
              Sign up
            </Link>
            <Link
              href="/signin"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-full shadow-lg text-lg transition-all duration-200"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
