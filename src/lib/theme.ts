export type ThemeMode = "dark" | "light" | "auto";

const STORAGE_KEY = "buspay-theme";

export function getTheme(): ThemeMode {
  return (localStorage.getItem(STORAGE_KEY) as ThemeMode) || "dark";
}

export function setTheme(mode: ThemeMode) {
  localStorage.setItem(STORAGE_KEY, mode);
  applyTheme(mode);
}

export function applyTheme(mode?: ThemeMode) {
  const current = mode || getTheme();

  let finalTheme: "dark" | "light" = "dark";

  if (current === "auto") {
    const hour = new Date().getHours();

    // 6AM to 5:59PM = LIGHT
    finalTheme = hour >= 6 && hour < 18
      ? "light"
      : "dark";
  } else {
    finalTheme = current;
  }

  document.documentElement.setAttribute(
    "data-theme",
    finalTheme
  );

  if (finalTheme === "light") {
    document.body.style.background = "#f8fafc";
    document.body.style.color = "#0f172a";
  } else {
    document.body.style.background = "#0f0f1a";
    document.body.style.color = "#ffffff";
  }
}