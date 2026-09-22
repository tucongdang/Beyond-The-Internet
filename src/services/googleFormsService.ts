import { driveService } from './driveService';

export interface GoogleDriveFormItem {
  id: string;
  name: string;
  webViewLink?: string;
  createdTime?: string;
  modifiedTime?: string;
}

export interface GoogleFormQuestionSummary {
  itemId: string;
  title: string;
  type: string;
  totalAnswers: number;
  sampleAnswers: string[];
  optionsDistribution?: Record<string, number>;
  averageRating?: number;
}

export interface GoogleFormAnalytics {
  formId: string;
  title: string;
  responderUri: string;
  totalResponses: number;
  lastResponseTime?: string;
  questions: GoogleFormQuestionSummary[];
  recentSubmissions: Array<{
    responseId: string;
    submittedAt: string;
    answers: Record<string, string>;
  }>;
}

export interface EditableFormQuestionItem {
  id: string; // client temporary ID
  itemId?: string; // Google Form itemId if already in Form
  title: string;
  description?: string;
  questionType: 'RADIO' | 'CHECKBOX' | 'SCALE' | 'TEXT' | 'PARAGRAPH';
  required: boolean;
  options: string[]; // for RADIO / CHECKBOX
  scaleLow?: number;
  scaleHigh?: number;
  scaleLowLabel?: string;
  scaleHighLabel?: string;
}

export interface EditableFormStructure {
  formId: string;
  title: string;
  description: string;
  responderUri: string;
  editUri: string;
  items: EditableFormQuestionItem[];
}

/**
 * Extracts raw Form ID from various Google Forms URL formats:
 * - https://docs.google.com/forms/d/e/1FAIpQLSc.../viewform
 * - https://docs.google.com/forms/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * - Raw form ID
 */
