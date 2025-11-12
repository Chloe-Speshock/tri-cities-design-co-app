const express = require("express");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Configure AWS S3 client
const s3Client = new S3Client({
  region: "us-east-1",
});

// Serve static files with no caching for development
app.use(express.static("src", {
  setHeaders: (res, path) => {
    // Disable caching for HTML, CSS, and JS files
    if (path.endsWith('.html') || path.endsWith('.css') || path.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Endpoint to serve any image from S3
app.get("/api/image/*", async (req, res) => {
  try {
    // Get the full path after /api/image/
    const key = req.params[0];
    console.log(`Fetching image: ${key}`);

    const command = new GetObjectCommand({
      Bucket: "tri-cities-design-co-assets-bucket-449655118647",
      Key: key,
    });

    const response = await s3Client.send(command);
    console.log(`Successfully fetched ${key}, size: ${response.ContentLength}`);

    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Set appropriate headers
    res.set({
      "Content-Type": response.ContentType,
      "Content-Length": response.ContentLength,
      "Cache-Control": "no-cache, no-store, must-revalidate", // Disable caching for debugging
    });

    res.send(buffer);
  } catch (error) {
    console.error("Error fetching image from S3:", error);
    res.status(404).send("Image not found");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
