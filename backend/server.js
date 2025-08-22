const express = require('express');
const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { QdrantClient } = require('@qdrant/js-client-rest');
const axios = require('axios');
const crypto = require('crypto');
const Groq = require('groq-sdk');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const qdrant = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
  checkCompatibility: false
});

const groq = new Groq({
  apiKey: GROQ_API_KEY,
});

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

console.log('Qdrant URL:', QDRANT_URL);
console.log('Qdrant API Key:', QDRANT_API_KEY ? 'Present' : 'Not present');
console.log('Groq API Key:', GROQ_API_KEY ? 'Present' : 'Not present');
console.log('Gemini API Key:', GEMINI_API_KEY ? 'Present' : 'Not present');
console.log("CORS enabled for all origins");

const CHUNK_CONFIG = {
  maxChunkSize: 1000,
  overlapSize: 100,
  minChunkSize: 50
};

function shouldEmbedFile(filePath) {
  const skipExtensions = ['.git', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.pdf', '.zip', '.tar', '.gz', '.exe', '.dll', '.bin', '.so', '.dylib'];
  const skipDirs = ['.git', 'node_modules', '.vscode', '.idea', 'target', 'build', 'dist', 'bin', '__pycache__'];

  for (const skipDir of skipDirs) {
    if (filePath.includes(`${path.sep}${skipDir}${path.sep}`) || filePath.includes(`${path.sep}${skipDir}`)) {
      return false;
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  return !skipExtensions.includes(ext);
}


function extractNotebookContent(notebookContent) {
  try {
    const notebook = JSON.parse(notebookContent);
    let extractedText = '';

    if (notebook.cells && Array.isArray(notebook.cells)) {
      notebook.cells.forEach((cell, index) => {
        if (cell.cell_type === 'markdown' && cell.source) {
          extractedText += `\n## Markdown Cell ${index + 1}\n`;
          if (Array.isArray(cell.source)) {
            extractedText += cell.source.join('');
          } else {
            extractedText += cell.source;
          }
          extractedText += '\n';
        } else if (cell.cell_type === 'code' && cell.source) {
          extractedText += `\n## Code Cell ${index + 1}\n`;
          if (Array.isArray(cell.source)) {
            extractedText += cell.source.join('');
          } else {
            extractedText += cell.source;
          }
          extractedText += '\n';

          if (cell.outputs && Array.isArray(cell.outputs)) {
            cell.outputs.forEach((output, outputIndex) => {
              if (output.text || output.data) {
                extractedText += `\n### Output ${outputIndex + 1}\n`;
                if (output.text) {
                  if (Array.isArray(output.text)) {
                    extractedText += output.text.join('');
                  } else {
                    extractedText += output.text;
                  }
                }
                if (output.data && output.data['text/plain']) {
                  if (Array.isArray(output.data['text/plain'])) {
                    extractedText += output.data['text/plain'].join('');
                  } else {
                    extractedText += output.data['text/plain'];
                  }
                }
                extractedText += '\n';
              }
            });
          }
        }
      });
    }

    return extractedText.trim();
  } catch (error) {
    console.error('Error parsing notebook:', error.message);
    return null;
  }
}

function cleanTextForEmbedding(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  let cleaned = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.trim();

  if (cleaned.length < 10 || cleaned.length > 50000) {
    return null;
  }

  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return cleaned;
}

function getAllFiles(dir, files = []) {
  console.log(`Reading directory: ${dir}`);
  try {
    fs.readdirSync(dir).forEach(file => {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        getAllFiles(fullPath, files);
      } else {
        if (shouldEmbedFile(fullPath)) {
          files.push(fullPath);
        }
      }
    });
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  return files;
}

function chunkText(text, filePath) {
  const chunks = [];
  const fileExtension = path.extname(filePath).toLowerCase();

  const isCodeFile = ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs'].includes(fileExtension);

  let splitPatterns;
  if (isCodeFile) {
    splitPatterns = [
      /\n\s*(?:function|class|def|public|private|protected|interface|struct|enum)\s+/,
      /\n\s*\/\*[\s\S]*?\*\/\s*\n/,
      /\n\s*\/\/.*\n/,
      /\n\s*\n\s*\n/,
      /\n\s*\}\s*\n/,
      /\.\s+/,
      /\n/
    ];
  } else {
    splitPatterns = [
      /\n\s*\n/,
      /\.\s+/,
      /!\s+/,
      /\?\s+/,
      /;\s+/,
      /\n/
    ];
  }

  let remainingText = text;
  let currentChunk = '';
  let chunkIndex = 0;

  while (remainingText.length > 0) {
    if (remainingText.length <= CHUNK_CONFIG.maxChunkSize) {
      if (currentChunk) {
        chunks.push({
          text: currentChunk + remainingText,
          index: chunkIndex,
          startChar: text.length - remainingText.length - currentChunk.length,
          endChar: text.length
        });
      } else if (remainingText.trim().length >= CHUNK_CONFIG.minChunkSize) {
        chunks.push({
          text: remainingText,
          index: chunkIndex,
          startChar: text.length - remainingText.length,
          endChar: text.length
        });
      }
      break;
    }

    let bestSplit = -1;
    let bestSplitPattern = null;

    for (const pattern of splitPatterns) {
      const matches = Array.from(remainingText.matchAll(new RegExp(pattern, 'g')));
      for (const match of matches) {
        const splitPoint = match.index + match[0].length;
        if (splitPoint <= CHUNK_CONFIG.maxChunkSize - currentChunk.length && splitPoint > bestSplit) {
          bestSplit = splitPoint;
          bestSplitPattern = pattern;
        }
      }
    }

    if (bestSplit === -1) {
      bestSplit = CHUNK_CONFIG.maxChunkSize - currentChunk.length;
    }

    const chunkText = currentChunk + remainingText.substring(0, bestSplit);

    if (chunkText.trim().length >= CHUNK_CONFIG.minChunkSize) {
      chunks.push({
        text: chunkText,
        index: chunkIndex,
        startChar: text.length - remainingText.length - currentChunk.length,
        endChar: text.length - remainingText.length + bestSplit
      });
      chunkIndex++;
    }

    const nextStart = Math.max(0, bestSplit - CHUNK_CONFIG.overlapSize);
    currentChunk = remainingText.substring(nextStart, bestSplit);
    remainingText = remainingText.substring(bestSplit);
  }

  return chunks;
}

async function getGeminiEmbedding(text) {
  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Gemini embedding error:', error.message);
    throw error;
  }
}

async function embedFiles(repoName, repoPath) {
  const COLLECTION_NAME = "your_collection";

  try {
    try {
      await qdrant.getCollection(COLLECTION_NAME);
      console.log(`Collection '${COLLECTION_NAME}' exists`);
    } catch (error) {
      console.log(`Creating collection '${COLLECTION_NAME}'...`);
      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 768,
          distance: "Cosine"
        }
      });
      console.log(`Collection '${COLLECTION_NAME}' created successfully`);
    }
  } catch (collectionError) {
    console.error('Error with collection setup:', collectionError.message);
    throw collectionError;
  }

  const files = getAllFiles(repoPath);
  console.log(`Found ${files.length} files to embed`);

  let successCount = 0;
  let errorCount = 0;
  let totalChunks = 0;

  for (const filePath of files) {
    try {
      let rawContent = fs.readFileSync(filePath, "utf-8");
      console.log(`Processing file: ${filePath}`);

      let processedContent = rawContent;
      if (path.extname(filePath).toLowerCase() === '.ipynb') {
        console.log(`Extracting content from Jupyter notebook: ${filePath}`);
        processedContent = extractNotebookContent(rawContent);
        if (!processedContent) {
          console.log(`Failed to extract content from notebook: ${filePath}`);
          errorCount++;
          continue;
        }
      }

      const cleanedContent = cleanTextForEmbedding(processedContent);
      if (!cleanedContent) {
        console.log(`Skipping file with invalid content: ${filePath}`);
        continue;
      }

      const chunks = chunkText(cleanedContent, filePath);
      console.log(`Created ${chunks.length} chunks for ${filePath}`);
      totalChunks += chunks.length;

      if (chunks.length === 0) {
        console.log(`No chunks created for: ${filePath}`);
        continue;
      }

      for (const chunk of chunks) {
        try {
          const chunkText = cleanTextForEmbedding(chunk.text);
          if (!chunkText) {
            console.log(`Skipping invalid chunk ${chunk.index} in ${filePath}`);
            continue;
          }

          await new Promise(resolve => setTimeout(resolve, 100));

          const vector = await getGeminiEmbedding(chunkText);

          if (!Array.isArray(vector) || vector.length === 0) {
            console.error('Invalid vector received for chunk', chunk.index, 'of', filePath);
            errorCount++;
            continue;
          }

          const hash = crypto.createHash('sha256').update(`${filePath}_chunk_${chunk.index}`).digest('hex');
          const chunkId = parseInt(hash.slice(0, 12), 16);

          try {
            const upsertResult = await qdrant.upsert(COLLECTION_NAME, {
              points: [
                {
                  id: chunkId,
                  vector: vector,
                  payload: {
                    filePath: filePath,
                    repoName: repoName,
                    fileName: path.basename(filePath),
                    fileExtension: path.extname(filePath),
                    chunkIndex: chunk.index,
                    startChar: chunk.startChar,
                    endChar: chunk.endChar,
                    chunkText: chunkText,
                    totalChunks: chunks.length,
                    fileSize: rawContent.length,
                    chunkSize: chunkText.length,
                    isNotebook: path.extname(filePath).toLowerCase() === '.ipynb',
                    timestamp: new Date().toISOString()
                  },
                },
              ],
            });

          } catch (error) {
            console.log('Upsert error occurred');
          }

          console.log(`Successfully embedded chunk ${chunk.index} of ${path.basename(filePath)} (${chunkText.length} chars)`);
          successCount++;

        } catch (chunkError) {
          console.error(`Error processing chunk ${chunk.index} of ${filePath}:`);
          console.error('Error details:', chunkError.message);
          errorCount++;
          continue;
        }
      }

    } catch (fileError) {
      console.error(`Error processing file ${filePath}:`, fileError.message);
      errorCount++;
      continue;
    }
  }

  console.log(`Embedding complete: ${successCount} chunks successful, ${errorCount} errors, ${totalChunks} total chunks from ${files.length} files`);
  return { successCount, errorCount, totalFiles: files.length, totalChunks };
}

