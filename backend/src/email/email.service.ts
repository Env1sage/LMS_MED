import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface CredentialEmailData {
  to: string;
  fullName: string;
  email: string;
  tempPassword: string;
  role: 'STUDENT' | 'FACULTY' | 'COLLEGE_ADMIN' | 'PUBLISHER_ADMIN';
  collegeName?: string;
  publisherName?: string;
  loginUrl?: string;
}

export interface BulkEmailResult {
  success: string[];
  failed: { email: string; error: string }[];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      this.logger.warn('Email service not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env');
      this.isConfigured = false;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: port || 587,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    this.isConfigured = true;
    this.logger.log('Email service initialized successfully');
  }

  async sendCredentialEmail(data: CredentialEmailData): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn(`Email not configured. Would send credentials to: ${data.to}`);
      this.logCredentials(data);
      return true; // Return true so the system continues working
    }

    const subject = this.getSubject(data.role);
    const html = this.getCredentialEmailTemplate(data);

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM') || '"Bitflow Medical LMS" <noreply@bitflow.com>',
        to: data.to,
        subject,
        html,
      });

      this.logger.log(`Credentials email sent to: ${data.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${data.to}:`, error);
      throw error;
    }
  }

  async sendBulkCredentialEmails(users: CredentialEmailData[]): Promise<BulkEmailResult> {
    const result: BulkEmailResult = {
      success: [],
      failed: [],
    };

    // Process emails in batches to avoid overwhelming the mail server
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (user) => {
          try {
            await this.sendCredentialEmail(user);
            result.success.push(user.email);
          } catch (error) {
            result.failed.push({
              email: user.email,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        })
      );

      // Small delay between batches
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.logger.log(`Bulk email complete: ${result.success.length} sent, ${result.failed.length} failed`);
    return result;
  }

  private getSubject(role: 'STUDENT' | 'FACULTY' | 'COLLEGE_ADMIN' | 'PUBLISHER_ADMIN'): string {
    switch (role) {
      case 'STUDENT':
        return 'Welcome to Bitflow Medical LMS - Your Student Account';
      case 'FACULTY':
        return 'Welcome to Bitflow Medical LMS - Your Faculty Account';
      case 'COLLEGE_ADMIN':
        return 'Welcome to Bitflow Medical LMS - Your Admin Account';
      case 'PUBLISHER_ADMIN':
        return 'Welcome to Bitflow Medical LMS - Your Publisher Admin Account';
      default:
        return 'Welcome to Bitflow Medical LMS - Your Account Credentials';
    }
  }

  private getCredentialEmailTemplate(data: CredentialEmailData): string {
    const roleLabel = data.role === 'STUDENT' ? 'Student' : data.role === 'FACULTY' ? 'Faculty' : data.role === 'PUBLISHER_ADMIN' ? 'Publisher Administrator' : 'Administrator';
    const loginUrl = data.loginUrl || 'http://localhost:3000/login';
    const organizationText = data.publisherName ? ` for <strong>${data.publisherName}</strong>` : data.collegeName ? ` for <strong>${data.collegeName}</strong>` : '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Login Credentials</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: #c47335; margin: 0; font-size: 28px;">Bitflow Medical LMS</h1>
    <p style="color: #a0a0a0; margin: 10px 0 0 0; font-size: 14px;">Medical Education Platform</p>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <h2 style="color: #1a1a2e; margin-top: 0;">Welcome, ${data.fullName}!</h2>
    
    <p>Your <strong>${roleLabel}</strong> account has been created on the Bitflow Medical LMS platform${organizationText}.</p></p>
    
    <div style="background: #f8f9fa; border-left: 4px solid #c47335; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
      <h3 style="margin: 0 0 15px 0; color: #1a1a2e; font-size: 16px;">Your Login Credentials</h3>
      <p style="margin: 8px 0;"><strong>Email:</strong> <code style="background: #e9ecef; padding: 3px 8px; border-radius: 4px; font-family: monospace;">${data.email}</code></p>
      <p style="margin: 8px 0;"><strong>Temporary Password:</strong> <code style="background: #e9ecef; padding: 3px 8px; border-radius: 4px; font-family: monospace;">${data.tempPassword}</code></p>
    </div>
    
    <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #856404; font-size: 14px;">
        ⚠️ <strong>Important:</strong> For security reasons, please change your password immediately after your first login.
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #c47335 0%, #a85d2a 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Login to Your Account</a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e9ecef; margin: 25px 0;">
    
    <p style="color: #6c757d; font-size: 13px; margin-bottom: 5px;">If you did not expect this email, please contact your institution's administrator.</p>
    <p style="color: #6c757d; font-size: 13px; margin: 0;">Need help? Contact support at <a href="mailto:support@bitflow.com" style="color: #c47335;">support@bitflow.com</a></p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p style="margin: 5px 0;">© ${new Date().getFullYear()} Bitflow Medical LMS. All rights reserved.</p>
    <p style="margin: 5px 0;">This is an automated message. Please do not reply directly to this email.</p>
  </div>
</body>
</html>
    `;
  }

  // For development: log credentials when email is not configured
  private logCredentials(data: CredentialEmailData) {
    this.logger.log('='.repeat(60));
    this.logger.log('EMAIL NOT SENT - Credentials for manual sharing:');
    this.logger.log(`To: ${data.to}`);
    this.logger.log(`Name: ${data.fullName}`);
    this.logger.log(`Email: ${data.email}`);
    this.logger.log(`Password: ${data.tempPassword}`);
    this.logger.log(`Role: ${data.role}`);
    this.logger.log('='.repeat(60));
  }

  // Test email configuration
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      await this.transporter.verify();
      this.logger.log('Email connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('Email connection test failed:', error);
      return false;
    }
  }

  /**
   * Send course assignment notification
   */
  async sendCourseAssignmentEmail(data: {
    to: string;
    studentName: string;
    courseTitle: string;
    dueDate?: Date;
    facultyName: string;
  }): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn(`Email not configured. Would send course assignment to: ${data.to}`);
      return true;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Course Assigned</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: #c47335; margin: 0;">New Course Assigned</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <h2 style="color: #1a1a2e;">Hi ${data.studentName},</h2>
    
    <p>A new course has been assigned to you by ${data.facultyName}.</p>
    
    <div style="background: #f8f9fa; border-left: 4px solid #c47335; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
      <h3 style="margin: 0 0 10px 0; color: #1a1a2e;">Course Details</h3>
      <p style="margin: 5px 0;"><strong>Course:</strong> ${data.courseTitle}</p>
      <p style="margin: 5px 0;"><strong>Instructor:</strong> ${data.facultyName}</p>
      ${data.dueDate ? `<p style="margin: 5px 0;"><strong>Due Date:</strong> ${data.dueDate.toLocaleDateString()}</p>` : ''}
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="http://localhost:3000/student" style="display: inline-block; background: linear-gradient(135deg, #c47335 0%, #a85d2a 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Course</a>
    </div>
    
    <p style="color: #6c757d; font-size: 13px;">Login to your student portal to access course materials and start learning.</p>
  </div>
</body>
</html>
    `;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM') || '"Bitflow Medical LMS" <noreply@bitflow.com>',
        to: data.to,
        subject: `New Course Assigned: ${data.courseTitle}`,
        html,
      });

      this.logger.log(`Course assignment email sent to: ${data.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send course assignment email to ${data.to}:`, error);
      return false;
    }
  }

  /**
   * Send test result published notification
   */
  async sendTestResultEmail(data: {
    to: string;
    studentName: string;
    testTitle: string;
    score: number;
    totalScore: number;
    passed: boolean;
  }): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn(`Email not configured. Would send test result to: ${data.to}`);
      return true;
    }

    const percentage = Math.round((data.score / data.totalScore) * 100);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Test Results Published</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: #c47335; margin: 0;">Test Results Published</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <h2 style="color: #1a1a2e;">Hi ${data.studentName},</h2>
    
    <p>Your test results for "${data.testTitle}" are now available.</p>
    
    <div style="background: ${data.passed ? '#d1fae5' : '#fee2e2'}; border-left: 4px solid ${data.passed ? '#10b981' : '#ef4444'}; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
      <h3 style="margin: 0 0 15px 0; color: #1a1a2e;">Your Results</h3>
      <div style="text-align: center; margin: 20px 0;">
        <div style="font-size: 48px; font-weight: 700; color: ${data.passed ? '#10b981' : '#ef4444'};">${percentage}%</div>
        <div style="font-size: 18px; margin-top: 10px;">${data.score} / ${data.totalScore} points</div>
      </div>
      <p style="text-align: center; font-weight: 600; color: ${data.passed ? '#047857' : '#991b1b'}; margin: 0;">
        ${data.passed ? '✓ Passed' : '✗ Not Passed'}
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="http://localhost:3000/student" style="display: inline-block; background: linear-gradient(135deg, #c47335 0%, #a85d2a 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Detailed Results</a>
    </div>
    
    <p style="color: #6c757d; font-size: 13px;">Login to your student portal to review your answers and explanations.</p>
  </div>
