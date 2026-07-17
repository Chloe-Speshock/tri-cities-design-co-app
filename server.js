const express = require('express');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const {
	SecretsManagerClient,
	GetSecretValueCommand,
} = require('@aws-sdk/client-secrets-manager');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure AWS S3 client
const s3Client = new S3Client({
	region: 'us-east-1',
});

// Configure AWS Secrets Manager client
const secretsClient = new SecretsManagerClient({
	region: process.env.AWS_REGION || 'us-east-1',
});

// Configure AWS SES client
const sesClient = new SESClient({
	region: process.env.AWS_REGION || 'us-east-1',
});

// Cache for secrets
let cachedSecrets = null;
let cacheExpiry = null;
const CACHE_TTL = 5 * 60 * 1000; // Cache for 5 minutes

async function getEmailConfig() {
	// Return cached secrets if still valid
	if (cachedSecrets && cacheExpiry && Date.now() < cacheExpiry) {
		return cachedSecrets;
	}

	const secretName = process.env.EMAIL_SECRET_NAME;

	if (!secretName) {
		throw new Error('EMAIL_SECRET_NAME environment variable is not set');
	}

	try {
		console.log(`Fetching secrets from AWS Secrets Manager: ${secretName}`);

		const response = await secretsClient.send(
			new GetSecretValueCommand({
				SecretId: secretName,
			}),
		);

		const secrets = JSON.parse(response.SecretString);

		// Validate required fields for SES
		if (!secrets.FROM_EMAIL || !secrets.CONTACT_EMAIL) {
			throw new Error('Missing required email configuration in secrets');
		}

		// Cache the secrets
		cachedSecrets = secrets;
		cacheExpiry = Date.now() + CACHE_TTL;

		console.log(
			'Successfully fetched email configuration from Secrets Manager',
		);
		return secrets;
	} catch (error) {
		console.error('Error fetching secrets from AWS Secrets Manager:', error);
		throw new Error(`Failed to fetch email configuration: ${error.message}`);
	}
}

// Serve static files with no caching for development
app.use(
	express.static('src', {
		setHeaders: (res, path) => {
			// Disable caching for HTML, CSS, and JS files
			if (
				path.endsWith('.html') ||
				path.endsWith('.css') ||
				path.endsWith('.js')
			) {
				res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
				res.setHeader('Pragma', 'no-cache');
				res.setHeader('Expires', '0');
			}
		},
	}),
);

// Endpoint to serve any image from S3
app.get('/api/image/*', async (req, res) => {
	try {
		// Get the full path after /api/image/
		const key = req.params[0];
		console.log(`Fetching image: ${key}`);

		const command = new GetObjectCommand({
			Bucket: 'tri-cities-design-co-assets-bucket-449655118647',
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
			'Content-Type': response.ContentType,
			'Content-Length': response.ContentLength,
			'Cache-Control': 'no-cache, no-store, must-revalidate', // Disable caching for debugging
		});

		res.send(buffer);
	} catch (error) {
		console.error('Error fetching image from S3:', error);
		res.status(404).send('Image not found');
	}
});

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
	try {
		const { name, email, phone, message } = req.body;

		// Validate required fields
		if (!name || !email || !message) {
			return res.status(400).json({
				success: false,
				error: 'Please fill in all required fields (name, email, and message).',
			});
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return res.status(400).json({
				success: false,
				error: 'Please provide a valid email address.',
			});
		}

		// Get email configuration from Secrets Manager
		const config = await getEmailConfig();

		// Create email content
		const emailSubject = `New Contact Form Submission from ${name}`;

		const emailHtml = `
		      <h2>New Contact Form Submission</h2>
		      <p><strong>Name:</strong> ${name}</p>
		      <p><strong>Email:</strong> ${email}</p>
		      ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
		      <p><strong>Message:</strong></p>
		      <p>${message.replace(/\n/g, '<br>')}</p>
		    `;

		const emailText = `
		New Contact Form Submission

		Name: ${name}
		Email: ${email}
		${phone ? `Phone: ${phone}` : ''}

		Message:
		${message}
		    `;

		// Send email using AWS SES
		const sendEmailCommand = new SendEmailCommand({
			Source: config.FROM_EMAIL,
			Destination: {
				ToAddresses: [config.CONTACT_EMAIL],
			},
			ReplyToAddresses: [email],
			Message: {
				Subject: {
					Data: emailSubject,
					Charset: 'UTF-8',
				},
				Body: {
					Text: {
						Data: emailText,
						Charset: 'UTF-8',
					},
					Html: {
						Data: emailHtml,
						Charset: 'UTF-8',
					},
				},
			},
		});

		// Log the outgoing SES parameters (without exposing secrets)
		try {
			const sendResponse = await sesClient.send(sendEmailCommand);
			console.log('SES send response metadata:', sendResponse && sendResponse.$metadata ? sendResponse.$metadata : sendResponse);
		} catch (sesError) {
			console.error('SES send error name:', sesError && sesError.name);
			console.error('SES send error message:', sesError && sesError.message);
			console.error('SES send full error:', sesError);
			throw sesError;
		}

		// Send confirmation email to the user (optional)
		// if (config.SEND_CONFIRMATION === 'true') {
		// 	const confirmationCommand = new SendEmailCommand({
		// 		Source: config.FROM_EMAIL,
		// 		Destination: {
		// 			ToAddresses: [email],
		// 		},
		// 		Message: {
		// 			Subject: {
		// 				Data: 'Thank you for contacting Tri-Cities Design Co.',
		// 				Charset: 'UTF-8',
		// 			},
		// 			Body: {
		// 				Text: {
		// 					Data: `Dear ${name},\n\nThank you for reaching out to Tri-Cities Design Co. We have received your message and will get back to you soon.\n\nBest regards,\nTri-Cities Design Co.`,
		// 					Charset: 'UTF-8',
		// 				},
		// 				Html: {
		// 					Data: `
		//             <h2>Thank you for contacting Tri-Cities Design Co.</h2>
		//             <p>Dear ${name},</p>
		//             <p>Thank you for reaching out to Tri-Cities Design Co. We have received your message and will get back to you soon.</p>
		//             <p>Best regards,<br>Tri-Cities Design Co.</p>
		//           `,
		// 					Charset: 'UTF-8',
		// 				},
		// 			},
		// 		},
		// 	});

		// 	try {
		// 		await sesClient.send(confirmationCommand);
		// 	} catch (confirmationError) {
		// 		console.error('Error sending confirmation email:', confirmationError);
		// 		// Don't fail the request if confirmation email fails
		// 	}
		// }

		res.json({
			success: true,
			message: "Thank you for your message! We'll get back to you soon.",
		});
	} catch (error) {
		console.error('Error processing contact form:', error);

		res.status(500).json({
			success: false,
			error:
				'Sorry, there was an error sending your message. Please try again later or contact us directly.',
		});
	}
});

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