app.post('/api/search', async (req, res) => {
  try {
    const { query, limit = 10, repoName = null } = req.body;

    if (!query) {
      return res.status(400).json({ message: "Query is required" });
    }

    const COLLECTION_NAME = "your_collection";

    const queryVector = await getGeminiEmbedding(query);

    if (!queryVector) {
      return res.status(500).json({ message: "Failed to get query embedding" });
    }

    let filter = {};
    if (repoName) {
      filter = {
        must: [
          {
            key: "repoName",
            match: {
              value: repoName
            }
          }
        ]
      };
    }

    const searchResults = await qdrant.search(COLLECTION_NAME, {
      vector: queryVector,
      limit: limit,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      with_payload: true,
      with_vector: false
    });

    res.json({
      query: query,
      results: searchResults.map(result => ({
        score: result.score,
        filePath: result.payload.filePath,
        fileName: result.payload.fileName,
        repoName: result.payload.repoName,
        chunkIndex: result.payload.chunkIndex,
        chunkText: result.payload.chunkText,
        startChar: result.payload.startChar,
        endChar: result.payload.endChar,
        totalChunks: result.payload.totalChunks,
        fileExtension: result.payload.fileExtension
      }))
    });

  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({
      message: "Search failed",
      error: error.message
    });
  }
});

