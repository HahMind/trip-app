import { dynaura } from "dynaura";
import { DEFAULT_MEMBERS } from "../data/constants";

export const getTodayISO = () => new Date().toLocaleDateString("en-CA");

export const formatForDB = (isoDate) => {
  if (!isoDate || !isoDate.includes("-")) return isoDate;
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
};

export const parseForUI = (thDate) => {
  if (!thDate || !thDate.includes("/")) return getTodayISO();
  const [d, m, y] = thDate.split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
};

export const getStoredMembers = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("tripMembers") || "null");
    if (Array.isArray(saved) && saved.length > 0) return saved;
  } catch {
    // Ignore malformed local data and use the defaults.
  }
  return DEFAULT_MEMBERS;
};

export const getStoredMemberDetails = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("memberDetails") || "null");
    if (saved) return saved;
  } catch {
    // Ignore malformed local data and use an empty details object.
  }
  return {};
};

export const formatMoney = (value) =>
  Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const normalizePromptPay = (value) => {
  let normalized = String(value || "").trim().replace(/[\s-]/g, "");
  if (normalized.startsWith("+66")) {
    normalized = `0${normalized.slice(3)}`;
  } else if (normalized.startsWith("66") && normalized.length === 11) {
    normalized = `0${normalized.slice(2)}`;
  }

  return normalized;
};

export const validatePromptPay = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return { valid: true, normalized: "" };

  if (/[^0-9+\-\s]/.test(raw)) {
    return {
      valid: false,
      normalized: "",
      message: "กรุณากรอกเฉพาะตัวเลขเท่านั้น",
    };
  }

  const compact = raw.replace(/[\s-]/g, "");
  if (
    compact.includes("+") &&
    (!compact.startsWith("+66") || compact.slice(1).includes("+"))
  ) {
    return {
      valid: false,
      normalized: "",
      message: "กรุณากรอกเฉพาะตัวเลขเท่านั้น",
    };
  }

  const normalized = normalizePromptPay(value);
  const valid =
    (normalized.length === 10 && /^0\d{9}$/.test(normalized)) ||
    (normalized.length === 13 && /^\d{13}$/.test(normalized));

  return {
    valid,
    normalized,
    message: "กรุณากรอกพร้อมเพย์เป็นเบอร์มือถือ 10 หลักหรือเลขบัตรประชาชน 13 หลัก",
  };
};

export const openBankApp = async (textToCopy, scheme, title) => {
  let copied = false;
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(textToCopy);
      copied = true;
    } catch {
      copied = false;
    }
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = textToCopy;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    copied = document.execCommand("copy");
    textarea.remove();
  }

  if (!copied) {
    dynaura.error({
      title: "คัดลอกไม่สำเร็จ",
      description: "กรุณาลองคัดลอกเลขบัญชีอีกครั้ง",
      duration: 4000,
    });
    return;
  }

  dynaura.success({
    title,
    description: scheme
      ? "ก๊อปเลขบัญชีแล้ว กำลังเปิดแอปธนาคาร"
      : "คัดลอกเลขบัญชีเรียบร้อยแล้ว",
    duration: 3000,
  });

  if (scheme) window.location.href = scheme;
};

// ดึงข้อมูลคิวที่ค้างซิงค์ (Get pending sync queue)
export const getOfflineQueue = () => {
  try {
    return JSON.parse(localStorage.getItem("trip_offline_queue") || "[]");
  } catch {
    return [];
  }
};

// บันทึกคิวลงเครื่อง (Save queue to local storage)
export const saveOfflineQueue = (queue) => {
  localStorage.setItem("trip_offline_queue", JSON.stringify(queue));
};

// ดึงข้อมูลรายจ่ายล่าสุดที่เคยโหลดไว้ (Get cached expenses)
export const getCachedExpenses = () => {
  try {
    return JSON.parse(localStorage.getItem("trip_cached_expenses") || "[]");
  } catch {
    return [];
  }
};

// บันทึกข้อมูลรายจ่ายลงเครื่องเพื่อแสดงผลทันที (Save expenses to local storage for instant load)
export const saveCachedExpenses = (expenses) => {
  localStorage.setItem("trip_cached_expenses", JSON.stringify(expenses));
};
