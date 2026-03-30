import { Suspense } from "react";
import { BrowsePage } from "@/components/public/browse-page";

export default function Page() {
  return (
    <Suspense>
      <BrowsePage />
    </Suspense>
  );
}