</body>
</html>
    `;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM') || '"Bitflow Medical LMS" <noreply@bitflow.com>',
        to: data.to,
        subject: `Test Results: ${data.testTitle}`,
        html,
      });

      this.logger.log(`Test result email sent to: ${data.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send test result email to ${data.to}:`, error);
      return false;
    }
  }

  /**
   * Send announcement notification
   */
  async sendAnnouncementEmail(data: {
    to: string;
    recipientName: string;
    title: string;
    message: string;
    senderName: string;
  }): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn(`Email not configured. Would send announcement to: ${data.to}`);
      return true;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Announcement</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: #c47335; margin: 0;">📢 New Announcement</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <h2 style="color: #1a1a2e;">Hi ${data.recipientName},</h2>
    
    <p>${data.senderName} has posted a new announcement.</p>
    
    <div style="background: #f8f9fa; border-left: 4px solid #c47335; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
      <h3 style="margin: 0 0 15px 0; color: #1a1a2e;">${data.title}</h3>
      <p style="margin: 0; white-space: pre-wrap;">${data.message}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="http://localhost:3000" style="display: inline-block; background: linear-gradient(135deg, #c47335 0%, #a85d2a 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600;">View in Portal</a>
    </div>
  </div>
</body>
</html>
    `;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM') || '"Bitflow Medical LMS" <noreply@bitflow.com>',
        to: data.to,
        subject: `Announcement: ${data.title}`,
        html,
      });

      this.logger.log(`Announcement email sent to: ${data.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send announcement email to ${data.to}:`, error);
      return false;
    }
  }
}
