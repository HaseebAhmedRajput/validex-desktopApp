
import { request, ApiResponse } from './apiClient';
import { Test } from '../types';

export async function joinTest(testCode: number, lat: number, lng: number): Promise<ApiResponse<Test>> {
  return request<Test>('/users/desktop/joinTest', {
    method: 'POST',
    body: JSON.stringify({ testCode, lat, lng }),
  });
}

export async function updateProgress(
  testId: string,
  mcqsAns: Array<{ questionId: string; selectedOption: number }>,
  theoreticalAns: Array<{ questionId: string; ans: string }>,
  startTime: string,
  violation: number
): Promise<ApiResponse<string>> {
  return request<string>('/users/auth/desktop/testProgress', {
    method: 'POST',
    body: JSON.stringify({ testId, mcqsAns, theoreticalAns, startTime, violation }),
  });
}

export async function submitTest(
  testId: string,
  mcqsAns: Array<{ questionId: string; selectedOption: number }>,
  theoreticalAns: Array<{ questionId: string; ans: string }>,
  startTime: string,
  submitTime: string,
  violation: number
): Promise<ApiResponse<string>> {
  return request<string>('/users/desktop/submitTest', {
    method: 'POST',
    body: JSON.stringify({ testId, mcqsAns, theoreticalAns, startTime, submitTime, violation }),
  });
}
