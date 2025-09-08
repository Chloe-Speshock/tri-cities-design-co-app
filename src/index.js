// Tri Cities Design Co. - Simple JavaScript Foundation

// AWS Configuration
const AWS_CONFIG = {
	region: 'us-east-1',
	bucket: 'tri-cities-design-co-assets-bucket-449655118647',
};

// Wait for the page to load
document.addEventListener('DOMContentLoaded', function () {
	console.log('Tri Cities Design Co. website loaded!');

	// Initialize basic functionality
	setupNavigation();
	setupPortfolioGallery();
	setupContactForm();
});

// Simple navigation setup
function setupNavigation() {
	const navToggle = document.querySelector('.nav-toggle');
	const navMenu = document.querySelector('.nav-menu');

	if (navToggle && navMenu) {
		navToggle.addEventListener('click', function () {
			navMenu.classList.toggle('active');
		});
	}
}

// Portfolio gallery functionality
function setupPortfolioGallery() {
	const portfolioItems = document.querySelectorAll('.portfolio-item');

	// Add click functionality to portfolio items
	portfolioItems.forEach((item) => {
		item.addEventListener('click', function () {
			// Simple lightbox effect
			showPortfolioItem(this);
		});
	});
}

// Simple portfolio display
function showPortfolioItem(item) {
	const title =
		item.querySelector('.portfolio-title')?.textContent || 'Portfolio Item';
	const description = item.querySelector('p')?.textContent || '';

	// Create a simple modal
	const modal = document.createElement('div');
	modal.className = 'portfolio-modal';
	modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h3>${title}</h3>
            <p>${description}</p>
        </div>
    `;

	document.body.appendChild(modal);

	// Close modal functionality
	const closeBtn = modal.querySelector('.close-modal');
	closeBtn.addEventListener('click', () => {
		document.body.removeChild(modal);
	});

	// Close on outside click
	modal.addEventListener('click', (e) => {
		if (e.target === modal) {
			document.body.removeChild(modal);
		}
	});
}

// Contact form handling
function setupContactForm() {
	const contactForm = document.querySelector('#contact-form');

	if (contactForm) {
		contactForm.addEventListener('submit', function (e) {
			e.preventDefault();

			// Get form data
			const name = this.querySelector('#name').value;
			const email = this.querySelector('#email').value;
			const message = this.querySelector('#message').value;

			// Simple validation
			if (!name || !email || !message) {
				alert('Please fill in all fields.');
				return;
			}

			// For now, just show a success message
			alert("Thank you for your message! We'll get back to you soon.");
			this.reset();
		});
	}
}

// Smooth scrolling for navigation links
function setupSmoothScrolling() {
	const navLinks = document.querySelectorAll('a[href^="#"]');

	navLinks.forEach((link) => {
		link.addEventListener('click', function (e) {
			e.preventDefault();

			const targetId = this.getAttribute('href');
			const targetSection = document.querySelector(targetId);

			if (targetSection) {
				targetSection.scrollIntoView({
					behavior: 'smooth',
				});
			}
		});
	});
}

// Generic function to load any image from S3
async function loadS3Image(elementId, s3Key, fallbackAlt = 'Image') {
	try {
		console.log(`Attempting to load S3 image: ${s3Key}`);

		// Configure AWS SDK
		AWS.config.update({
			region: AWS_CONFIG.region,
			// Credentials will be loaded from ~/.aws/credentials when running locally
			// or from IAM roles when deployed
		});

		console.log('AWS SDK configured, creating S3 client...');
		const s3 = new AWS.S3();

		// Get signed URL for the image (valid for 1 hour)
		const params = {
			Bucket: AWS_CONFIG.bucket,
			Key: s3Key,
			Expires: 3600, // 1 hour
		};

		const signedUrl = await s3.getSignedUrlPromise('getObject', params);

		// Update the image source
		const imgElement = document.getElementById(elementId);
		if (imgElement) {
			imgElement.src = signedUrl;
			imgElement.onerror = function () {
				console.error(`Failed to load image from S3: ${s3Key}`);
				// Fallback handling
				imgElement.alt = fallbackAlt;
			};
		}
	} catch (error) {
		console.error(`Error loading image from S3 (${s3Key}):`, error);
		// Fallback handling
		const imgElement = document.getElementById(elementId);
		if (imgElement) {
			imgElement.alt = fallbackAlt;
		}
	}
}

// Load company logo from S3
async function loadCompanyLogo() {
	console.log('Loading company logo from S3...');
	await loadS3Image(
		'company-logo',
		'company-logo.png',
		'Tri Cities Design Co. Logo'
	);
}