app.post('/api/clone', async (req, res) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl || typeof repoUrl !== "string") {
      return res.status(400).json({ message: "Invalid repo URL." });
    }

    const repoName = repoUrl.split("/").pop()?.replace(".git", "") || "repo";
    const targetDir = path.join(__dirname, "cloned_repos", repoName);

    fs.mkdirSync(path.dirname(targetDir), { recursive: true });

    const git = simpleGit();
    await git.clone(repoUrl, targetDir);
    console.log(`Repository cloned to: ${targetDir}`);

    try {
      const embedResult = await embedFiles(repoName, targetDir);
      console.log(`Files embedded successfully for repo: ${repoName}`);
      res.json({
        message: `Repo cloned to ${targetDir} and embeddings created successfully`,
        repoName,
        targetDir,
        embedStats: embedResult
      });
    } catch (embedError) {
      console.log("Error embedding files:", embedError.message);
      res.json({
        message: `Repo cloned to ${targetDir} but embedding failed`,
        repoName,
        targetDir,
        embedError: embedError.message
      });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to clone repo.", error: err.message });
  }
});

app.post('/api/embed', async (req, res) => {
  try {
    const { repoName } = req.body;
    if (!repoName) {
      return res.status(400).json({ message: "Repository name is required" });
    }

    const repoPath = path.join(__dirname, "cloned_repos", repoName);

    if (!fs.existsSync(repoPath)) {
      return res.status(404).json({ message: `Repository ${repoName} not found` });
    }

    const embedResult = await embedFiles(repoName, repoPath);
    res.json({
      message: "Embeddings stored in Qdrant successfully",
      embedStats: embedResult
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error embedding files", error: err.message });
  }
});

app.get('/api/test-qdrant', async (req, res) => {
  try {
    const collections = await qdrant.getCollections();
    res.json({
      status: 'Connected to Qdrant successfully',
      collections: collections.collections,
      qdrantUrl: QDRANT_URL
    });
  } catch (error) {
    res.status(500).json({
      status: 'Failed to connect to Qdrant',
      error: error.message,
      qdrantUrl: QDRANT_URL
    });
  }
});

app.get('/api/collection-info/:collectionName', async (req, res) => {
  try {
    const collectionName = req.params.collectionName;
    const info = await qdrant.getCollection(collectionName);
    const count = await qdrant.count(collectionName);

    res.json({
      collection: collectionName,
      info: info,
      pointCount: count.count
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      collection: req.params.collectionName
    });
  }
});

app.get('/api/collection-info', async (req, res) => {
  try {
    const collectionName = 'your_collection';
    const info = await qdrant.getCollection(collectionName);
    const count = await qdrant.count(collectionName);

    res.json({
      collection: collectionName,
      info: info,
      pointCount: count.count
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      collection: collectionName
    });
  }
});

app.post('/api/test-embedding', async (req, res) => {
  try {
    const { text = "Hello world, this is a test." } = req.body;

    console.log(`Testing Gemini embedding with text: "${text.substring(0, 100)}..."`);

    const vector = await getGeminiEmbedding(text);

    res.json({
      success: true,
      textLength: text.length,
      vectorLength: vector ? vector.length : 0,
      vectorSample: vector ? vector.slice(0, 5) : null,
      provider: 'Google Gemini'
    });

  } catch (error) {
    console.error('Gemini embedding test failed:', error.message);
    res.status(500).json({
      message: "Gemini embedding test failed",
      error: error.message,
      stack: error.stack
    });
  }
});

app.get('/api/test-gemini', async (req, res) => {
  try {
    const testVector = await getGeminiEmbedding("This is a test message for Gemini embeddings");

    res.json({
      status: 'Gemini API is working',
      vectorLength: testVector.length,
      vectorSample: testVector.slice(0, 5),
      hasApiKey: !!GEMINI_API_KEY
    });

  } catch (error) {
    res.status(500).json({
      status: 'Gemini API connection failed',
      error: error.message,
      suggestion: 'Make sure GEMINI_API_KEY is set in environment variables'
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

app.post('/api/solve-issue', async (req, res) => {
  try {
    const { issue, repoName = null, topK = 5 } = req.body;

    if (!issue || typeof issue !== 'string') {
      return res.status(400).json({ message: "Issue description is required" });
    }

    const COLLECTION_NAME = "your_collection";

    const issueVector = await getGeminiEmbedding(issue);
    if (!issueVector) {
      return res.status(500).json({ message: "Failed to get embedding for issue" });
    }

    let filter = {};
    if (repoName) {
      filter = {
        must: [{ key: "repoName", match: { value: repoName } }]
      };
    }

    const searchResults = await qdrant.search(COLLECTION_NAME, {
      vector: issueVector,
      limit: topK,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      with_payload: true,
      with_vector: false
    });

    const topChunks = searchResults.map(r => r.payload.chunkText).join("\n\n---\n\n");

    if (!topChunks) {
      return res.status(404).json({ message: "No relevant context found in Qdrant" });
    }

    try {
      const solutionResponse = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert developer. Help solve coding issues based on provided context."
          },
          {
            role: "user",
            content: `A user has posted the following issue:\n\n"${issue}"\n\nBased on the following relevant code/documentation context:\n\n${topChunks}\n\nGenerate a helpful, concise solution or steps to fix this issue.`
          }
        ],
        model: "llama3-8b-8192",
        temperature: 0.1,
        max_tokens: 1024
      });

      const responseText = solutionResponse.choices[0]?.message?.content;

      res.json({
        issue,
        solution: responseText?.trim() || "No solution generated.",
        contextUsed: searchResults.map(r => ({
          score: r.score,
          filePath: r.payload.filePath,
          chunkText: r.payload.chunkText
        }))
      });

    } catch (groqError) {
      console.error("Groq API error:", groqError.message);
      res.status(500).json({ message: "Failed to generate solution", error: groqError.message });
    }

  } catch (err) {
    console.error('Error solving issue:', err.message);
    res.status(500).json({ message: "Failed to solve issue", error: err.message });
  }
});

app.post('/send-email', async (req, res) => {
  const { name, email, message } = req.body;

  const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
    }
  });

  const mailOptions = {
    from: email,
    to: process.env.GMAIL_USER,
    subject: `New Contact Form Message from ${name}`,
    text: `Email: ${email}\n\nMessage:\n${message}`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Message sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`Health check available at: http://localhost:${PORT}/health`);
});