// The privacy policy shown in the app (/privacy-policy). Keep it identical to the
// public page entered in App Store Connect:
// https://sites.google.com/view/kashmemo-privacy-policy-ios/home

export const PRIVACY_LAST_UPDATED = '18 November 2026';
export const PRIVACY_COMPANY = 'Vcloudmaster';
export const PRIVACY_CONTACT = {
  name: 'VidyaSagar Barabati',
  email: 'vidyasagar.b@vcloudmaster.com',
};

// A paragraph is plain text, or a bold lead-in followed by text.
export type PolicyParagraph = string | { lead: string; text: string };
export type PolicySection = { heading?: string; paragraphs: PolicyParagraph[] };

export const PRIVACY_POLICY: PolicySection[] = [
  {
    paragraphs: [
      `KashMemo is a petty cash and expense app provided by ${PRIVACY_COMPANY} ("we", "us"). Organisations use it to let their staff request cash, upload bills, and get approvals and repayments. This policy explains what personal data the app collects, why, and the choices you have.`,
      {
        lead: 'Who controls your data.',
        text: 'Your employer or organisation ("your organisation") decides to use KashMemo and adds you as a user. For the data your organisation enters about you and your expenses, your organisation is the data fiduciary, and we process it on its behalf. For the account of the person who registers an organisation (the CEO), we are the data fiduciary.',
      },
    ],
  },
  {
    heading: 'What we collect',
    paragraphs: [
      {
        lead: 'Account details:',
        text: 'your name, work email address, phone number (if added), job title, role, department and organisation.',
      },
      {
        lead: 'Login details:',
        text: "your password, stored only in encrypted (hashed) form, and a sign-in token kept in your device's secure storage.",
      },
      {
        lead: 'Bills and receipts:',
        text: 'photos or files of bills you take with the camera or choose from your photos, and the details read from them, such as shop name, bill number, date, amounts, tax amounts and shop tax number.',
      },
      {
        lead: 'Expense and cash request records:',
        text: 'amounts, purposes, categories, approvals, rejections, comments, repayments and their dates.',
      },
      {
        lead: 'Organisation records:',
        text: "departments, budgets and the people in them, entered by your organisation's administrators.",
      },
      'We do not collect your location, contacts, or advertising identifiers. We do not use analytics or advertising tools, and we do not track you across other apps or websites.',
      {
        lead: 'Camera and photos.',
        text: 'The app asks to use your camera only when you choose to photograph a bill. To pick an existing photo or file, it uses the iOS photo picker or the Files picker, so it reads only the items you choose and never your whole photo library. The app does not use the microphone.',
      },
    ],
  },
  {
    heading: 'How we use your data',
    paragraphs: [
      'To run the service: sign you in, show your requests and bills, and send them to the right people for approval.',
      'To read bills automatically so you type less. You can check and correct every detail before sending.',
      'To send service emails, such as login details, verification codes, password resets and updates on your requests.',
      'To keep the service secure, prevent duplicate or fraudulent bills, and meet legal and accounting duties.',
      'We do not sell your personal data and do not use it for advertising.',
    ],
  },
  {
    heading: 'Who can see your data',
    paragraphs: [
      'People in your organisation, according to their role: for example, your manager, finance team, HR and CEO can see the requests and bills that need their approval or reporting.',
      'Service providers that host and run KashMemo for us: Amazon Web Services (AWS), which provides hosting (Mumbai, India), email sending through Amazon SES (Mumbai, India), and bill reading through Amazon Textract and an AI model on Amazon Bedrock (N. Virginia, United States). AWS may use the data only to provide these services to us and does not use bill data to train AI models.',
      'Authorities, when the law requires it.',
      {
        lead: 'Where data is stored.',
        text: 'Your account, expense and organisation data is stored on Amazon Web Services (AWS) servers in Mumbai, India. Bill photos and files are read and stored by a bill reading service hosted on AWS in the United States (N. Virginia), so they are transferred outside India for that purpose. All data sent between the app and our servers is encrypted in transit (HTTPS).',
      },
      {
        lead: 'How long we keep it.',
        text: 'We keep your data while your organisation uses KashMemo. Bills and expense records may be kept for 8 years after they are settled, because tax and accounting rules require it. When your organisation closes its account, we delete or anonymise its data within 90 days, except where the law requires us to keep it.',
      },
      {
        lead: 'Your rights.',
        text: 'You can ask to see, correct or delete your personal data, or withdraw consent. Some records may be kept as described above. If you are not satisfied with our answer, you can complain to the Data Protection Board of India.',
      },
    ],
  },
  {
    heading: 'Deleting your account',
    paragraphs: [
      'Only the CEO can create an account in the app (Register your organisation). Staff accounts are created and removed by the organisation. The CEO can delete the organisation and all its accounts from Menu → Delete organisation.',
      {
        lead: "If you are your organisation's CEO:",
        text: 'open the app, go to Menu → Delete organisation, and enter the code we email you. This deletes the organisation, every staff account, and its departments, budgets, bills and cash requests.',
      },
      {
        lead: 'If your organisation created your account:',
        text: `ask your organisation's administrator to remove you, or email ${PRIVACY_CONTACT.email} from your work email address with the subject "Delete my account". We will confirm with your organisation and complete the request within 30 days.`,
      },
      'Bills and expense records your organisation must keep for tax law are kept for 8 years without your name, then deleted.',
      {
        lead: 'Children.',
        text: 'KashMemo is a workplace app for adults. It is not meant for anyone under 18, and we do not knowingly collect data from children.',
      },
      {
        lead: 'Security.',
        text: 'We use encryption in transit, hashed passwords, secure storage on your device and role-based access. No system is completely secure, so please keep your password private.',
      },
      {
        lead: 'Changes.',
        text: 'If we change this policy, we will update the date above and tell you in the app or by email when the change is significant.',
      },
    ],
  },
];
