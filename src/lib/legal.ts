import { router } from 'expo-router';
import { Alert } from 'react-native';

import { readAiScanConsent, writeAiScanConsent } from './storage';

// The policy is built into the app (/privacy-policy), so it works offline and
// before the public page exists.
export const openPrivacyPolicy = async () => {
  router.push('/privacy-policy');
};

// Bills are read by a third-party AI service (Amazon Textract + Bedrock in the
// US), so App Review guideline 5.1.2 needs the user told and agreeing before the
// first upload. Resolves true once agreed; the answer is remembered per device.
export async function ensureAiScanConsent(): Promise<boolean> {
  if (await readAiScanConsent()) return true;

  const agreed = await new Promise<boolean>((resolve) => {
    Alert.alert(
      'Bills are read by AI',
      'To fill in the details for you, the bill photo or file you choose is sent to Amazon Web Services in the United States, where Amazon Textract and an AI model on Amazon Bedrock read it. AWS does not use your bills to train AI models.',
      [
        { text: 'Privacy policy', onPress: () => void openPrivacyPolicy().then(() => resolve(false)) },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Agree', style: 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });

  if (agreed) await writeAiScanConsent().catch(() => undefined);
  return agreed;
}
