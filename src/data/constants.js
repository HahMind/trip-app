export const CATEGORIES = [
  "ค่าอาหาร",
  "ค่ารถ",
  "ค่าน้ำมัน",
  "ค่าที่พัก",
  "ค่าเที่ยว",
  "อื่นๆ",
];

export const HISTORY_CATEGORY = "ประวัติการโอน";
export const DEFAULT_MEMBERS = ["หมิว", "มาย", "เมย์", "พี่เบส"];

export const BANKS = [
  { id: "kbank", name: "กสิกรไทย (KBank)", scheme: "kplus://" },
  { id: "scb", name: "ไทยพาณิชย์ (SCB)", scheme: "scbeasy://" },
  { id: "ktb", name: "กรุงไทย (KTB)", scheme: "ktbnext://" },
  { id: "gsb", name: "ออมสิน (GSB)", scheme: "mymobaz://" },
  { id: "other", name: "อื่นๆ (ไม่เปิดแอป)", scheme: "" },
];

export const SWAL_THEME = {
  background: "#111827",
  color: "#F3F4F6",
  buttonsStyling: false,
  customClass: {
    popup: "border border-gray-700 rounded-xl shadow-2xl p-6",
    title: "text-gray-100 font-bold text-lg",
    htmlContainer: "text-gray-300 text-sm mt-1",
    confirmButton:
      "bg-lime-400 text-gray-950 font-bold px-5 py-2.5 rounded-lg hover:bg-lime-300 transition text-sm cursor-pointer",
    cancelButton:
      "bg-gray-800 text-gray-300 font-bold px-5 py-2.5 rounded-lg hover:bg-gray-700 transition text-sm cursor-pointer ml-3",
  },
};