export function extractFormIdFromUrl(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // Pattern 1: /forms/d/e/<formId>/...
  const matchE = trimmed.match(/\/forms\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (matchE && matchE[1]) return matchE[1];

  // Pattern 2: /forms/d/<formId>/...
  const matchD = trimmed.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD && matchD[1]) return matchD[1];

  // Pattern 3: If it looks like a clean form ID (alphanumeric, underscores, hyphens, 15+ chars)
  if (/^[a-zA-Z0-9_-]{15,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export const googleFormsService = {
  /**
   * Check if Google Workspace access token is currently available
   */
  isAuthenticated(): boolean {
    return driveService.isConnected();
  },

  /**
   * Authenticate and request Google Forms & Drive scopes
   */
  async authenticate(interactive: boolean = true): Promise<string | null> {
    return driveService.authenticate(interactive);
  },

  /**
   * List all Google Forms available in user's Google Drive
   */
  async listForms(): Promise<GoogleDriveFormItem[]> {
    const token = await driveService.authenticate(false);
    if (!token) {
      throw new Error('Chưa đăng nhập Google Workspace. Vui lòng kết nối tài khoản Google trước.');
    }

    const res = await fetch('/api/google/drive/forms', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      let msg = errText;
      try {
        const parsed = JSON.parse(errText);
        msg = parsed.error?.message || parsed.error || errText;
      } catch (_) {}
      throw new Error(`Lỗi tải danh sách Google Forms: ${msg}`);
    }

    const data = await res.json();
    return data.files || [];
  },

  /**
   * 1-Click creation of a complete, professional BTI 2026 audience survey on Google Forms
   */
  async createDefaultSurveyForm(options?: {
    eventTitle?: string;
    giftNote?: string;
  }): Promise<{
    formId: string;
    responderUri: string;
    editUri: string;
    title: string;
  }> {
    let token = await driveService.authenticate(true);
    if (!token) {
      throw new Error('Chưa đăng nhập Google Workspace. Vui lòng xác thực tài khoản Google.');
    }

    const eventName = options?.eventTitle || 'Beyond The Internet 2026';
    const formTitle = `${eventName} - Khảo Sát Đánh Giá Khán Giả`;

    // 1. Create initial empty form via backend proxy (avoids browser CORS)
    let createRes = await fetch('/api/google/forms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        info: {
          title: formTitle
        }
      })
    });

    // If token expired or missing scope (401 / 403), force fresh authentication and retry once
    if (createRes.status === 401 || createRes.status === 403) {
      console.warn('[googleFormsService] Got status ' + createRes.status + '. Refreshing token with required scopes...');
      driveService.setAccessToken(null);
      token = await driveService.authenticate(true, true);
      if (token) {
        createRes = await fetch('/api/google/forms', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            info: {
              title: formTitle
            }
          })
        });
      }
    }

    if (!createRes.ok) {
      const errText = await createRes.text();
      let msg = errText;
      try {
        const parsed = JSON.parse(errText);
        msg = parsed.error?.message || parsed.error || errText;
      } catch (_) {}
      throw new Error(`Không thể tạo Google Form: ${msg}`);
    }

    const createdForm = await createRes.json();
    const formId = createdForm.formId;
    const responderUri = createdForm.responderUri || `https://docs.google.com/forms/d/e/${formId}/viewform`;
    const editUri = `https://docs.google.com/forms/d/${formId}/edit`;

    // 2. Batch update to insert questions and description
    const description = `Cảm ơn bạn đã tham gia chương trình ${eventName}!\n` +
      `Khảo sát gồm 4 câu hỏi nhanh giúp Ban Tổ Chức đánh giá chất lượng chương trình và phục vụ bạn tốt hơn trong các sự kiện tới.\n` +
      (options?.giftNote ? `🎁 ${options.giftNote}` : '🎁 Khán giả hoàn thành nhận ngay phần quà lưu niệm tại bàn Lễ tân.');

    const batchRequestBody = {
      requests: [
        {
          updateFormInfo: {
            info: {
              description: description
            },
            updateMask: 'description'
          }
        },
        {
          createItem: {
            item: {
              title: '1. Bạn đánh giá tổng quan chương trình Beyond The Internet 2026 ở mức độ nào?',
              description: 'Thang điểm từ 1 (Chưa hài lòng) đến 5 (Tuyệt vời)',
              questionItem: {
                question: {
                  required: true,
                  scaleQuestion: {
                    low: 1,
                    high: 5,
                    lowLabel: 'Chưa hài lòng',
                    highLabel: 'Tuyệt vời'
                  }
                }
              }
            },
            location: { index: 0 }
          }
        },
        {
          createItem: {
            item: {
              title: '2. Vòng thi hoặc chuyên mục nào để lại ấn tượng sâu sắc nhất với bạn?',
              questionItem: {
                question: {
                  required: true,
                  choiceQuestion: {
                    type: 'RADIO',
                    options: [
                      { value: 'Vòng 1: Khởi Động (Đồng đội & Tốc độ 45s)' },
                      { value: 'Vòng 2: Vượt Chướng Ngại Vật & Ô Mạo Hiểm' },
                      { value: 'Vòng 3: Tăng Tốc (Tranh điểm kịch tính)' },
                      { value: 'Vòng 4: Về Đích & Ngôi Sao Hy Vọng' },
                      { value: 'Phần thi Khán giả, Bốc thăm may mắn (Lucky Draw)' }
                    ]
                  }
                }
              }
            },
            location: { index: 1 }
          }
        },
        {
          createItem: {
            item: {
              title: '3. Trải nghiệm tương tác trên điện thoại của bạn (tốc độ nhận đề, độ mượt, giao diện):',
              questionItem: {
                question: {
                  required: true,
                  choiceQuestion: {
                    type: 'RADIO',
                    options: [
                      { value: 'Rất mượt mà, phản hồi tức thì, âm thanh sống động' },
                      { value: 'Khá tốt, sử dụng thuận tiện suốt chương trình' },
                      { value: 'Đôi lúc có độ trễ nhẹ khi đông người truy cập' },
                      { value: 'Cần tối ưu thêm' }
                    ]
                  }
                }
              }
            },
            location: { index: 2 }
          }
        },
        {
          createItem: {
            item: {
              title: '4. Góp ý hoặc thông điệp bạn muốn gửi đến Ban Tổ Chức & Các Đội thi:',
              questionItem: {
                question: {
                  required: false,
                  textQuestion: {
                    paragraph: true
                  }
                }
              }
            },
            location: { index: 3 }
          }
        },
        {
          createItem: {
            item: {
              title: '5. Mã số sinh viên (MSSV) hoặc Họ tên để đối soát quà tặng:',
              questionItem: {
                question: {
                  required: false,
                  textQuestion: {
                    paragraph: false
                  }
                }
              }
            },
            location: { index: 4 }
          }
        }
      ]
    };

    try {
      const updateRes = await fetch(`/api/google/forms/${encodeURIComponent(formId)}/batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(batchRequestBody)
      });

      if (!updateRes.ok) {
        console.warn('Form batchUpdate warning:', await updateRes.text());
      }
    } catch (e) {
      console.warn('Batch update non-fatal error:', e);
    }

    return {
      formId,
      responderUri,
      editUri,
      title: formTitle
    };
  },

  /**
   * Fetch live responses and compute statistics for a Google Form
   */
  async getFormAnalytics(formId: string): Promise<GoogleFormAnalytics> {
    const token = await driveService.authenticate(false);
    if (!token) {
      throw new Error('Chưa đăng nhập Google Workspace. Vui lòng kết nối Google để xem thống kê.');
    }

    // 1. Fetch form metadata to get question schema via proxy
    const formRes = await fetch(`/api/google/forms/${encodeURIComponent(formId)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!formRes.ok) {
      const err = await formRes.text();
      throw new Error(`Không thể tải thông tin Form (${formId}): ${err}`);
    }

    const formData = await formRes.json();
    const items: any[] = formData.items || [];

    // 2. Fetch all responses via proxy
    let responses: any[] = [];
    try {
      const respRes = await fetch(`/api/google/forms/${encodeURIComponent(formId)}/responses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (respRes.ok) {
        const respData = await respRes.json();
        responses = respData.responses || [];
      } else {
        console.warn('Could not fetch form responses:', await respRes.text());
      }
    } catch (e) {
      console.warn('Error fetching responses:', e);
    }

    // 3. Compute analytics per question
    const questions: GoogleFormQuestionSummary[] = items
      .filter((it: any) => it.questionItem?.question?.questionId)
      .map((it: any) => {
        const qId = it.questionItem.question.questionId;
        const qTitle = it.title || 'Câu hỏi';
        const isScale = Boolean(it.questionItem.question.scaleQuestion);
        const isChoice = Boolean(it.questionItem.question.choiceQuestion);

        const answersForQ: string[] = [];
        let ratingSum = 0;
        let ratingCount = 0;
        const distribution: Record<string, number> = {};

        for (const resp of responses) {
          const ansObj = resp.answers?.[qId];
          if (ansObj?.textAnswers?.answers) {
            for (const ans of ansObj.textAnswers.answers) {
              const val = ans.value;
              if (val !== undefined && val !== null && val !== '') {
                answersForQ.push(val);
                distribution[val] = (distribution[val] || 0) + 1;
                if (isScale) {
                  const num = Number(val);
                  if (!isNaN(num)) {
                    ratingSum += num;
                    ratingCount++;
                  }
                }
              }
            }
          }
        }

        return {
          itemId: qId,
          title: qTitle,
          type: isScale ? 'SCALE' : isChoice ? 'CHOICE' : 'TEXT',
          totalAnswers: answersForQ.length,
          sampleAnswers: answersForQ.slice(0, 5),
          optionsDistribution: isChoice ? distribution : undefined,
          averageRating: ratingCount > 0 ? Number((ratingSum / ratingCount).toFixed(1)) : undefined
        };
      });

    // 4. Extract recent submissions
    const recentSubmissions = responses.slice(-10).reverse().map((resp: any) => {
      const parsedAnswers: Record<string, string> = {};
      items.forEach((it: any) => {
        const qId = it.questionItem?.question?.questionId;
        if (qId && resp.answers?.[qId]?.textAnswers?.answers?.[0]?.value) {
          parsedAnswers[it.title || qId] = resp.answers[qId].textAnswers.answers[0].value;
        }
      });
      return {
        responseId: resp.responseId,
        submittedAt: resp.lastSubmittedTime || resp.createTime || new Date().toISOString(),
        answers: parsedAnswers
      };
    });

    const lastResp = responses[responses.length - 1];
    const lastResponseTime = lastResp ? (lastResp.lastSubmittedTime || lastResp.createTime) : undefined;

    return {
      formId,
      title: formData.info?.title || 'Biểu mẫu khảo sát',
      responderUri: formData.responderUri || `https://docs.google.com/forms/d/e/${formId}/viewform`,
      totalResponses: responses.length,
      lastResponseTime,
      questions,
      recentSubmissions
    };
  },

  /**
   * Fetch full structure and questions of a Google Form for in-app editing
   */
  async fetchFormStructure(formId: string): Promise<EditableFormStructure> {
    const token = await driveService.authenticate(false);
    if (!token) {
      throw new Error('Chưa đăng nhập Google Workspace. Vui lòng kết nối Google trước.');
    }

    const res = await fetch(`/api/google/forms/${encodeURIComponent(formId)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Không thể tải cấu trúc biểu mẫu: ${err}`);
    }

    const data = await res.json();
    const rawItems: any[] = data.items || [];

    const mappedItems: EditableFormQuestionItem[] = rawItems
      .filter((it: any) => it.questionItem?.question)
      .map((it: any, index: number) => {
        const q = it.questionItem.question;
        let questionType: EditableFormQuestionItem['questionType'] = 'TEXT';
        let options: string[] = [];
        let scaleLow: number | undefined;
        let scaleHigh: number | undefined;
        let scaleLowLabel: string | undefined;
        let scaleHighLabel: string | undefined;

        if (q.choiceQuestion) {
          questionType = q.choiceQuestion.type === 'CHECKBOX' ? 'CHECKBOX' : 'RADIO';
          options = (q.choiceQuestion.options || []).map((opt: any) => opt.value || '');
        } else if (q.scaleQuestion) {
          questionType = 'SCALE';
          scaleLow = q.scaleQuestion.low ?? 1;
          scaleHigh = q.scaleQuestion.high ?? 5;
          scaleLowLabel = q.scaleQuestion.lowLabel || '';
          scaleHighLabel = q.scaleQuestion.highLabel || '';
        } else if (q.textQuestion) {
          questionType = q.textQuestion.paragraph ? 'PARAGRAPH' : 'TEXT';
        }

        return {
          id: it.itemId || `q_${index}`,
          itemId: it.itemId,
          title: it.title || '',
          description: it.description || '',
          questionType,
          required: Boolean(q.required),
          options,
          scaleLow,
          scaleHigh,
          scaleLowLabel,
          scaleHighLabel
        };
      });

    return {
      formId: data.formId || formId,
      title: data.info?.title || '',
      description: data.info?.description || '',
      responderUri: data.responderUri || `https://docs.google.com/forms/d/e/${formId}/viewform`,
      editUri: `https://docs.google.com/forms/d/${formId}/edit`,
      items: mappedItems
    };
  },

  /**
   * Save changes back to Google Form via batchUpdate
   */
  async saveFormStructure(
    formId: string,
    updates: {
      description?: string;
      items: EditableFormQuestionItem[];
    }
  ): Promise<void> {
    const token = await driveService.authenticate(true);
    if (!token) {
      throw new Error('Chưa đăng nhập Google Workspace. Vui lòng kết nối Google trước.');
    }

    const requests: any[] = [];

    // 1. Update form description if provided
    if (updates.description !== undefined) {
      requests.push({
        updateFormInfo: {
          info: {
            description: updates.description
          },
          updateMask: 'description'
        }
      });
    }

    // 2. Process item updates
    updates.items.forEach((item, index) => {
      const itemPayload: any = {
        title: item.title,
        description: item.description || ''
      };

      if (item.questionType === 'RADIO' || item.questionType === 'CHECKBOX') {
        itemPayload.questionItem = {
          question: {
            required: Boolean(item.required),
            choiceQuestion: {
              type: item.questionType,
              options: (item.options.length > 0 ? item.options : ['Lựa chọn 1']).map(opt => ({ value: opt }))
            }
          }
        };
      } else if (item.questionType === 'SCALE') {
        itemPayload.questionItem = {
          question: {
            required: Boolean(item.required),
            scaleQuestion: {
              low: item.scaleLow ?? 1,
              high: item.scaleHigh ?? 5,
              lowLabel: item.scaleLowLabel || '',
              highLabel: item.scaleHighLabel || ''
            }
          }
        };
      } else {
        itemPayload.questionItem = {
          question: {
            required: Boolean(item.required),
            textQuestion: {
              paragraph: item.questionType === 'PARAGRAPH'
            }
          }
        };
      }

      if (item.itemId) {
        // Update existing item
        itemPayload.itemId = item.itemId;
        requests.push({
          updateItem: {
            item: itemPayload,
            location: { index },
            updateMask: 'title,description,questionItem'
          }
        });
      } else {
        // Create new item
        requests.push({
          createItem: {
            item: itemPayload,
            location: { index }
          }
        });
      }
    });

    if (requests.length === 0) return;

    const res = await fetch(`/api/google/forms/${encodeURIComponent(formId)}/batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });

    if (!res.ok) {
      const errText = await res.text();
      let msg = errText;
      try {
        const parsed = JSON.parse(errText);
        msg = parsed.error?.message || parsed.error || errText;
      } catch (_) {}
      throw new Error(`Lỗi cập nhật Google Form: ${msg}`);
    }
  }
};
