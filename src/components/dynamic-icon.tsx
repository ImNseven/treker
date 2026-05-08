import * as Icons from "lucide-react";
import type { LucideProps } from "lucide-react";

export function DynamicIcon({ name, ...props }: { name: string } & LucideProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Icon = ((Icons as any)[name] ?? Icons.Circle) as React.ComponentType<LucideProps>;
  return <Icon {...props} />;
}
