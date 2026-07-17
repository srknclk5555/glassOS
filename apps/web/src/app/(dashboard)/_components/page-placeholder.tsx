import { EmptyState } from "@repo/ui";
import { Inbox, type LucideIcon } from "lucide-react";

interface PagePlaceholderProps {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export function PagePlaceholder({ title, description, icon: Icon }: PagePlaceholderProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <EmptyState
        icon={Icon ? <Icon className="h-8 w-8" /> : <Inbox className="h-8 w-8" />}
        title={title}
        description={description}
      />
    </div>
  );
}
