export const shouldShowPopup = (key: string) => {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(`hidePopup:${key}`);
  return stored !== new Date().toDateString();
};

export const hidePopupForToday = (key: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(`hidePopup:${key}`, new Date().toDateString());
  }
};
