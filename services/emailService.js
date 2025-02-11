const nodemailer = require("nodemailer");

// Configure transporter for Hostinger SMTP
const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true, // Use SSL
  auth: {
    user: "hello@arbilo.com",
    pass: "Readyio@986",
  },
});
const sendWelcomeEmail = async (name, email) => {
  try {
    const mailOptions = {
      from: '"Arbilo" <hello@arbilo.com>', // Sender email
      to: email,
      subject: "Welcome to Our Service",
      html: `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome Email</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8f8f8; font-family: Arial, sans-serif; color: #333;">
        <table width="100%" bgcolor="#f8f8f8" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">
                    <table width="600" bgcolor="#ffffff" cellpadding="0" cellspacing="0" style="border-radius: 8px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);">
                        <tr>
                            <td align="center" bgcolor="#222222" style="padding: 20px;">
                                <img src="https://yourcompany.com/logo.png" alt="Company Logo" width="120" style="display: block;">
                            </td>
                        </tr>
                        <tr>
                            <td align="center" bgcolor="#222222" style="padding: 20px; color: #ffffff; font-size: 24px; font-weight: bold;">
                                Welcome to Our Service, ${name}!
                            </td>
                        </tr>
                        <tr>
                            <td align="center" style="padding: 30px; color: #444; font-size: 16px;">
                                <p>Dear <strong>${name}</strong>,</p>
                                <p>We’re excited to have you onboard! Get ready to explore premium features and maximize your experience.</p>
                                <p>Click the button below to get started:</p>
                                <a href="https://arbilo.com/login" style="display: inline-block; background-color: #222222; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-size: 16px; margin-top: 20px; font-weight: bold;">Get Started</a>
                            </td>
                        </tr>
                        <tr>
                            <td align="center" bgcolor="#eeeeee" style="padding: 15px; font-size: 14px; color: #555;">
                                <p><strong>Stay Connected</strong></p>
                                <table cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td><a href="https://facebook.com/yourpage"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" width="30" alt="Facebook"></a></td>
                                        <td width="15"></td>
                                        <td><a href="https://twitter.com/yourpage"><img src="https://cdn-icons-png.flaticon.com/512/733/733579.png" width="30" alt="Twitter"></a></td>
                                        <td width="15"></td>
                                        <td><a href="https://instagram.com/yourpage"><img src="https://cdn-icons-png.flaticon.com/512/733/733558.png" width="30" alt="Instagram"></a></td>
                                    </tr>
                                </table>
                                <p style="margin-top: 15px;">&copy; 2025 Your Company. All rights reserved.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>`,
    };

    await transporter.sendMail(mailOptions);
    console.log("Welcome email sent successfully");
  } catch (err) {
    console.error("Error sending welcome email:", err);
    throw new Error("Failed to send welcome email");
  }
};

// Function to send password change notification email
const sendPasswordChangeNotification = async (name, email) => {
  try {
    const mailOptions = {
      from: '"Arbilo" <hello@arbilo.com>', // Sender email
      to: email,
      subject: "Your Password Has Been Changed Successfully",
      html: `
        <p>Dear ${name},</p>

        <p>We wanted to inform you that your password has been successfully changed. If you made this change, no further action is required.</p>

        <p>However, if you did not request this change, please reset your password immediately and contact our support team at <a href="mailto:hello@arbilo.com">hello@arbilo.com</a> for assistance.</p>

        <p>For security, we recommend regularly updating your password and keeping your account details safe.</p>

        <p>Best Regards,<br>The Arbilo Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Password change notification email sent successfully");
  } catch (err) {
    console.error("Error sending password change notification email:", err);
    throw new Error("Failed to send password change notification email");
  }
};

const sendCredentialsEmail = async (name, email, password) => {
  try {
    await transporter.sendMail({
      from: `"Arbilo" <hello@arbilo.com>`, // Correct sender format
      to: `"${name}" <${email}>`, // Ensure both name and email are included properly
      subject: "Your Arbilo Premium Access is Ready! 🎉",
      html: `
        <p>Dear ${name},</p>
        <p>Your Arbilo-Arbitrage Premium Plan access is now fully set up! You can log in and start exploring real-time arbitrage signals right away.</p>

        <p><strong>Your Login Credentials:</strong></p>
        <ul>
          <li>🔹 <strong>Platform:</strong> <a href="https://arbilo.com">https://arbilo.com</a></li>
          <li>🔹 <strong>Email:</strong> ${email}</li>
          <li>🔹 <strong>Password:</strong> ${password}</li>
        </ul>

        <p>📌 For security reasons, we recommend changing your password after logging in.</p>

        <p><strong>Need Help?</strong></p>
        <p>If you have any questions, reach out to us at <a href="mailto:hello@arbilo.com">hello@arbilo.com</a>.</p>

        <p>Thank you for joining Arbilo! Wishing you success in your trading journey. 🚀</p>

        <p>Best Regards,<br>The Arbilo Team</p>
      `,
    });
  } catch (err) {
    console.error("Error sending credentials email:", err);
    throw err;
  }
};





const sendContactUsNotification = async (name, email, message) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 465,
      secure: true, // Use SSL
      auth: {
        user: "hello@arbilo.com", // Must be a verified email from your domain
        pass: "Readyio@986",
      },
    });

    const adminEmail = "hello@arbilo.com"; // Admin's receiving email
    const subject = "New Contact Us Message";
    const text = `
      You have received a new message from the Contact Us form:

      Name: ${name}
      Email: ${email}
      Message: ${message}
    `;

    await transporter.sendMail({
      from: `"Arbilo Contact Form" <hello@arbilo.com>`, // Use your verified domain email
      to: adminEmail,
      subject: subject,
      text: text,
      replyTo: email, // Allows the admin to reply to the user directly
    });

    console.log("Contact Us notification sent successfully!");
  } catch (err) {
    console.error("Error sending Contact Us notification:", err);
  }
};


module.exports = {
  sendWelcomeEmail,
  sendPasswordChangeNotification,
  sendCredentialsEmail,
  sendContactUsNotification,
};
