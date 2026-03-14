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
