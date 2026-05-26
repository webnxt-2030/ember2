import { Container } from "@/components/layout/container";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background py-16">
      <Container>
        <div className="max-w-3xl">{children}</div>
      </Container>
    </div>
  );
}
