/**
 * Push notification service using Firebase Cloud Messaging
 * 
 * Prerequisites:
 * - Firebase project set up via Firebase CLI
 * - Environment variables configured:
 *   - FIREBASE_PROJECT_ID
 *   - FIREBASE_CLIENT_EMAIL  
 *   - FIREBASE_PRIVATE_KEY
 */

import { initializeApp, cert, getApps, App } from 'npm:firebase-admin@12.0.0/app';
import { getMessaging, Message } from 'npm:firebase-admin@12.0.0/messaging';

let firebaseApp: App | null = null;

/**
 * Initialize Firebase Admin SDK (lazy initialization)
 */
function initializeFirebase(): App {
  if (firebaseApp) {
    return firebaseApp;
  }

  // Check if already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseApp = existingApps[0];
    return firebaseApp;
  }

  const projectId = Deno.env.get('FIREBASE_PROJECT_ID');
  const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL');
  const privateKey = Deno.env.get('FIREBASE_PRIVATE_KEY');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase credentials not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.'
    );
  }

  // Initialize Firebase Admin
  firebaseApp = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
    }),
  });

  return firebaseApp;
}

export interface PushNotificationParams {
  fcmToken?: string;
  apnsToken?: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  clickAction?: string;
}

export interface SendNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a push notification via Firebase Cloud Messaging
 * 
 * @param params - Notification parameters
 * @returns Result with success status and message ID or error
 */
export async function sendPushNotification(
  params: PushNotificationParams
): Promise<SendNotificationResult> {
  const { fcmToken, apnsToken, title, body, data, imageUrl, clickAction } = params;

  // Need at least one token
  if (!fcmToken && !apnsToken) {
    return {
      success: false,
      error: 'No device token provided (fcmToken or apnsToken required)',
    };
  }

  try {
    // Initialize Firebase if not already done
    const app = initializeFirebase();
    const messaging = getMessaging(app);

    // Build notification message
    const message: Message = {
      notification: {
        title,
        body,
        ...(imageUrl && { imageUrl }),
      },
      data: data || {},
      // Use FCM token if available, otherwise APNS token
      token: fcmToken || apnsToken!,
    };

    // Add platform-specific config
    if (fcmToken) {
      // Android/Web specific configuration
      message.android = {
        notification: {
          clickAction: clickAction || '/',
          icon: 'notification_icon',
          color: '#10b981', // Green-500
        },
        priority: 'high',
      };
      message.webpush = {
        notification: {
          icon: '/logo.png',
          badge: '/logo.png',
          requireInteraction: false,
        },
        fcmOptions: {
          link: clickAction || '/',
        },
      };
    } else if (apnsToken) {
      // iOS specific configuration
      message.apns = {
        payload: {
          aps: {
            alert: {
              title,
              body,
            },
            sound: 'default',
            badge: 1,
          },
        },
        fcmOptions: {
          imageUrl: imageUrl,
        },
      };
    }

    // Send the message
    const messageId = await messaging.send(message);

    console.log('Push notification sent successfully:', messageId);
    return {
      success: true,
      messageId,
    };
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send push notifications to multiple devices
 * 
 * @param tokens - Array of FCM tokens
 * @param params - Notification parameters (without token)
 * @returns Array of results for each token
 */
export async function sendMulticastNotification(
  tokens: string[],
  params: Omit<PushNotificationParams, 'fcmToken' | 'apnsToken'>
): Promise<SendNotificationResult[]> {
  const results: SendNotificationResult[] = [];

  for (const token of tokens) {
    const result = await sendPushNotification({
      ...params,
      fcmToken: token,
    });
    results.push(result);
  }

  return results;
}

/**
 * Validate if a Firebase token is valid format
 * 
 * @param token - FCM or APNS token
 * @returns true if token appears valid
 */
export function isValidToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }
  // FCM tokens are typically 152+ characters
  // APNS tokens are 64 hex characters
  return token.length >= 64;
}
