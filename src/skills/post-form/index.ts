import axios, { AxiosResponse } from 'axios';

import { AppError } from '../../errors';

interface FormFields {
  [key: string]: string | number | boolean;
}

export class PostFormSkill {
  async postForm(url: string, formFields: FormFields): Promise<AxiosResponse> {
    try {
      const params = new URLSearchParams();
      Object.entries(formFields).forEach(([key, value]) => {
        params.append(key, String(value));
      });

      const response = await axios.post(url, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new AppError('Form submission failed', {
          status: error.response?.status,
          error: error.message
        });
      }
      throw new AppError('Failed to submit form', {
        error: (error as Error).message
      });
    }
  }
}
