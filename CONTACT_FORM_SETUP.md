# Contact Form Setup Guide

## Step-by-Step Instructions

### Option 1: AWS SES SMTP (Recommended for Production)

#### Step 1: Set Up AWS SES

1. **Go to AWS Console**

   - Log in to your AWS account
   - Navigate to **Amazon SES** (Simple Email Service)

2. **Verify Your Email Address**

   - In the SES console, go to **Verified identities**
   - Click **Create identity**
   - Choose **Email address**
   - Enter your email (e.g., `megan@tricitiesdesignco.com`)
   - Click **Create identity**
   - Check your email and click the verification link

3. **Request Production Access** (if needed)

   - By default, SES is in "Sandbox" mode (can only send to verified emails)
   - To send to any email address, request production access:
     - Go to **Account dashboard**
     - Click **Request production access**
     - Fill out the form explaining your use case
     - Wait for approval (usually 24-48 hours)

4. **Create SMTP Credentials**
   - In SES console, go to **SMTP settings**
   - Click **Create SMTP credentials**
   - Give it a name (e.g., "Contact Form")
   - Click **Create**
   - **IMPORTANT**: Download and save the credentials file - you'll need:
     - SMTP Server Name (e.g., `email-smtp.us-east-1.amazonaws.com`)
     - SMTP Username
     - SMTP Password
     - Port (usually 587)

#### Step 2: Create Your .env File

1. **Create a `.env` file** in your project root (same folder as `package.json`)

2. **Add your SMTP credentials** (replace with your actual values):

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-smtp-username-here
SMTP_PASS=your-smtp-password-here
SMTP_SECURE=false
FROM_EMAIL="Tri Cities Design Co. <noreply@tricitiesdesignco.com>"
CONTACT_EMAIL=megan@tricitiesdesignco.com
SEND_CONFIRMATION=false
```

**Important Notes:**

- `SMTP_HOST`: Use the server name from your AWS SES SMTP settings
- `SMTP_USER`: Your SMTP username from AWS
- `SMTP_PASS`: Your SMTP password from AWS
- `FROM_EMAIL`: Should be a verified email in SES (or use your verified email)
- `CONTACT_EMAIL`: Where you want to receive contact form submissions
- `SEND_CONFIRMATION`: Set to `true` if you want users to get a confirmation email

#### Step 3: Install Dependencies

Run this command in your project directory:

```bash
npm install
```

This will install `nodemailer` and `dotenv` packages.

#### Step 4: Test Locally

1. **Start your server:**

   ```bash
   npm start
   ```

2. **Open your website** in a browser (usually `http://localhost:3000`)

3. **Go to the contact page** and fill out the form

4. **Submit the form** and check:
   - You should see a success message
   - Check your email inbox (the `CONTACT_EMAIL` address) for the submission

#### Step 5: Deploy to Production

When deploying to Docker/Cloud:

**For Docker:**

- Set environment variables in your `docker-compose.yml` or Docker run command
- Or use Docker secrets for sensitive values

**For AWS ECS/EC2:**

- Set environment variables in your task definition or EC2 instance
- Or use AWS Systems Manager Parameter Store
- Or use AWS Secrets Manager for passwords

---

### Option 2: Gmail (Easier for Testing/Development)

#### Step 1: Create Gmail App Password

1. **Enable 2-Factor Authentication** on your Gmail account (required for app passwords)

2. **Create App Password:**
   - Go to your Google Account settings
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and "Other (Custom name)"
   - Enter "Contact Form" as the name
   - Click Generate
   - **Copy the 16-character password** (you'll need this)

#### Step 2: Create Your .env File

Create a `.env` file with:

```env
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
FROM_EMAIL="Tri Cities Design Co. <noreply@tricitiesdesignco.com>"
CONTACT_EMAIL=megan@tricitiesdesignco.com
SEND_CONFIRMATION=false
```

#### Step 3: Install and Test

Same as Option 1, Steps 3-4.

**Note:** Gmail has sending limits (500 emails/day for free accounts), so this is best for testing or low-volume sites.

---

### Option 3: Other Email Providers (SendGrid, Mailgun, etc.)

Most email providers offer SMTP access. Use their SMTP settings in your `.env` file:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-api-key-here
SMTP_SECURE=false
FROM_EMAIL="Tri Cities Design Co. <noreply@tricitiesdesignco.com>"
CONTACT_EMAIL=megan@tricitiesdesignco.com
```

---

## Troubleshooting

### "Email service is not configured"

- Make sure your `.env` file exists in the project root
- Check that all required variables are set
- Restart your server after creating/updating `.env`

### "Authentication failed"

- Double-check your SMTP username and password
- For Gmail, make sure you're using an App Password, not your regular password
- For AWS SES, make sure you're using SMTP credentials, not IAM credentials

### "Connection timeout"

- Check your SMTP_HOST and SMTP_PORT are correct
- Make sure your firewall/network allows outbound SMTP connections
- Try port 465 with SMTP_SECURE=true if 587 doesn't work

### Emails not arriving

- Check your spam/junk folder
- Verify the FROM_EMAIL is a verified email in your email service
- Check server logs for error messages
- For AWS SES, make sure you're out of sandbox mode or sending to verified emails

### Testing Tips

- Start with sending to your own verified email address
- Check server console logs for error messages
- Use a test email service like Mailtrap for development

---

## Security Notes

- **Never commit your `.env` file** to git (it's already in `.gitignore`)
- **Use environment variables** in production, not hardcoded values
- **Rotate passwords** periodically
- **Use AWS Secrets Manager** for production deployments

---

## Quick Start Checklist

- [ ] Choose email provider (AWS SES recommended)
- [ ] Set up email service account
- [ ] Get SMTP credentials
- [ ] Create `.env` file with credentials
- [ ] Run `npm install`
- [ ] Test form locally
- [ ] Verify emails are received
- [ ] Set environment variables in production deployment
- [ ] Test form in production

---

Need help? Check the server console logs for detailed error messages!
