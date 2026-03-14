import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const region = process.env.AWS_REGION ?? 'us-east-1';
const modelId = 'global.anthropic.claude-opus-4-6-v1';

const client = new BedrockRuntimeClient({ region });

export interface CouponSuggestion {
  coupon_description: string;
  personalized_message: string;
}

/**
 * Call Bedrock with behavior summary and optional payment failure reason;
 * return coupon_description and personalized_message.
 */
export async function generateCouponContent(
  behaviorSummary: string,
  paymentFailureReason?: string | null
): Promise<CouponSuggestion> {
  const userContent = [
    'You are a marketing assistant. Based on the user\'s session behavior and optional payment failure, suggest a coupon and a short personalized message for email.',
    '',
    'Session behavior:',
    behaviorSummary,
    paymentFailureReason
      ? `\nPayment failure reason: ${paymentFailureReason}`
      : '',
    '',
    'Respond with ONLY a valid JSON object (no markdown, no code block) with exactly these keys:',
    '- coupon_description: string (e.g. "20% off your next order")',
    '- personalized_message: string (1-2 sentences for the email body)',
  ]
    .filter(Boolean)
    .join('\n');

  const response = await client.send(
    new ConverseCommand({
      modelId,
      messages: [
        {
          role: 'user',
          content: [{ text: userContent }],
        },
      ],
      inferenceConfig: {
        maxTokens: 512,
        temperature: 0.7,
      },
    })
  );

  const output = response.output as { message?: { content?: Array<{ text?: string }> } } | undefined;
  if (!output?.message?.content?.length) {
    throw new Error('Bedrock returned no content');
  }

  const textBlock = output.message.content.find((b) => typeof b?.text === 'string');
  const raw = textBlock?.text?.trim() ?? '';

  // Strip possible markdown code fence
  let jsonStr = raw;
  const codeMatch = raw.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
  if (codeMatch) {
    jsonStr = codeMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr) as unknown;
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as CouponSuggestion).coupon_description !== 'string' ||
    typeof (parsed as CouponSuggestion).personalized_message !== 'string'
  ) {
    throw new Error('Bedrock response missing coupon_description or personalized_message');
  }

  return parsed as CouponSuggestion;
}

export interface NegotiatedCouponSuggestion {
  coupon_description: string;
  personalized_message: string;
  reply_message: string;
}

/**
 * Given session behavior, previous coupon, and user's reason, suggest a better coupon
 * plus personalized_message for the new email and reply_message for the in-app reply.
 */
export async function generateNegotiatedCouponContent(
  behaviorSummary: string,
  previousCoupon: { code: string; discountValue: string; personalizedMessage: string | null },
  userReason: string
): Promise<NegotiatedCouponSuggestion> {
  const userContent = [
    'You are a marketing assistant. The user received a coupon but wants a better offer. Use their session behavior, the previous coupon, and their reason to suggest an improved coupon.',
    '',
    'Session behavior:',
    behaviorSummary,
    '',
    'Previous coupon:',
    `Code: ${previousCoupon.code}`,
    `Offer: ${previousCoupon.discountValue}`,
    previousCoupon.personalizedMessage ? `Message: ${previousCoupon.personalizedMessage}` : '',
    '',
    "User's reason for negotiating:",
    userReason,
    '',
    'Respond with ONLY a valid JSON object (no markdown, no code block) with exactly these keys:',
    '- coupon_description: string (e.g. "25% off your next order" – must be better than before)',
    '- personalized_message: string (1-2 sentences for the new coupon email)',
    '- reply_message: string (1-2 short sentences for the in-app reply, e.g. "We\'ve considered your feedback and are happy to offer you a better deal. Check your email for the new coupon.")',
  ]
    .filter(Boolean)
    .join('\n');

  const response = await client.send(
    new ConverseCommand({
      modelId,
      messages: [
        {
          role: 'user',
          content: [{ text: userContent }],
        },
      ],
      inferenceConfig: {
        maxTokens: 512,
        temperature: 0.7,
      },
    })
  );

  const output = response.output as { message?: { content?: Array<{ text?: string }> } } | undefined;
  if (!output?.message?.content?.length) {
    throw new Error('Bedrock returned no content');
  }

  const textBlock = output.message.content.find((b) => typeof b?.text === 'string');
  const raw = textBlock?.text?.trim() ?? '';

  let jsonStr = raw;
  const codeMatch = raw.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
  if (codeMatch) {
    jsonStr = codeMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr) as unknown;
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as NegotiatedCouponSuggestion).coupon_description !== 'string' ||
    typeof (parsed as NegotiatedCouponSuggestion).personalized_message !== 'string' ||
    typeof (parsed as NegotiatedCouponSuggestion).reply_message !== 'string'
  ) {
    throw new Error('Bedrock response missing coupon_description, personalized_message, or reply_message');
  }

  return parsed as NegotiatedCouponSuggestion;
}
