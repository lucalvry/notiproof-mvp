/**
 * Form templates for testimonial collection system
 * Modern, beautiful templates for collecting customer feedback
 */

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  pages: string[];
  questions: Array<{
    id: string;
    text: string;
    type: 'text' | 'textarea' | 'rating' | 'multiple_choice';
    is_required: boolean;
    options?: string[];
  }>;
  settings: {
    negative_feedback_enabled: boolean;
    private_feedback_enabled: boolean;
    consent_required: boolean;
    allow_media_uploads: boolean;
  };
}

export const FORM_TEMPLATES: Record<string, FormTemplate> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Simple rating and message - perfect for getting started',
    pages: ['rating', 'welcome', 'message', 'about_you', 'about_company', 'thank_you'],
    questions: [],
    settings: {
      negative_feedback_enabled: true,
      private_feedback_enabled: false,
      consent_required: true,
      allow_media_uploads: true,
    },
  },
  
  saas: {
    id: 'saas',
    name: 'SaaS Product',
    description: 'Collect detailed product feedback from users',
    pages: ['rating', 'welcome', 'q1', 'q2', 'q3', 'q4', 'message', 'about_you', 'about_company', 'thank_you'],
    questions: [
      {
        id: 'q1',
        text: 'What problem does our product solve for you?',
        type: 'textarea',
        is_required: true,
      },
      {
        id: 'q2',
        text: 'What feature do you use most?',
        type: 'text',
        is_required: true,
      },
      {
        id: 'q3',
        text: 'How likely are you to recommend us to a friend or colleague?',
        type: 'rating',
        is_required: true,
      },
      {
        id: 'q4',
        text: 'What could we improve?',
        type: 'textarea',
        is_required: false,
      },
    ],
    settings: {
      negative_feedback_enabled: true,
      private_feedback_enabled: true,
      consent_required: true,
      allow_media_uploads: true,
    },
  },
  
  sponsor: {
    id: 'sponsor',
    name: 'Event Sponsor',
    description: 'Get feedback from event sponsors and partners',
    pages: ['rating', 'welcome', 'q1', 'q2', 'q3', 'message', 'about_you', 'about_company', 'thank_you'],
    questions: [
      {
        id: 'q1',
        text: 'How was your experience as a sponsor?',
        type: 'textarea',
        is_required: true,
      },
      {
        id: 'q2',
        text: 'What was the most valuable aspect of sponsoring this event?',
        type: 'textarea',
        is_required: true,
      },
      {
        id: 'q3',
        text: 'Would you sponsor this event again?',
        type: 'rating',
        is_required: true,
      },
    ],
    settings: {
      negative_feedback_enabled: false,
      private_feedback_enabled: true,
      consent_required: true,
      allow_media_uploads: true,
    },
  },
  
  course: {
    id: 'course',
    name: 'Course/Training',
    description: 'Collect feedback from students and learners',
    pages: ['rating', 'welcome', 'q1', 'q2', 'q3', 'q4', 'q5', 'message', 'about_you', 'about_company', 'thank_you'],
    questions: [
      {
        id: 'q1',
        text: 'What did you learn from this course?',
        type: 'textarea',
        is_required: true,
      },
      {
        id: 'q2',
        text: 'How would you rate the course content?',
        type: 'rating',
        is_required: true,
      },
      {
        id: 'q3',
        text: 'How would you rate the instructor?',
        type: 'rating',
        is_required: true,
      },
      {
        id: 'q4',
        text: 'What results have you achieved after taking this course?',
        type: 'textarea',
        is_required: false,
      },
      {
        id: 'q5',
        text: 'Would you recommend this course to others?',
        type: 'rating',
        is_required: true,
      },
    ],
    settings: {
      negative_feedback_enabled: true,
      private_feedback_enabled: false,
      consent_required: true,
      allow_media_uploads: true,
    },
  },
};

export const PAGE_DEFINITIONS: Record<string, { name: string; description: string; icon: string }> = {
  rating: { name: 'Rating', description: '5-star rating', icon: '⭐' },
  welcome: { name: 'Welcome', description: 'Welcome message', icon: '👋' },
  negative_feedback: { name: 'Low Rating', description: 'Branch for low ratings', icon: '😞' },
  message: { name: 'Message', description: 'Testimonial message', icon: '💬' },
  private_feedback: { name: 'Private Notes', description: 'Private feedback', icon: '🔒' },
  consent: { name: 'Consent', description: 'Permission checkbox', icon: '✅' },
  about_you: { name: 'About You', description: 'Personal info', icon: '👤' },
  about_company: { name: 'About Company', description: 'Company info', icon: '🏢' },
  reward: { name: 'Reward', description: 'Reward reveal', icon: '🎁' },
  thank_you: { name: 'Thank You', description: 'Final thank you', icon: '🎉' },
  // Support custom question pages
  q1: { name: 'Question 1', description: 'Custom question', icon: '❓' },
  q2: { name: 'Question 2', description: 'Custom question', icon: '❓' },
  q3: { name: 'Question 3', description: 'Custom question', icon: '❓' },
  q4: { name: 'Question 4', description: 'Custom question', icon: '❓' },
  q5: { name: 'Question 5', description: 'Custom question', icon: '❓' },
};
