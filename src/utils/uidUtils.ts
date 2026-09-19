/**
 * Utility to generate and format 12-character identification code (Mã định danh 12 số)
 * 
 * Rules:
 * 1. 4 số đầu: 4 số cuối của mã sinh viên (MSSV)
 * 2. 2 ký tự sau: 2 ký tự tên viết tắt họ và tên (In hoa, không dấu, A-Z)
 * 3. Số thứ 7: Giới tính (1 = Nam, 2 = Nữ, 0 = Khác)
 * 4. Số thứ 8 và 9: 2 số cuối năm sinh (VD: 2004 -> 04)
 * 5. 3 chữ số còn lại (10, 11, 12): 3 chữ số ngẫu nhiên (000-999), đảm bảo không trùng lặp
 */

export function generate12DigitUID(
  name: string,
  mssv: string,
  gender: string,
  birthYear: string,
  existingUids?: Set<string> | string[]
): string {
  // 1. 4 số đầu: 4 số cuối mã sinh viên (MSSV)
  const cleanMssv = (mssv || '').replace(/\D/g, '');
  let last4 = '0000';
  if (cleanMssv.length >= 4) {
    last4 = cleanMssv.slice(-4);
  } else if (cleanMssv.length > 0) {
    last4 = cleanMssv.padStart(4, '0');
  }

  // 2. 2 ký tự sau: 2 ký tự tên viết tắt họ và tên (In hoa, không dấu)
  const removeAccents = (str: string) => {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/Đ/g, 'D')
      .replace(/đ/g, 'd')
      .replace(/[^A-Za-z]/g, ' ')
      .trim()
      .toUpperCase();
  };

  const cleanName = removeAccents(name);
  const words = cleanName.split(/\s+/).filter(Boolean);
  let initials = 'XX';
  if (words.length >= 2) {
    const firstLetter = words[0][0] || 'X';
    const lastLetter = words[words.length - 1][0] || 'X';
    initials = `${firstLetter}${lastLetter}`;
  } else if (words.length === 1) {
    const w = words[0];
    if (w.length >= 2) {
      initials = w.slice(0, 2);
    } else if (w.length === 1) {
      initials = `${w[0]}X`;
    }
  }

  // 3. Số thứ 7: Giới tính (1 = Nam, 2 = Nữ, 0 = Khác)
  let genderDigit = '1';
  const gLower = (gender || '').toString().toLowerCase().trim();
  if (gLower === '1' || gLower === 'nam') {
    genderDigit = '1';
  } else if (gLower === '2' || gLower === 'nữ' || gLower === 'nu') {
    genderDigit = '2';
  } else if (gLower === '0' || gLower === '9' || gLower === 'khác' || gLower === 'khac') {
    genderDigit = '0';
  } else {
    genderDigit = '1';
  }

  // 4. Số thứ 8 và 9: 2 số cuối năm sinh
  const cleanYear = (birthYear || '').replace(/\D/g, '');
  let year2 = '04';
  if (cleanYear.length >= 2) {
    year2 = cleanYear.slice(-2);
  } else if (cleanYear.length === 1) {
    year2 = cleanYear.padStart(2, '0');
  }

  // Tiền tố 9 ký tự: 4 (MSSV) + 2 (Tên) + 1 (Giới tính) + 2 (Năm sinh)
  const prefix = `${last4}${initials}${genderDigit}${year2}`;

  // 5. 3 chữ số còn lại (10, 11, 12): số ngẫu nhiên (000 - 999)
  const uidSet = existingUids
    ? existingUids instanceof Set
      ? existingUids
      : new Set(existingUids)
    : new Set<string>();

  let fullUid = '';
  let attempts = 0;
  do {
    const random3 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    fullUid = `${prefix}${random3}`;
    attempts++;
  } while (uidSet.has(fullUid) && attempts < 1000);

  return fullUid;
}

// Alias for backward compatibility
export const generateAnonymizedUID = generate12DigitUID;

/**
 * Gets the display UID for a user (ensuring a 12-char formatted UID is always returned)
 */
export function getUserDisplayUid(user?: { uid?: string; anonymizedUid?: string; name?: string; mssv?: string; gender?: string; birthYear?: string } | null): string {
  if (!user) return '---';

  // 1. If explicit anonymizedUid exists and is 12 chars, return it
  if (user.anonymizedUid && user.anonymizedUid.length === 12) {
    return user.anonymizedUid;
  }

  // 2. If uid itself is a 12-char string, return it
  if (user.uid && user.uid.length === 12) {
    return user.uid;
  }

  // 3. Fallback: Generate a deterministic 12-char UID using name, mssv, etc.
  if (user.name || user.mssv) {
    const cleanMssv = (user.mssv || '').replace(/\D/g, '');
    let last4 = '0000';
    if (cleanMssv.length >= 4) {
      last4 = cleanMssv.slice(-4);
    } else if (cleanMssv.length > 0) {
      last4 = cleanMssv.padStart(4, '0');
    }

    const removeAccents = (str: string) => {
      return (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/Đ/g, 'D')
        .replace(/đ/g, 'd')
        .replace(/[^A-Za-z]/g, ' ')
        .trim()
        .toUpperCase();
    };

    const cleanName = removeAccents(user.name || '');
    const words = cleanName.split(/\s+/).filter(Boolean);
    let initials = 'XX';
    if (words.length >= 2) {
      const firstLetter = words[0][0] || 'X';
      const lastLetter = words[words.length - 1][0] || 'X';
      initials = `${firstLetter}${lastLetter}`;
    } else if (words.length === 1) {
      const w = words[0];
      if (w.length >= 2) {
        initials = w.slice(0, 2);
      } else if (w.length === 1) {
        initials = `${w[0]}X`;
      }
    }

    let genderDigit = '1';
    const gLower = (user.gender || '').toString().toLowerCase().trim();
    if (gLower === '1' || gLower === 'nam') genderDigit = '1';
    else if (gLower === '2' || gLower === 'nữ' || gLower === 'nu') genderDigit = '2';
    else if (gLower === '0' || gLower === '9' || gLower === 'khác' || gLower === 'khac') genderDigit = '0';

    const cleanYear = (user.birthYear || '').replace(/\D/g, '');
    let year2 = '04';
    if (cleanYear.length >= 2) year2 = cleanYear.slice(-2);
    else if (cleanYear.length === 1) year2 = cleanYear.padStart(2, '0');

    const prefix = `${last4}${initials}${genderDigit}${year2}`;

    // Deterministic 3 digits based on user.uid or mssv + name
    const seed = user.uid || `${user.mssv}_${user.name}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const last3 = (Math.abs(hash) % 1000).toString().padStart(3, '0');

    return `${prefix}${last3}`;
  }

  return user.anonymizedUid || user.uid || '---';
}
