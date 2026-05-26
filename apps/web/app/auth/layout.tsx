import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ember — Auth",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      {/* Ember wordmark */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl"
          style={{ backgroundColor: "var(--color-primary)" }}
          aria-hidden="true"
        >
          <span
            className="material-symbols-outlined text-white text-xl select-none"
            style={{ fontSize: "20px" }}
          >
            local_fire_department
          </span>
        </div>
        <span
          className="text-2xl font-semibold tracking-tight select-none"
          style={{ color: "var(--color-on-surface)" }}
        >
          Ember
        </span>
      </div>

      {/* Auth card */}
      <div
        className="w-full max-w-sm rounded-2xl p-8 shadow-sm"
        style={{
          backgroundColor: "var(--color-surface-container-lowest)",
          border: "1px solid var(--color-outline-variant)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
