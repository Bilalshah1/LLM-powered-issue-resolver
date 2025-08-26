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
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

async function embedFiles(repoName, repoPath) {
  const COLLECTION_NAME = "your_collection";

  await qdrant.getCollection(COLLECTION_NAME);
  console.log(`Collection '${COLLECTION_NAME}' exists`);

  await qdrant.createCollection(COLLECTION_NAME, {
    vectors: {
      size: 768,
      distance: "Cosine"
    }
  });
  console.log(`Collection '${COLLECTION_NAME}' created successfully`);

  await qdrant.createPayloadIndex(COLLECTION_NAME, { field_name: "repoName", field_schema: "keyword" });

  const files = getAllFiles(repoPath);
  console.log(`Found ${files.length} files to embed`);

  let successCount = 0;
  let errorCount = 0;
  let totalChunks = 0;

  for (const filePath of files) {
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

      console.log(`Successfully embedded chunk ${chunk.index} of ${path.basename(filePath)} (${chunkText.length} chars)`);
      successCount++;
    }
  }

  console.log(`Embedding complete: ${successCount} chunks successful, ${errorCount} errors, ${totalChunks} total chunks from ${files.length} files`);
  return { successCount, errorCount, totalFiles: files.length, totalChunks };
}



app.get('/api/repos', async (req, res) => {
  try {
    const clonedReposPath = path.join(__dirname, 'cloned_repos');

    if (!fs.existsSync(clonedReposPath)) {
      return res.json({ repos: [] });
    }

    const repos = [];
    const repoNames = fs.readdirSync(clonedReposPath);

    for (const repoName of repoNames) {
      const repoPath = path.join(clonedReposPath, repoName);

      if (fs.statSync(repoPath).isDirectory()) {
        const stats = fs.statSync(repoPath);
        const clonedDate = stats.birthtime.toISOString().split('T')[0];

        repos.push({
          id: repoName.hashCode ? repoName.hashCode() : Math.random(),
          name: repoName,
          owner: "unknown", // You can extract from git config if needed
          full_name: repoName,
          clonedAt: clonedDate,
          status: "active",
          path: repoPath
        });
      }
    }

    // Sort by most recently cloned
    repos.sort((a, b) => new Date(b.clonedAt) - new Date(a.clonedAt));

    res.json({ repos });

  } catch (error) {
    console.error('Error fetching repos:', error);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});


















app.post('/api/search', async (req, res) => {
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

  await qdrant.createPayloadIndex(COLLECTION_NAME, { field_name: "repoName", field_schema: "keyword" });

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
});

app.post('/api/clone', async (req, res) => {
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

  const embedResult = await embedFiles(repoName, targetDir);
  console.log(`Files embedded successfully for repo: ${repoName}`);
  res.json({
    message: `Repo cloned to ${targetDir} and embeddings created successfully`,
    repoName,
    targetDir,
    embedStats: embedResult
  });
});

app.post('/api/embed', async (req, res) => {
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
});

app.get('/api/test-qdrant', async (req, res) => {
  const collections = await qdrant.getCollections();
  res.json({
    status: 'Connected to Qdrant successfully',
    collections: collections.collections,
    qdrantUrl: QDRANT_URL
  });
});

app.get('/api/collection-info/:collectionName', async (req, res) => {
  const collectionName = req.params.collectionName;
  const info = await qdrant.getCollection(collectionName);
  const count = await qdrant.count(collectionName);

  res.json({
    collection: collectionName,
    info: info,
    pointCount: count.count
  });
});

app.get('/api/collection-info', async (req, res) => {
  const collectionName = 'your_collection';
  const info = await qdrant.getCollection(collectionName);
  const count = await qdrant.count(collectionName);

  res.json({
    collection: collectionName,
    info: info,
    pointCount: count.count
  });
});

app.post('/api/test-embedding', async (req, res) => {
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
});

app.get('/api/test-gemini', async (req, res) => {
  const testVector = await getGeminiEmbedding("This is a test message for Gemini embeddings");

  res.json({
    status: 'Gemini API is working',
    vectorLength: testVector.length,
    vectorSample: testVector.slice(0, 5),
    hasApiKey: !!GEMINI_API_KEY
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

app.post('/api/solve-issue', async (req, res) => {
  const { issue, repoName = null, topK = 5 } = req.body;

  if (!issue || typeof issue !== 'string') {
    return res.status(400).json({ message: "Issue description is required" });
  }

  const COLLECTION_NAME = "your_collection";

  const issueVector = await getGeminiEmbedding(issue);
  if (!issueVector) {
    return res.status(500).json({ message: "Failed to get embedding for issue" });
  }
  console.log("Issue embedding obtained", issueVector.slice(0, 5));

  let filter = {};
  if (repoName) {
    filter = {
      must: [{ key: "repoName", match: { value: repoName } }]
    };
  }

  if (repoName) {
    filter = {
      must: [{ key: "repoName", match: { value: repoName } }]
    };
  }

  console.log("🔎 Embedding length:", issueVector.length);

  await qdrant.createPayloadIndex(COLLECTION_NAME, { field_name: "repoName", field_schema: "keyword" });

  const searchPayload = {
    vector: issueVector,
    limit: topK,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
    with_payload: true,
    with_vector: false
  };

  console.log("🔎 Qdrant search payload:", JSON.stringify(searchPayload, null, 2));

  const searchResults = await qdrant.search(COLLECTION_NAME, searchPayload);

  console.log("✅ Raw Qdrant results:", JSON.stringify(searchResults, null, 2));
  console.log(`✅ ${searchResults.length} results found`);

  const topChunks = searchResults.map(r => r.payload?.chunkText).join("\n\n---\n\n");

  if (!topChunks) {
    return res.status(404).json({ message: "No relevant context found in Qdrant" });
  }

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
  console.log(responseText);

  res.json({
    issue,
    solution: responseText?.trim() || "No solution generated.",
    contextUsed: searchResults.map(r => ({
      score: r.score,
      filePath: r.payload.filePath,
      chunkText: r.payload.chunkText
    }))
  });
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

  await transporter.sendMail(mailOptions);
  res.status(200).json({ message: 'Message sent successfully' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`Health check available at: http://localhost:${PORT}/health`);
});