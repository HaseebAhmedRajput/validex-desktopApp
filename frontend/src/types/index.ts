 

export interface MCQOption {
  id: number;
  text: string;
}

export interface MCQQuestion {
  _id: string;
  question: string;
  options: MCQOption[];
  points?: number;
}

export interface TheoreticalQuestion {
  _id: string;
  question: string;
  points?: number;
}

export interface RawQuestion {
  _id: string;
  questionType: 'mcq' | 'theory';
  questionText: string;
  options?: string[] | MCQOption[];
  marks?: number;
}

export interface Test {
  _id: string;
  title: string;
  // duration: number; // in minutes
  endTime?: string; // ISO DateTime
  mcqs: MCQQuestion[];
  theoreticalQuestion: TheoreticalQuestion[];
  questions?: RawQuestion[];
  code?: number;
  testCode?: number;
  lat?: number;
  lng?: number;
  radius?: number;
  isCameraMonitoring?: boolean;
  allowedLocation?: {
    lat: number;
    lng: number;
    radius?: number;
  };

}

export interface Attempt {
  _id: string;
  testId: string;
  mcqsAns: Array<{ questionId: string; selectedOption: number }>;
  theoreticalAns: Array<{ questionId: string; ans: string }>;
  startTime: string;
  submitTime?: string;
  violation: number;
  isCameraMonitoring?: boolean;
}
