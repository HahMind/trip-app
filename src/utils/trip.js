import Swal from "sweetalert2";
import { DEFAULT_MEMBERS, SWAL_THEME } from "../data/constants";

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

export const openBankApp = async (textToCopy, scheme, title) => {
  try {
    await navigator.clipboard.writeText(textToCopy);
    Swal.fire({
      ...SWAL_THEME,
      icon: "success",
      title,
      text: scheme ? "คัดลอกแล้ว กำลังเปิดแอปธนาคาร..." : "คัดลอกเรียบร้อยแล้ว",
      timer: 1500,
      showConfirmButton: false,
    });
    if (scheme) {
      setTimeout(() => {
        window.location.href = scheme;
      }, 500);
    }
  } catch {
    Swal.fire({ ...SWAL_THEME, icon: "error", title: "คัดลอกไม่สำเร็จ" });
  }
};
